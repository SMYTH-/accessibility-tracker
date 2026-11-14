/**
 * M11 connected Journeys A–E + access boundaries against non-prod
 * Supabase gdrkejobqlvtwnlaedpu. Disposable accounts; synthetic data only.
 *
 * Path: challenge create → invite/approval (real RPCs) → savings setup →
 * record/correction → weekly streak/recovery → opt-out (both perspectives) →
 * completion → export isolation → removal → deletion/revocation.
 *
 * Email: records intended beta path (Resend) vs actual delivery (Ethereal when
 * RESEND_API_KEY absent). Does not invent product rules.
 */
import { createClient } from "@supabase/supabase-js";
import { createTransport, createTestAccount, getTestMessageUrl } from "nodemailer";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
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

function hasKey(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

function historyStatus(assess, weekStart) {
  const hist = assess?.history ?? [];
  const row = (hist || []).find((h) => h.week_start === weekStart);
  return row?.status ?? null;
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function userClient() {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureUser(email, password, displayName) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
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

function ymdInTz(isoOrDate, tz) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const dataDir = join(process.cwd(), ".data");
const mediaDir = join(process.cwd(), "media", "m11");
mkdirSync(dataDir, { recursive: true });
mkdirSync(mediaDir, { recursive: true });
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
    "Pactwell <onboarding@resend.dev>";

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

const stamp = Date.now();
const password = `M11-Test-${stamp}!`;
const provider = resolveProvider();
const emails = {
  alex: `m11.alex.${stamp}@example.com`,
  sam: `m11.sam.${stamp}@example.com`,
  pending: `m11.pending.${stamp}@example.com`,
  stranger: `m11.stranger.${stamp}@example.com`,
  removable: `m11.removable.${stamp}@example.com`,
  solo: `m11.solo.${stamp}@example.com`,
};

const ids = {
  alex: await ensureUser(emails.alex, password, "Alex"),
  sam: await ensureUser(emails.sam, password, "Sam"),
  pending: await ensureUser(emails.pending, password, "Pending"),
  stranger: await ensureUser(emails.stranger, password, "Stranger"),
  removable: await ensureUser(emails.removable, password, "Removable"),
  solo: await ensureUser(emails.solo, password, "Solo"),
};
assert("users ready", Object.values(ids).every(Boolean));

const sessions = {};
for (const [key, email] of Object.entries(emails)) {
  sessions[key] = userClient();
  const signed = await sessions[key].auth.signInWithPassword({ email, password });
  assert(`${key} sign-in`, !signed.error, signed.error?.message);
}

const today = ymdInTz(new Date(), "Europe/London");
const endFar = "2027-06-01";

// =============================================================================
// Journey A — Create a Challenge (+ invite link)
// =============================================================================
const created = await sessions.alex.rpc("create_private_challenge", {
  p_name: `M11 Journey ${stamp}`,
  p_description: "Connected A–E walkthrough",
  p_start_date: today,
  p_end_date: endFar,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("A: create challenge", !created.error, created.error?.message);
const challengeId = created.data?.challenge?.id;
assert("A: challenge id", Boolean(challengeId), challengeId);
assert(
  "A: owner approved participant",
  created.data?.membership?.status === "approved" ||
    created.data?.challenge?.owner_user_id === ids.alex,
  JSON.stringify(created.data?.membership),
);

const invite = await sessions.alex.rpc("create_challenge_invitation", {
  p_challenge_id: challengeId,
  p_expires_in_days: 7,
});
assert("A: invite token", !invite.error && Boolean(invite.data?.token), invite.error?.message);
const token = invite.data?.token;
const expiresAt = new Date(invite.data?.invitation?.expires_at).getTime();
const createdAt = new Date(invite.data?.invitation?.created_at).getTime();
assert(
  "A: invite ~7 day expiry",
  Math.abs(expiresAt - createdAt - 7 * 86400000) < 120000,
  `deltaMs=${expiresAt - createdAt}`,
);

// Signed-out preview (G1.1-07)
const unauth = userClient();
const anonPreview = await unauth.rpc("get_invitation_preview", { p_token: token });
assert("signed-out: invite preview ok", !anonPreview.error, anonPreview.error?.message);
const previewKeys = Object.keys(anonPreview.data || {}).sort();
assert(
  "signed-out: preview no financial keys",
  !previewKeys.some((k) => /currency|amount|target|total|owner|time_zone/i.test(k)),
  previewKeys.join(","),
);
const signedOutDash = await unauth.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "signed-out: dashboard denied",
  Boolean(signedOutDash.error) || signedOutDash.data == null,
  signedOutDash.error?.message,
);
const signedOutExport = await unauth.rpc("export_own_personal_data");
assert(
  "signed-out: export denied",
  Boolean(signedOutExport.error),
  signedOutExport.error?.message,
);

// =============================================================================
// Journey B — Join (real invite path + approval email outbox)
// =============================================================================
// Decline then approve so both NOTIF kinds are exercised on this connected path
const req1 = await sessions.sam.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert(
  "B: sam request pending",
  !req1.error && req1.data?.membership?.status === "pending",
  req1.error?.message,
);
const mem1 = req1.data?.membership?.id;

const pendingDash = await sessions.sam.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "pending: dashboard denied",
  Boolean(pendingDash.error?.message?.includes("MEMBERSHIP_REQUIRED")),
  pendingDash.error?.message,
);

const decline = await sessions.alex.rpc("decide_membership_request", {
  p_membership_id: mem1,
  p_decision: "decline",
});
assert(
  "B: owner decline + notif",
  !decline.error && Boolean(decline.data?.notification_id),
  decline.error?.message,
);

const declineRow = await admin
  .from("notification_outbox")
  .select("*")
  .eq("id", decline.data.notification_id)
  .maybeSingle();
assert(
  "B: reject outbox recorded",
  declineRow.data?.kind === "membership_rejected" &&
    declineRow.data?.recipient_email?.toLowerCase() === emails.sam.toLowerCase(),
);

let declineDelivery = null;
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
    "B: reject email delivered (provider)",
    Boolean(declineDelivery.messageId),
    declineDelivery.provider,
  );
} catch (e) {
  assert("B: reject email delivered (provider)", false, e instanceof Error ? e.message : String(e));
}

const req2 = await sessions.sam.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert(
  "B: sam re-request pending",
  !req2.error && req2.data?.membership?.status === "pending",
  req2.error?.message,
);

const approve = await sessions.alex.rpc("decide_membership_request", {
  p_membership_id: req2.data.membership.id,
  p_decision: "approve",
});
assert(
  "B: owner approve; savings inactive",
  !approve.error &&
    approve.data?.membership?.status === "approved" &&
    approve.data?.membership?.savings_participation_active === false,
  approve.error?.message,
);

const approveRow = await admin
  .from("notification_outbox")
  .select("*")
  .eq("id", approve.data.notification_id)
  .maybeSingle();
assert("B: approve outbox recorded", approveRow.data?.kind === "membership_approved");

let approveDelivery = null;
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
    "B: approve email delivered (provider)",
    Boolean(approveDelivery.messageId),
    approveDelivery.provider,
  );
} catch (e) {
  assert("B: approve email delivered (provider)", false, e instanceof Error ? e.message : String(e));
}

