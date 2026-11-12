/**
 * M3 NOTIF-01 live delivery evidence.
 * Flushes approve + reject outbox rows through Resend (if RESEND_API_KEY) or Ethereal.
 * Never prints secret values. Writes preview/message ids under .data/ (gitignored).
 */
import { createClient } from "@supabase/supabase-js";
import { createTransport, createTestAccount, getTestMessageUrl } from "nodemailer";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REF = "gdrkejobqlvtwnlaedpu";

if (!url?.includes(REF) || !anon || !service) {
  console.error("MISSING_ENV_OR_WRONG_PROJECT");
  process.exit(1);
}

const results = [];
function assert(name, cond, detail = "") {
  results.push({ name, ok: Boolean(cond), detail: String(detail ?? "") });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function userClient() {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const dataDir = join(process.cwd(), ".data");
mkdirSync(dataDir, { recursive: true });
const etherealPath = join(dataDir, "ethereal-account.json");

function resolveProvider() {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return "ethereal";
}

async function ensureEthereal() {
  if (existsSync(etherealPath)) {
    return JSON.parse(readFileSync(etherealPath, "utf8"));
  }
  const account = await createTestAccount();
  const creds = {
    user: account.user,
    pass: account.pass,
    smtp: {
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
    },
  };
  writeFileSync(etherealPath, JSON.stringify(creds, null, 2));
  return creds;
}

async function sendEmail({ to, subject, body }) {
  const provider = resolveProvider();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    "Accountability Tracker <onboarding@resend.dev>";

  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `Resend HTTP ${res.status}`);
    return { provider, messageId: json.id, previewUrl: null };
  }

  const creds = await ensureEthereal();
  const transport = createTransport({
    host: creds.smtp.host,
    port: creds.smtp.port,
    secure: creds.smtp.secure,
    auth: { user: creds.user, pass: creds.pass },
  });
  const info = await transport.sendMail({ from, to, subject, text: body });
  return {
    provider: "ethereal",
    messageId: info.messageId,
    previewUrl: getTestMessageUrl(info) || null,
  };
}

async function ensureUser(email, password, displayName) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    return existing.id;
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

const provider = resolveProvider();
assert("provider selected", provider === "resend" || provider === "ethereal", provider);

const stamp = Date.now();
const password = `M3-Mail-${stamp}!`;
const ownerEmail = `m3.mail.owner.${stamp}@example.com`;

let inviteeEmail;
if (provider === "resend") {
  inviteeEmail = process.env.M3_TEST_INBOX?.trim();
  if (!inviteeEmail) {
    console.error("RESEND_API_KEY set but M3_TEST_INBOX missing");
    process.exit(1);
  }
} else {
  const eth = await ensureEthereal();
  inviteeEmail = eth.user;
}

assert("test inbox address ready", Boolean(inviteeEmail), inviteeEmail.replace(/(.{2}).+(@.+)/, "$1…$2"));

const ownerId = await ensureUser(ownerEmail, password, "Mail Owner");
const inviteeId = await ensureUser(inviteeEmail, password, "Mail Invitee");
assert("users ready", Boolean(ownerId && inviteeId));

const owner = userClient();
const invitee = userClient();
assert(
  "owner sign-in",
  !(await owner.auth.signInWithPassword({ email: ownerEmail, password })).error,
);
assert(
  "invitee sign-in",
  !(await invitee.auth.signInWithPassword({ email: inviteeEmail, password })).error,
);

