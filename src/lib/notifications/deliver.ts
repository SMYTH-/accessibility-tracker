import { createTransport, createTestAccount, getTestMessageUrl } from "nodemailer";
import type { Transporter } from "nodemailer";
import { promises as fs } from "fs";
import path from "path";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { getAuthMode } from "@/lib/auth/config";
import { withChallengeDb } from "@/lib/challenge/store";
import type { NotificationRecord } from "@/lib/membership/types";

export type DeliveryProvider = "resend" | "ethereal" | "none";

export type DeliveryResult = {
  ok: boolean;
  provider: DeliveryProvider;
  notificationId: string;
  to: string;
  subject: string;
  messageId?: string;
  /** Ethereal web inbox preview URL when available. */
  previewUrl?: string;
  error?: string;
};

type EtherealCreds = {
  user: string;
  pass: string;
  smtp: { host: string; port: number; secure: boolean };
};

const ETHEREAL_CACHE = path.join(process.cwd(), ".data", "ethereal-account.json");

function emailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Pactwell <onboarding@resend.dev>"
  );
}

export function resolveEmailProvider(): DeliveryProvider {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (
    process.env.EMAIL_PROVIDER?.trim() === "ethereal" ||
    process.env.EMAIL_PROVIDER?.trim() === "auto" ||
    !process.env.EMAIL_PROVIDER
  ) {
    // Default test path when Resend is not configured.
    return "ethereal";
  }
  return "none";
}

async function loadOrCreateEthereal(): Promise<EtherealCreds> {
  try {
    const raw = await fs.readFile(ETHEREAL_CACHE, "utf8");
    return JSON.parse(raw) as EtherealCreds;
  } catch {
    const account = await createTestAccount();
    const creds: EtherealCreds = {
      user: account.user,
      pass: account.pass,
      smtp: {
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
      },
    };
    await fs.mkdir(path.dirname(ETHEREAL_CACHE), { recursive: true });
    await fs.writeFile(ETHEREAL_CACHE, JSON.stringify(creds, null, 2));
    return creds;
  }
}

async function etherealTransport(): Promise<Transporter> {
  const creds = await loadOrCreateEthereal();
  return createTransport({
    host: creds.smtp.host,
    port: creds.smtp.port,
    secure: creds.smtp.secure,
    auth: { user: creds.user, pass: creds.pass },
  });
}

async function sendViaResend(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY missing");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: [input.to],
      subject: input.subject,
      text: input.body,
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string };
  if (!res.ok) {
    throw new Error(json.message || `Resend HTTP ${res.status}`);
  }
  if (!json.id) throw new Error("Resend response missing id");
  return { messageId: json.id };
}

async function sendViaEthereal(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string; previewUrl?: string }> {
  const transport = await etherealTransport();
  const info = await transport.sendMail({
    from: emailFrom(),
    to: input.to,
    subject: input.subject,
    text: input.body,
  });
  const preview = getTestMessageUrl(info);
  return {
    messageId: String(info.messageId || ""),
    previewUrl: typeof preview === "string" ? preview : undefined,
  };
}

async function markOutboxStatus(
  notificationId: string,
  status: "sent" | "failed",
  error: string | null,
): Promise<void> {
  if (getAuthMode() === "mock") {
    await withChallengeDb((db) => {
      const row = db.notifications.find((n) => n.id === notificationId);
      if (!row) return;
      row.status = status;
      row.sentAt = status === "sent" ? new Date().toISOString() : row.sentAt;
      row.error = error;
    });
    return;
  }

  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("notification_outbox")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      error,
    })
    .eq("id", notificationId);
  if (updErr) throw new Error(updErr.message);
}

export async function deliverNotificationRecord(
  record: Pick<
    NotificationRecord,
    "id" | "recipientEmail" | "subject" | "body" | "status"
  >,
): Promise<DeliveryResult> {
  const provider = resolveEmailProvider();
  if (provider === "none") {
    return {
      ok: false,
      provider,
      notificationId: record.id,
      to: record.recipientEmail,
      subject: record.subject,
      error: "No email provider configured (set RESEND_API_KEY or EMAIL_PROVIDER=ethereal).",
    };
  }

  if (record.status === "sent") {
    return {
      ok: true,
      provider,
      notificationId: record.id,
      to: record.recipientEmail,
      subject: record.subject,
    };
  }

  try {
    const sent: { messageId: string; previewUrl?: string } =
      provider === "resend"
        ? await sendViaResend({
            to: record.recipientEmail,
            subject: record.subject,
            body: record.body,
          })
        : await sendViaEthereal({
            to: record.recipientEmail,
            subject: record.subject,
            body: record.body,
          });
    await markOutboxStatus(record.id, "sent", null);
    return {
      ok: true,
      provider,
      notificationId: record.id,
      to: record.recipientEmail,
      subject: record.subject,
      messageId: sent.messageId,
      previewUrl: sent.previewUrl,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delivery failed";
    try {
      await markOutboxStatus(record.id, "failed", message);
    } catch {
      /* keep original error */
    }
    return {
      ok: false,
      provider,
      notificationId: record.id,
      to: record.recipientEmail,
      subject: record.subject,
      error: message,
    };
  }
}

/** Fetch one outbox row (service role) and deliver. */
export async function deliverOutboxById(notificationId: string): Promise<DeliveryResult> {
  if (getAuthMode() === "mock") {
    const record = await withChallengeDb((db) =>
      db.notifications.find((n) => n.id === notificationId),
    );
    if (!record) {
      return {
        ok: false,
        provider: resolveEmailProvider(),
        notificationId,
        to: "",
        subject: "",
        error: "Notification not found",
      };
    }
    return deliverNotificationRecord(record);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notification_outbox")
    .select("*")
    .eq("id", notificationId)
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      provider: resolveEmailProvider(),
      notificationId,
      to: "",
      subject: "",
      error: error?.message || "Notification not found",
    };
  }
  return deliverNotificationRecord({
    id: String(data.id),
    recipientEmail: String(data.recipient_email),
    subject: String(data.subject),
    body: String(data.body),
    status: data.status as NotificationRecord["status"],
  });
}

export async function getEtherealInboxAddress(): Promise<string | null> {
  if (resolveEmailProvider() !== "ethereal") return null;
  const creds = await loadOrCreateEthereal();
  return creds.user;
}