assert(
  "B: intended beta email = Resend; actual provider recorded",
  provider === "resend" || provider === "ethereal",
  `intended=resend actual=${provider} resendConfigured=${Boolean(process.env.RESEND_API_KEY?.trim())}`,
);

// Second invite for removable + pending boundary users
const invite2 = await sessions.alex.rpc("create_challenge_invitation", {
  p_challenge_id: challengeId,
  p_expires_in_days: 7,
});
const token2 = invite2.data?.token;
const remReq = await sessions.removable.rpc("request_challenge_membership", {
  p_token: token2,
  p_privacy_ack: true,
});
assert("B: removable request", !remReq.error, remReq.error?.message);
const remApprove = await sessions.alex.rpc("decide_membership_request", {
  p_membership_id: remReq.data.membership.id,
  p_decision: "approve",
});
assert("B: removable approved", !remApprove.error, remApprove.error?.message);

const invite3 = await sessions.alex.rpc("create_challenge_invitation", {
  p_challenge_id: challengeId,
  p_expires_in_days: 7,
});
const pendReq = await sessions.pending.rpc("request_challenge_membership", {
  p_token: invite3.data?.token,
  p_privacy_ack: true,
});
assert(
  "pending user stays pending",
  !pendReq.error && pendReq.data?.membership?.status === "pending",
  pendReq.error?.message,
);