const start = new Date();
start.setUTCDate(start.getUTCDate() + 40);
const end = new Date(start);
end.setUTCDate(end.getUTCDate() + 60);
const created = await owner.rpc("create_private_challenge", {
  p_name: `M3 Mail ${stamp}`,
  p_description: "NOTIF delivery evidence",
  p_start_date: start.toISOString().slice(0, 10),
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("create challenge", !created.error, created.error?.message);
const challengeId = created.data.challenge.id;

const invite = await owner.rpc("create_challenge_invitation", {
  p_challenge_id: challengeId,
  p_expires_in_days: 7,
});
assert("create invite", !invite.error, invite.error?.message);
const token = invite.data.token;

const req = await invitee.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert("request pending", !req.error, req.error?.message);
const membershipId = req.data.membership.id;

const decline = await owner.rpc("decide_membership_request", {
  p_membership_id: membershipId,
  p_decision: "decline",
});
assert("decline decision", !decline.error && Boolean(decline.data?.notification_id), decline.error?.message);

const declineRow = await admin
  .from("notification_outbox")
  .select("*")
  .eq("id", decline.data.notification_id)
  .maybeSingle();
assert(
  "decline outbox recorded",
  declineRow.data?.kind === "membership_rejected" &&
    declineRow.data?.recipient_email?.toLowerCase() === inviteeEmail.toLowerCase(),
);

let declineDelivery;
try {
  declineDelivery = await sendEmail({
    to: declineRow.data.recipient_email,
    subject: declineRow.data.subject,
    body: declineRow.data.body,
  });
  await admin
    .from("notification_outbox")
    .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
    .eq("id", declineRow.data.id);
  assert(
    "reject email delivered",
    Boolean(declineDelivery.messageId),
    `${declineDelivery.provider}${declineDelivery.previewUrl ? " + preview" : ""}`,
  );
} catch (e) {
  assert("reject email delivered", false, e instanceof Error ? e.message : String(e));
}

const reReq = await invitee.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert("re-request", !reReq.error, reReq.error?.message);

const approve = await owner.rpc("decide_membership_request", {
  p_membership_id: reReq.data.membership.id,
  p_decision: "approve",
});
assert("approve decision", !approve.error && Boolean(approve.data?.notification_id), approve.error?.message);

const approveRow = await admin
  .from("notification_outbox")
  .select("*")
  .eq("id", approve.data.notification_id)
  .maybeSingle();
assert("approve outbox recorded", approveRow.data?.kind === "membership_approved");

let approveDelivery;
try {
  approveDelivery = await sendEmail({
    to: approveRow.data.recipient_email,
    subject: approveRow.data.subject,
    body: approveRow.data.body,
  });
  await admin
    .from("notification_outbox")
    .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
    .eq("id", approveRow.data.id);
  assert(
    "approve email delivered",
    Boolean(approveDelivery.messageId),
    `${approveDelivery.provider}${approveDelivery.previewUrl ? " + preview" : ""}`,
  );
} catch (e) {
  assert("approve email delivered", false, e instanceof Error ? e.message : String(e));
}

const declineStatus = await admin
  .from("notification_outbox")
  .select("status")
  .eq("id", decline.data.notification_id)
  .maybeSingle();
const approveStatus = await admin
  .from("notification_outbox")
  .select("status")
  .eq("id", approve.data.notification_id)
  .maybeSingle();
assert("decline outbox status=sent", declineStatus.data?.status === "sent");
assert("approve outbox status=sent", approveStatus.data?.status === "sent");

const evidence = {
  stamp,
  provider,
  challengeId,
  testInboxMasked: inviteeEmail.replace(/(.{2}).+(@.+)/, "$1…$2"),
  reject: {
    notificationId: decline.data?.notification_id,
    messageId: declineDelivery?.messageId || null,
    previewUrl: declineDelivery?.previewUrl || null,
    subject: declineRow.data?.subject || null,
  },
  approve: {
    notificationId: approve.data?.notification_id,
    messageId: approveDelivery?.messageId || null,
    previewUrl: approveDelivery?.previewUrl || null,
    subject: approveRow.data?.subject || null,
  },
  results,
};

writeFileSync(join(dataDir, "m3-email-delivery-evidence.json"), JSON.stringify(evidence, null, 2));

if (declineDelivery?.previewUrl) {
  console.log("REJECT_PREVIEW", declineDelivery.previewUrl);
}
if (approveDelivery?.previewUrl) {
  console.log("APPROVE_PREVIEW", approveDelivery.previewUrl);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nM3 email delivery evidence: ${results.length - failed}/${results.length} pass`);
process.exit(failed === 0 ? 0 : 1);
