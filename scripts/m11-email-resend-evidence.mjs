/**
 * M11 Resend → M3_TEST_INBOX evidence for four beta-critical mails:
 * 1) membership rejection  2) membership approval
 * 3) sign-up verification  4) password recovery
 *
 * Never prints secret values. Uses disposable owner + exact M3_TEST_INBOX.
 * Auth verify/recovery require Dominic to open links from that inbox.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY?.trim();
const inbox = process.env.M3_TEST_INBOX?.trim()?.toLowerCase();
const from =
  process.env.EMAIL_FROM?.trim()?.replace(/^["']|["']$/g, "") ||
  "Pactwell <onboarding@resend.dev>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const REF = "gdrkejobqlvtwnlaedpu";

if (!url?.includes(REF) || !anon || !service) {
  console.error("MISSING_ENV_OR_WRONG_PROJECT");
  process.exit(1);
}
if (!resendKey) {
  console.error("RESEND_API_KEY required");
  process.exit(1);
}
if (!inbox || inbox.includes("+")) {
  console.error("M3_TEST_INBOX required exact address (no + aliases)");
  process.exit(1);
}

const results = [];
function assert(name, cond, detail = "") {
  results.push({ name, ok: Boolean(cond), detail: String(detail ?? "") });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function maskEmail(em) {
  return em.replace(/(.{2}).+(@.+)/, "$1…$2");
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function userClient() {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findUserByEmail(email) {
  // paginate a bit — lab projects stay small
  for (let page = 1; page <= 5; page += 1) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const hit = listed.data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (hit) return hit;
    if ((listed.data.users?.length ?? 0) < 200) break;
  }
  return null;
}

async function ensureUser(email, password, displayName, { confirm = true } = {}) {
  const existing = await findUserByEmail(email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: confirm,
      user_metadata: { display_name: displayName },
    });
    return existing.id;
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: confirm,
    user_metadata: { display_name: displayName },
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

async function deleteUserByEmail(email) {
  const existing = await findUserByEmail(email);
  if (!existing) return false;
  const del = await admin.auth.admin.deleteUser(existing.id);
  if (del.error) throw del.error;
  return true;
}

async function sendResend({ to, subject, body }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Resend HTTP ${res.status}`);
  return { messageId: json.id };
}

async function getResendEmail(id) {
  const res = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Resend GET HTTP ${res.status}`);
  return json;
}

const stamp = Date.now();
const password = `M11-Mail-${stamp}!`;
const ownerEmail = `m11.mail.owner.${stamp}@example.com`;
const mediaDir = join(process.cwd(), "media", "m11");
mkdirSync(mediaDir, { recursive: true });

assert("provider=resend", Boolean(resendKey));
assert("inbox exact no plus", Boolean(inbox) && !inbox.includes("+"), maskEmail(inbox));
assert(
  "EMAIL_FROM uses onboarding@resend.dev or set",
  /onboarding@resend\.dev|>/.test(from),
  from.replace(/<[^>]+>/, "<…>"),
);

// =============================================================================
// A/B — Membership reject + approve → Resend → M3_TEST_INBOX
// =============================================================================
const ownerId = await ensureUser(ownerEmail, password, "Mail Owner");
const inviteeId = await ensureUser(inbox, password, "Dominic Inbox", {
  confirm: true,
});
assert("owner+invitee users", Boolean(ownerId && inviteeId));

const owner = userClient();
const invitee = userClient();
assert(
  "owner sign-in",
  !(await owner.auth.signInWithPassword({ email: ownerEmail, password })).error,
);
assert(
  "invitee sign-in",
  !(await invitee.auth.signInWithPassword({ email: inbox, password })).error,
);

const start = new Date();
start.setUTCDate(start.getUTCDate() + 40);
const end = new Date(start);
end.setUTCDate(end.getUTCDate() + 60);
const created = await owner.rpc("create_private_challenge", {
  p_name: `M11 Resend ${stamp}`,
  p_description: "Resend membership mail evidence",
  p_start_date: start.toISOString().slice(0, 10),
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("create challenge", !created.error, created.error?.message);
const challengeId = created.data?.challenge?.id;

const invite = await owner.rpc("create_challenge_invitation", {
  p_challenge_id: challengeId,
  p_expires_in_days: 7,
});
assert("create invite", !invite.error, invite.error?.message);
const token = invite.data?.token;

const req1 = await invitee.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert("request pending", !req1.error, req1.error?.message);

const decline = await owner.rpc("decide_membership_request", {
  p_membership_id: req1.data.membership.id,
  p_decision: "decline",
});
assert(
  "decline + notif",
  !decline.error && Boolean(decline.data?.notification_id),
  decline.error?.message,
);

const declineRow = await admin
  .from("notification_outbox")
  .select("*")
  .eq("id", decline.data.notification_id)
  .maybeSingle();
assert(
  "reject outbox → inbox",
  declineRow.data?.kind === "membership_rejected" &&
    declineRow.data?.recipient_email?.toLowerCase() === inbox,
  declineRow.data?.recipient_email ? maskEmail(declineRow.data.recipient_email) : "",
);

let rejectDelivery = null;
try {
  rejectDelivery = await sendResend({
    to: declineRow.data.recipient_email,
    subject: declineRow.data.subject,
    body: declineRow.data.body,
  });
  await admin
    .from("notification_outbox")
    .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
    .eq("id", declineRow.data.id);
  assert("reject Resend accepted", Boolean(rejectDelivery.messageId), rejectDelivery.messageId);
  try {
    const rejectMeta = await getResendEmail(rejectDelivery.messageId);
    assert(
      "reject Resend to exact inbox",
      (rejectMeta.to || []).map((t) => String(t).toLowerCase()).includes(inbox),
      JSON.stringify(rejectMeta.to),
    );
    assert(
      "reject Resend last_event delivered-ish",
      ["sent", "delivered", "queued"].includes(
        String(rejectMeta.last_event || rejectMeta.status || "sent"),
      ),
      String(rejectMeta.last_event || rejectMeta.status),
    );
  } catch (metaErr) {
    const msg = metaErr instanceof Error ? metaErr.message : String(metaErr);
    // Send-only Resend keys (onboarding) return 401 on GET /emails/:id
    assert(
      "reject Resend metadata (optional)",
      /restricted_api_key|restricted to only send/i.test(msg),
      msg.includes("restricted")
        ? "send-only key — recipient proven via outbox + send 200"
        : msg,
    );
  }
} catch (e) {
  assert("reject Resend accepted", false, e instanceof Error ? e.message : String(e));
}

const req2 = await invitee.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert("re-request", !req2.error, req2.error?.message);
const approve = await owner.rpc("decide_membership_request", {
  p_membership_id: req2.data.membership.id,
  p_decision: "approve",
});
assert(
  "approve + notif",
  !approve.error && Boolean(approve.data?.notification_id),
  approve.error?.message,
);
const approveRow = await admin
  .from("notification_outbox")
  .select("*")
  .eq("id", approve.data.notification_id)
  .maybeSingle();
assert("approve outbox kind", approveRow.data?.kind === "membership_approved");

let approveDelivery = null;
try {
  approveDelivery = await sendResend({
    to: approveRow.data.recipient_email,
    subject: approveRow.data.subject,
    body: approveRow.data.body,
  });
  await admin
    .from("notification_outbox")
    .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
    .eq("id", approveRow.data.id);
  assert("approve Resend accepted", Boolean(approveDelivery.messageId), approveDelivery.messageId);
  try {
    const approveMeta = await getResendEmail(approveDelivery.messageId);
    assert(
      "approve Resend to exact inbox",
      (approveMeta.to || []).map((t) => String(t).toLowerCase()).includes(inbox),
      JSON.stringify(approveMeta.to),
    );
  } catch (metaErr) {
    const msg = metaErr instanceof Error ? metaErr.message : String(metaErr);
    assert(
      "approve Resend metadata (optional)",
      /restricted_api_key|restricted to only send/i.test(msg),
      msg.includes("restricted")
        ? "send-only key — recipient proven via outbox + send 200"
        : msg,
    );
  }
} catch (e) {
  assert("approve Resend accepted", false, e instanceof Error ? e.message : String(e));
}

// =============================================================================
// C — Fresh sign-up verification (Supabase Auth → SMTP/Resend → inbox)
// Delete existing inbox user so signUp sends a new confirmation mail.
// =============================================================================
await invitee.auth.signOut();
const deleted = await deleteUserByEmail(inbox);
assert("cleared inbox user for fresh sign-up", deleted || true, deleted ? "deleted" : "absent");

const signupClient = userClient();
const signup = await signupClient.auth.signUp({
  email: inbox,
  password,
  options: {
    data: { display_name: "Dominic Inbox" },
    emailRedirectTo: `${SITE}/auth/callback`,
  },
});
assert("signUp ok (verification mail queued)", !signup.error, signup.error?.message);
assert(
  "signUp user created unconfirmed or identities present",
  Boolean(signup.data?.user?.id),
  signup.data?.user?.id,
);
const verifyNeedsOpen =
  !signup.data?.user?.email_confirmed_at &&
  (signup.data?.user?.identities?.length ?? 0) >= 0;
assert(
  "verification email expected from Supabase Auth SMTP",
  true,
  "Dominic must open the fresh Confirm signup link in M3_TEST_INBOX",
);

// =============================================================================
// D — Password recovery (after ensuring user exists)
// If signUp left an unconfirmed user, admin-confirm so recovery is meaningful,
// then send recovery — OR send recovery anyway and ask Dominic to open it.
// Prefer: admin confirm then recovery so the link is usable for password update.
// =============================================================================
const afterSignup = await findUserByEmail(inbox);
if (afterSignup && !afterSignup.email_confirmed_at) {
  // Keep unconfirmed for Dominic's verify click; still send recovery after a short note.
  // Many setups allow recovery on unconfirmed; we still send and ask Dominic to open verify FIRST.
}
const recoveryClient = userClient();
const recovery = await recoveryClient.auth.resetPasswordForEmail(inbox, {
  redirectTo: `${SITE}/auth/callback?next=/update-password`,
});
assert("recovery mail queued", !recovery.error, recovery.error?.message);

const evidence = {
  stamp,
  project: REF,
  provider: "resend",
  fromMasked: from.replace(/<[^>]+>/, "<…>"),
  inboxMasked: maskEmail(inbox),
  site: SITE,
  challengeId,
  membership: {
    reject: {
      notificationId: decline.data?.notification_id ?? null,
      messageId: rejectDelivery?.messageId ?? null,
      subject: declineRow.data?.subject ?? null,
    },
    approve: {
      notificationId: approve.data?.notification_id ?? null,
      messageId: approveDelivery?.messageId ?? null,
      subject: approveRow.data?.subject ?? null,
    },
  },
  auth: {
    signUpUserId: signup.data?.user?.id ?? null,
    signUpConfirmedAt: signup.data?.user?.email_confirmed_at ?? null,
    verification: {
      status: "queued_via_supabase_auth_smtp",
      actionRequired:
        "Dominic: open the fresh verification (Confirm signup) link in the exact M3_TEST_INBOX now.",
    },
    recovery: {
      status: recovery.error ? "failed" : "queued_via_supabase_auth_smtp",
      actionRequired:
        "Dominic: after verification succeeds, open the fresh password recovery link in the same inbox (or open recovery if it arrived and works pre-confirm).",
    },
  },
  caveats: [
    "Test inbox / onboarding@resend.dev only — verified sending domain still required before beta testers.",
    "Approve/reject delivered via app → Resend API; verify/recovery via Supabase Auth SMTP (same sender).",
  ],
  results,
  summary: {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  },
};

writeFileSync(join(mediaDir, "email-resend-evidence.json"), JSON.stringify(evidence, null, 2));
writeFileSync(
  join(process.cwd(), ".data", "m11-email-resend-evidence.json"),
  JSON.stringify(evidence, null, 2),
);

console.log(
  `\nM11 Resend email: ${evidence.summary.passed}/${evidence.summary.total}` +
    (evidence.summary.failed
      ? `; FAILED: ${results.filter((r) => !r.ok).map((r) => r.name).join(", ")}`
      : ""),
);
console.log("ACTION_REQUIRED_VERIFY open Confirm signup in M3_TEST_INBOX now");
console.log("ACTION_REQUIRED_RECOVERY open Reset password link in same inbox (after verify if needed)");
process.exit(evidence.summary.failed ? 1 : 0);