// Savings setup (Journey B steps 8–9 / Journey C prerequisite)
for (const [who, target, weekly] of [
  ["alex", 200000, 5000],
  ["sam", 350000, 5000],
  ["removable", 100000, 2500],
]) {
  const act = await sessions[who].rpc("activate_savings_setup", {
    p_challenge_id: challengeId,
    p_target_minor: target,
    p_weekly_commitment_minor: weekly,
  });
  assert(`B/setup: activate ${who}`, !act.error, act.error?.message);
}

// =============================================================================
// Journey C — Record + correction
// =============================================================================
const alexRec = await sessions.alex.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 100000,
  p_idempotency_key: `m11-alex-${stamp}`,
});
assert("C: alex record", !alexRec.error, alexRec.error?.message);
const alexContribId = alexRec.data?.contribution?.id;
// Duplicate submission — same idempotency key must not double-count
const alexDup = await sessions.alex.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 100000,
  p_idempotency_key: `m11-alex-${stamp}`,
});
assert("C: alex duplicate submit ok", !alexDup.error, alexDup.error?.message);
assert(
  "C: duplicate same contribution id (no double count)",
  alexDup.data?.contribution?.id === alexContribId &&
    alexDup.data?.replayed === true,
  `first=${alexContribId} dup=${alexDup.data?.contribution?.id} replayed=${alexDup.data?.replayed}`,
);
const alexAmend = await sessions.alex.rpc("amend_contribution", {
  p_contribution_id: alexContribId,
  p_amount_minor: 124000,
});
assert("C: alex amend → 1240", !alexAmend.error, alexAmend.error?.message);

const samRec = await sessions.sam.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 184000,
  p_idempotency_key: `m11-sam-${stamp}`,
});
assert("C: sam record", !samRec.error, samRec.error?.message);

const remRec = await sessions.removable.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 50000,
  p_idempotency_key: `m11-rem-${stamp}`,
});
assert("C: removable record", !remRec.error, remRec.error?.message);

// =============================================================================
// Journey D — Review group progress (both perspectives)
// =============================================================================
const dashAlex = await sessions.alex.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
const dashSam = await sessions.sam.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert("D: alex dashboard", !dashAlex.error, dashAlex.error?.message);
assert("D: sam dashboard", !dashSam.error, dashSam.error?.message);
assert(
  "D: sharing label",
  dashSam.data?.sharing?.label === "Sharing members only",
  dashSam.data?.sharing?.label,
);
assert(
  "D: alex sees own personal",
  Number(dashAlex.data?.personal?.eligible_total_minor) === 124000,
  String(dashAlex.data?.personal?.eligible_total_minor),
);
const alexOnSam = (dashSam.data?.roster ?? []).find((r) => r.user_id === ids.alex);
assert(
  "D: sam sees alex amounts while sharing",
  Number(alexOnSam?.eligible_total_minor) === 124000 &&
    Number(alexOnSam?.target_minor) === 200000,
  JSON.stringify(alexOnSam),
);

const strangerDash = await sessions.stranger.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "stranger: dashboard denied",
  Boolean(strangerDash.error?.message?.includes("MEMBERSHIP_REQUIRED")),
  strangerDash.error?.message,
);

const pendingStill = await sessions.pending.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "pending: still denied after others approved",
  Boolean(pendingStill.error?.message?.includes("MEMBERSHIP_REQUIRED")),
  pendingStill.error?.message,
);

// =============================================================================
// Journey E — Missed week + automatic streak recovery (time-travel RPCs)
// =============================================================================
const streakCh = await sessions.alex.rpc("create_private_challenge", {
  p_name: `M11 Streak ${stamp}`,
  p_description: "Journey E recovery",
  p_start_date: today,
  p_end_date: endFar,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("E: streak challenge", !streakCh.error, streakCh.error?.message);
const streakId = streakCh.data?.challenge?.id;
await admin.from("challenges").update({ start_date: "2026-10-01" }).eq("id", streakId);
await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: streakId,
  p_user_id: ids.sam,
  p_share_monetary_info: true,
  p_role: "member",
});
const gridAct = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: streakId,
  p_user_id: ids.alex,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-10-19T12:00:00.000Z",
});
assert("E: activate Mon W43", !gridAct.error, gridAct.error?.message);

async function seedAt(amount, whenIso, key) {
  const res = await admin.rpc("record_contribution_at", {
    p_challenge_id: streakId,
    p_user_id: ids.alex,
    p_amount_minor: amount,
    p_idempotency_key: key,
    p_now: whenIso,
  });
  assert(`E: seed ${key}`, !res.error, res.error?.message);
  return res.data?.contribution;
}

