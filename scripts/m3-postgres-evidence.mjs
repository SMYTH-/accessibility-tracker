/**
 * M3 Postgres evidence against linked non-prod Supabase gdrkejobqlvtwnlaedpu.
 * Owner / invitee / unrelated sessions; invalid/expired/revoked; no-ack; NOTIF outbox.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
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

const stamp = Date.now();
const ownerEmail = `m3.owner.${stamp}@example.com`;
const inviteeEmail = `m3.invitee.${stamp}@example.com`;
const otherEmail = `m3.other.${stamp}@example.com`;
const password = `M3-Test-${stamp}!`;

const ownerId = await ensureUser(ownerEmail, password, "M3 Owner");
const inviteeId = await ensureUser(inviteeEmail, password, "M3 Invitee");
const otherId = await ensureUser(otherEmail, password, "M3 Other");
assert("users ready", Boolean(ownerId && inviteeId && otherId));

const owner = userClient();
const invitee = userClient();
const other = userClient();
const anonClient = userClient();

assert(
  "owner sign-in",
  !(await owner.auth.signInWithPassword({ email: ownerEmail, password })).error,
);
assert(
  "invitee sign-in",
  !(await invitee.auth.signInWithPassword({ email: inviteeEmail, password })).error,
);
assert(
  "other sign-in",
  !(await other.auth.signInWithPassword({ email: otherEmail, password })).error,
);

const start = new Date();
start.setUTCDate(start.getUTCDate() + 21);
const end = new Date(start);
end.setUTCDate(end.getUTCDate() + 90);
const startDate = start.toISOString().slice(0, 10);
const endDate = end.toISOString().slice(0, 10);

const create = await owner.rpc("create_private_challenge", {
  p_name: `M3 Evidence ${stamp}`,
  p_description: "Membership evidence challenge",
  p_start_date: startDate,
  p_end_date: endDate,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("owner create challenge", !create.error && Boolean(create.data?.challenge?.id), create.error?.message);
const challengeId = create.data?.challenge?.id;

const invite = await owner.rpc("create_challenge_invitation", {
  p_challenge_id: challengeId,
  p_expires_in_days: 7,
});
assert("create invite default 7d", !invite.error && Boolean(invite.data?.token), invite.error?.message);
if (invite.error || !invite.data?.token) {
  mkdirSync(join(process.cwd(), ".data"), { recursive: true });
  writeFileSync(
    join(process.cwd(), ".data", "m3-postgres-evidence.json"),
    JSON.stringify({ stamp, results }, null, 2),
  );
  process.exit(1);
}
const token = invite.data.token;
const invitationId = invite.data?.invitation?.id;
const expiresAt = new Date(invite.data?.invitation?.expires_at).getTime();
const createdAt = new Date(invite.data?.invitation?.created_at).getTime();
assert(
  "expiry ~7 days",
  Math.abs(expiresAt - createdAt - 7 * 86400000) < 120000,
  `deltaMs=${expiresAt - createdAt}`,
);

const anonPreview = await anonClient.rpc("get_invitation_preview", { p_token: token });
assert("anon preview ok", !anonPreview.error, anonPreview.error?.message);
const previewKeys = Object.keys(anonPreview.data || {}).sort();
assert(
  "preview keys limited",
  previewKeys.every((k) =>
    [
      "invitation_id",
      "challenge_id",
      "name",
      "description",
      "start_date",
      "end_date",
      "participant_count",
      "expires_at",
    ].includes(k),
  ),
  previewKeys.join(","),
);
assert(
  "preview has no financial keys",
  !previewKeys.some((k) => /currency|amount|target|total|owner|time_zone/i.test(k)),
);
assert("participant count = 1 (owner)", anonPreview.data?.participant_count === 1);

const noAck = await invitee.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: false,
});
assert("no-ack rejected", Boolean(noAck.error) && /PRIVACY_ACK_REQUIRED/i.test(noAck.error.message));

const req = await invitee.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert("request pending", !req.error && req.data?.membership?.status === "pending", req.error?.message);
assert(
  "savings inactive after request",
  req.data?.membership?.savings_participation_active === false,
);
const membershipId = req.data?.membership?.id;

const retry = await invitee.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert("safe retry", !retry.error && retry.data?.created === false);

const pendingChallengeRead = await invitee
  .from("challenges")
  .select("*")
  .eq("id", challengeId)
  .maybeSingle();
assert(
  "pending cannot read challenge row via RLS",
  !pendingChallengeRead.data,
  pendingChallengeRead.error?.message || "null data",
);

const otherPreviewLeak = await other.from("challenges").select("*").eq("id", challengeId).maybeSingle();
assert("unrelated cannot read challenge", !otherPreviewLeak.data);

const wait = await invitee.rpc("get_membership_wait_preview", { p_challenge_id: challengeId });
assert("wait preview for pending", !wait.error && wait.data?.membership?.status === "pending");
assert(
  "wait preview G1.1-07 only",
  wait.data?.preview &&
    !("currency" in wait.data.preview) &&
    !("time_zone" in wait.data.preview),
);

const decideDenied = await other.rpc("decide_membership_request", {
  p_membership_id: membershipId,
  p_decision: "approve",
});
assert("unrelated cannot approve", Boolean(decideDenied.error));

const decline = await owner.rpc("decide_membership_request", {
  p_membership_id: membershipId,
  p_decision: "decline",
});
assert("owner decline", !decline.error && decline.data?.membership?.status === "declined", decline.error?.message);
assert("decline notification id", Boolean(decline.data?.notification_id));

let notifAfterDecline = { data: null };
if (decline.data?.notification_id) {
  notifAfterDecline = await admin
    .from("notification_outbox")
    .select("*")
    .eq("id", decline.data.notification_id)
    .maybeSingle();
}
assert(
  "NOTIF-01 reject email recorded",
  notifAfterDecline.data?.kind === "membership_rejected" &&
    notifAfterDecline.data?.recipient_email === inviteeEmail,
);

const reReq = await invitee.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert("re-request after decline", !reReq.error && reReq.data?.membership?.status === "pending");
const membershipId2 = reReq.data?.membership?.id;

const approve = await owner.rpc("decide_membership_request", {
  p_membership_id: membershipId2,
  p_decision: "approve",
});
assert(
  "approve; savings inactive",
  !approve.error &&
    approve.data?.membership?.status === "approved" &&
    approve.data?.membership?.savings_participation_active === false,
  approve.error?.message,
);
const notifApprove = await admin
  .from("notification_outbox")
  .select("*")
  .eq("id", approve.data.notification_id)
  .maybeSingle();
assert(
  "NOTIF-01 approve email recorded",
  notifApprove.data?.kind === "membership_approved" &&
    /approved/i.test(notifApprove.data?.subject || ""),
);

const approvedRead = await invitee.from("challenges").select("id,name").eq("id", challengeId).maybeSingle();
assert("approved can read challenge", Boolean(approvedRead.data?.id));

const ownerLeave = await owner.rpc("leave_challenge", { p_challenge_id: challengeId });
assert(
  "owner leave blocked Scheduled",
  Boolean(ownerLeave.error) && /OWNER_LEAVE_REQUIRES_TRANSFER/i.test(ownerLeave.error.message),
);

const memberLeave = await invitee.rpc("leave_challenge", { p_challenge_id: challengeId });
assert("member leave", !memberLeave.error && memberLeave.data?.membership?.status === "left");

const afterLeaveRead = await invitee.from("challenges").select("id").eq("id", challengeId).maybeSingle();
assert("left member loses challenge read", !afterLeaveRead.data);

const rejoin = await invitee.rpc("request_challenge_membership", {
  p_token: token,
  p_privacy_ack: true,
});
assert("rejoin pending", !rejoin.error && rejoin.data?.membership?.status === "pending");
const rejoinId = rejoin.data?.membership?.id;
const reapprove = await owner.rpc("decide_membership_request", {
  p_membership_id: rejoinId,
  p_decision: "approve",
});
assert("re-approve", !reapprove.error);

const remove = await owner.rpc("remove_challenge_member", { p_membership_id: rejoinId });
assert("owner remove", !remove.error && remove.data?.membership?.status === "removed");
const afterRemove = await invitee.from("challenges").select("id").eq("id", challengeId).maybeSingle();
assert("removed loses access immediately", !afterRemove.data);

const inv2 = await owner.rpc("create_challenge_invitation", {
  p_challenge_id: challengeId,
  p_expires_in_days: 7,
});
const token2 = inv2.data?.token;
const rev = await owner.rpc("revoke_challenge_invitation", {
  p_invitation_id: inv2.data?.invitation?.id,
});
assert("revoke invite", !rev.error && Boolean(rev.data?.invitation?.revoked_at));
const revokedPreview = await anonClient.rpc("get_invitation_preview", { p_token: token2 });
assert("revoked preview fails", Boolean(revokedPreview.error) && /INVITE_REVOKED/i.test(revokedPreview.error.message));
const revokedReq = await other.rpc("request_challenge_membership", {
  p_token: token2,
  p_privacy_ack: true,
});
assert("revoked cannot request", Boolean(revokedReq.error));

const invalid = await anonClient.rpc("get_invitation_preview", { p_token: "deadbeef" });
assert("invalid token fails", Boolean(invalid.error));

// Expired: insert invite with past expiry via admin, then preview/request
const expiredToken = `expired-${stamp}`;
const expiredHash = createHash("sha256").update(expiredToken, "utf8").digest("hex");
const expiredInsert = await admin.from("challenge_invitations").insert({
  challenge_id: challengeId,
  token_hash: expiredHash,
  created_by: ownerId,
  created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  expires_at: new Date(Date.now() - 86400000).toISOString(),
});
assert("seed expired invite", !expiredInsert.error, expiredInsert.error?.message);
const expiredPreview = await anonClient.rpc("get_invitation_preview", { p_token: expiredToken });
assert("expired preview fails", Boolean(expiredPreview.error) && /INVITE_EXPIRED/i.test(expiredPreview.error.message));
const expiredReq = await other.rpc("request_challenge_membership", {
  p_token: expiredToken,
  p_privacy_ack: true,
});
assert("expired cannot request", Boolean(expiredReq.error) && /INVITE_EXPIRED/i.test(expiredReq.error.message));

// Duplicate membership unique: approved invitee path already covered; count rows
const memCount = await admin
  .from("challenge_memberships")
  .select("id", { count: "exact" })
  .eq("challenge_id", challengeId)
  .eq("user_id", inviteeId);
assert("single membership row per user", (memCount.count ?? 0) === 1, `count=${memCount.count}`);

mkdirSync(join(process.cwd(), ".data"), { recursive: true });
writeFileSync(
  join(process.cwd(), ".data", "m3-postgres-evidence.json"),
  JSON.stringify({ stamp, challengeId, invitationId, results }, null, 2),
);

const failed = results.filter((r) => !r.ok).length;
console.log(`\nM3 postgres evidence: ${results.length - failed}/${results.length} pass`);
process.exit(failed === 0 ? 0 : 1);