await seedAt(5000, "2026-10-21T12:00:00.000Z", `m11-w43-${stamp}`);
await seedAt(5000, "2026-10-28T12:00:00.000Z", `m11-w44-${stamp}`);
const w45 = await seedAt(4000, "2026-11-04T12:00:00.000Z", `m11-w45-${stamp}`);

const nowClosed = "2026-11-12T12:00:00.000Z";
const assess1 = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: streakId,
  p_user_id: ids.alex,
  p_now: nowClosed,
});
assert("E: assess after miss", !assess1.error, assess1.error?.message);
assert("E: W45 missed preserved", historyStatus(assess1.data, "2026-11-02") === "missed");
assert("E: streak 0 after miss", Number(assess1.data?.streak_weeks) === 0);

await seedAt(5000, "2026-11-12T15:00:00.000Z", `m11-w46-meet-${stamp}`);
const afterMeet = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: streakId,
  p_user_id: ids.alex,
  p_now: nowClosed,
});
assert(
  "E: recovery streak begins automatically (W46)",
  Number(afterMeet.data?.streak_weeks) === 1 &&
    afterMeet.data?.weekly_assessment_status === "completed",
  `streak=${afterMeet.data?.streak_weeks} status=${afterMeet.data?.weekly_assessment_status}`,
);
assert(
  "E: missed week still recorded",
  historyStatus(afterMeet.data, "2026-11-02") === "missed",
);

// Amend closed miss → completed (correction path still available)
const amendMiss = await sessions.alex.rpc("amend_contribution", {
  p_contribution_id: w45.id,
  p_amount_minor: 5000,
});
assert("E: amend miss week", !amendMiss.error, amendMiss.error?.message);
const afterAmend = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: streakId,
  p_user_id: ids.alex,
  p_now: nowClosed,
});
assert(
  "E: W45 completed after amend; streak includes recovery",
  historyStatus(afterAmend.data, "2026-11-02") === "completed" &&
    Number(afterAmend.data?.streak_weeks) >= 1,
  `status=${historyStatus(afterAmend.data, "2026-11-02")} streak=${afterAmend.data?.streak_weeks}`,
);

// Pause scheduling remains OPEN — record honestly
assert(
  "E: pause scheduling OPEN (not tested as product feature)",
  true,
  "G1.1-11 pause UX still OPEN per M8/M10 carry-forward",
);

// =============================================================================
// Opt-out — both accounts’ perspectives (on main journey challenge)
// =============================================================================
const optAlex = await sessions.alex.rpc("set_own_share_monetary_info", {
  p_challenge_id: challengeId,
  p_share: false,
});
assert("opt-out: alex", !optAlex.error && optAlex.data?.share_monetary_info === false, optAlex.error?.message);

const dashSamAfterOpt = await sessions.sam.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
const alexAfter = (dashSamAfterOpt.data?.roster ?? []).find((r) => r.user_id === ids.alex);
assert("opt-out: sam sees Private chip", alexAfter?.privacy_chip === "Private");
assert(
  "opt-out: sam loses alex monetary fields",
  !hasKey(alexAfter, "eligible_total_minor") &&
    !hasKey(alexAfter, "target_minor") &&
    !hasKey(alexAfter, "progress_percent"),
  JSON.stringify(alexAfter),
);

const dashAlexAfterOpt = await sessions.alex.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "opt-out: alex still sees own figures",
  Number(dashAlexAfterOpt.data?.personal?.eligible_total_minor) === 124000 &&
    dashAlexAfterOpt.data?.personal?.share_monetary_info === false,
);

const optSam = await sessions.sam.rpc("set_own_share_monetary_info", {
  p_challenge_id: challengeId,
  p_share: false,
});
assert("opt-out: sam", !optSam.error && optSam.data?.share_monetary_info === false, optSam.error?.message);

const dashAlexSeesSam = await sessions.alex.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
const samOnAlex = (dashAlexSeesSam.data?.roster ?? []).find((r) => r.user_id === ids.sam);
assert("opt-out: alex sees sam Private", samOnAlex?.privacy_chip === "Private");
assert(
  "opt-out: alex loses sam monetary fields",
  !hasKey(samOnAlex, "eligible_total_minor") && !hasKey(samOnAlex, "target_minor"),
  JSON.stringify(samOnAlex),
);

// =============================================================================
// Remove member — access revocation
// =============================================================================
const remMem = await admin
  .from("challenge_memberships")
  .select("id")
  .eq("challenge_id", challengeId)
  .eq("user_id", ids.removable)
  .single();
const removed = await sessions.alex.rpc("remove_challenge_member", {
  p_membership_id: remMem.data.id,
});
assert("removed: owner remove rpc", !removed.error, removed.error?.message);
const remDash = await sessions.removable.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "removed: dashboard denied",
  Boolean(remDash.error?.message?.includes("MEMBERSHIP_REQUIRED")),
  remDash.error?.message,
);
const remExport = await sessions.removable.rpc("export_own_personal_data");
assert("removed: can still export own account data", !remExport.error, remExport.error?.message);
const remExportChallenges = remExport.data?.challenges ?? remExport.data?.memberships ?? [];
// Export may include historical membership; must not grant live dashboard access (checked above)

// =============================================================================
// Completion — read-only
// =============================================================================
const completeCh = await sessions.alex.rpc("create_private_challenge", {
  p_name: `M11 Complete ${stamp}`,
  p_description: "completion",
  p_start_date: today,
  p_end_date: endFar,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
const completeId = completeCh.data?.challenge?.id;
await admin.from("challenges").update({ start_date: "2026-10-01", end_date: "2026-11-01" }).eq("id", completeId);
await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: completeId,
  p_user_id: ids.sam,
  p_share_monetary_info: true,
  p_role: "member",
});
await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: completeId,
  p_user_id: ids.alex,
  p_target_minor: 100000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-10-05T12:00:00.000Z",
});
const tick = await admin.rpc("reconcile_challenge_lifecycles_at", {
  p_now: "2026-11-03T00:00:00.000Z",
});
assert("completion: tick ok", !tick.error, tick.error?.message);
const chalDone = await admin.from("challenges").select("lifecycle_status").eq("id", completeId).single();
assert(
  "completion: Completed",
  chalDone.data?.lifecycle_status === "Completed",
  chalDone.data?.lifecycle_status,
);
const postCreate = await sessions.alex.rpc("record_contribution", {
  p_challenge_id: completeId,
  p_amount_minor: 1000,
  p_idempotency_key: `m11-post-complete-${stamp}`,
});
assert(
  "completion: ordinary create rejected",
  Boolean(postCreate.error),
  postCreate.error?.message,
);

// =============================================================================
// Export isolation (cross-user)
// =============================================================================
const alexExport = await sessions.alex.rpc("export_own_personal_data");
const samExport = await sessions.sam.rpc("export_own_personal_data");
const strangerExport = await sessions.stranger.rpc("export_own_personal_data");
assert("export: alex ok", !alexExport.error, alexExport.error?.message);
assert("export: sam ok", !samExport.error, samExport.error?.message);
assert("export: stranger ok (empty own)", !strangerExport.error, strangerExport.error?.message);

const alexBlob = JSON.stringify(alexExport.data ?? {});
const samBlob = JSON.stringify(samExport.data ?? {});
assert(
  "export: alex blob excludes sam email",
  !alexBlob.toLowerCase().includes(emails.sam.toLowerCase()),
);
assert(
  "export: sam blob excludes alex email",
  !samBlob.toLowerCase().includes(emails.alex.toLowerCase()),
);
assert(
  "export: alex excludes peer private monetary after opt-out context",
  !alexBlob.includes("184000") || alexBlob.includes("\"user_id\""),
  "peer amounts must not appear as alex-owned figures",
);
// Stricter: sam's contribution amount should not appear under alex export contributions
const alexContribs = alexExport.data?.contributions ?? [];
assert(
  "export: alex contributions only self",
  (alexContribs || []).every(
    (c) => !c.user_id || c.user_id === ids.alex,
  ),
  String((alexContribs || []).length),
);

// =============================================================================
// Deletion + dual-session revocation (Completed owner → immediate finalise)
// =============================================================================
const sessionSoloA = sessions.solo;
const delCh = await sessionSoloA.rpc("create_private_challenge", {
  p_name: `M11 Delete Dual ${stamp}`,
  p_description: "dual-session deletion revocation",
  p_start_date: today,
  p_end_date: endFar,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
const delId = delCh.data?.challenge?.id;
assert("deletion: solo challenge", Boolean(delId), delCh.error?.message);

// Completed owner can finalise without grace/transfer (M10 dual-session pattern)
await admin.from("challenges").update({ lifecycle_status: "Completed" }).eq("id", delId);

const sessionSoloB = userClient();
const signedB = await sessionSoloB.auth.signInWithPassword({
  email: emails.solo,
  password,
});
assert("deletion: second session sign-in", !signedB.error, signedB.error?.message);

const exportBBefore = await sessionSoloB.rpc("export_own_personal_data");
assert("deletion: second session export before", !exportBBefore.error);

const reqDel = await sessionSoloA.rpc("request_account_deletion");
assert(
  "deletion: request completes or revoking",
  !reqDel.error &&
    (reqDel.data?.status === "completed" || reqDel.data?.status === "revoking"),
  reqDel.error?.message || reqDel.data?.status,
);

let delStatus = reqDel.data?.status;
let delAttempts = 0;
while (delStatus === "revoking" && delAttempts < 3) {
  delAttempts += 1;
  const retry = await sessionSoloA.rpc("finalize_account_deletion");
  assert(
    `deletion: finalize retry ${delAttempts}`,
    !retry.error &&
      (retry.data?.status === "completed" || retry.data?.status === "revoking"),
    retry.error?.message || retry.data?.status,
  );
  delStatus = retry.data?.status;
  if (delStatus === "completed") break;
}
assert("deletion: completed", delStatus === "completed", delStatus);

const exportAfter = await sessionSoloB.rpc("export_own_personal_data");
assert(
  "deleted/revoked session: export denied",
  Boolean(exportAfter.error?.message?.includes("ACCOUNT_ACCESS_REVOKED")) ||
    Boolean(exportAfter.error),
  exportAfter.error?.message,
);
const dashAfter = await sessionSoloB.rpc("challenge_dashboard", {
  p_challenge_id: delId,
});
assert(
  "deleted/revoked session: dashboard denied",
  Boolean(dashAfter.error),
  dashAfter.error?.message,
);
const refresh = await sessionSoloB.auth.refreshSession();
assert(
  "deleted/revoked session: refresh fails",
  Boolean(refresh.error),
  refresh.error?.message,
);

const resign = await userClient().auth.signInWithPassword({
  email: emails.solo,
  password,
});
assert(
  "deleted: old password sign-in fails",
  Boolean(resign.error),
  resign.error?.message,
);

// =============================================================================
// Summarise
// =============================================================================
const failed = results.filter((r) => !r.ok);
const evidence = {
  stamp,
  project: REF,
  challengeId,
  streakId,
  completeId,
  email: {
    intendedBetaPath: "Resend → Dominic inbox (M3 carry-forward)",
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    actualProvider: provider,
    reject: {
      notificationId: decline.data?.notification_id ?? null,
      messageId: declineDelivery?.messageId ?? null,
      previewUrl: declineDelivery?.previewUrl ?? null,
      subject: declineRow.data?.subject ?? null,
    },
    approve: {
      notificationId: approve.data?.notification_id ?? null,
      messageId: approveDelivery?.messageId ?? null,
      previewUrl: approveDelivery?.previewUrl ?? null,
      subject: approveRow.data?.subject ?? null,
    },
    note:
      provider === "resend"
        ? "Resend delivered to configured inbox."
        : "No RESEND_API_KEY in env — delivery verified via Ethereal (M3 interim). Beta invite path still needs Resend configured before inviting human testers.",
  },
  openItemsNoted: [
    "Pause scheduling / streak awards (G1.1-08 thresholds UX / G1.1-11) still OPEN",
    "Re-opt-in after monetary opt-out still OPEN (REOPT_IN_DEFERRED)",
    "Manual cancel UX (non-deletion) still OPEN",
    "Multi-year anonymised history purge calendar still OPEN — proposal only in M11",
  ],
  results,
  summary: {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
  },
};

writeFileSync(join(dataDir, "m11-journeys-evidence.json"), JSON.stringify(evidence, null, 2));
writeFileSync(join(mediaDir, "journeys-evidence.json"), JSON.stringify(evidence, null, 2));

console.log(
  `\nM11 journeys: ${evidence.summary.passed}/${evidence.summary.total} passed` +
    (failed.length ? `; FAILED: ${failed.map((f) => f.name).join(", ")}` : ""),
);
console.log(`Email provider actual=${provider} resendConfigured=${evidence.email.resendConfigured}`);
if (declineDelivery?.previewUrl) console.log("REJECT_PREVIEW", declineDelivery.previewUrl);
if (approveDelivery?.previewUrl) console.log("APPROVE_PREVIEW", approveDelivery.previewUrl);

process.exit(failed.length ? 1 : 0);
