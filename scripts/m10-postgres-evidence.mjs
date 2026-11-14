/**
 * M10 live evidence on Supabase gdrkejobqlvtwnlaedpu.
 * Two-account export isolation + deletion Option A paths.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
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

const stamp = Date.now();
const password = `M10-Test-${stamp}!`;
const emails = {
  alex: `m10.alex.${stamp}@example.com`,
  sam: `m10.sam.${stamp}@example.com`,
  solo: `m10.solo.${stamp}@example.com`,
  stranger: `m10.stranger.${stamp}@example.com`,
};

const ids = {
  alex: await ensureUser(emails.alex, password, "Alex"),
  sam: await ensureUser(emails.sam, password, "Sam"),
  solo: await ensureUser(emails.solo, password, "Solo"),
  stranger: await ensureUser(emails.stranger, password, "Stranger"),
};
assert("users ready", Object.values(ids).every(Boolean));

const sessions = {};
for (const [key, email] of Object.entries(emails)) {
  sessions[key] = userClient();
  const signed = await sessions[key].auth.signInWithPassword({ email, password });
  assert(`${key} sign-in`, !signed.error, signed.error?.message);
}

const now = new Date();
const today = ymdInTz(now, "Europe/London");
const end = new Date(now);
end.setUTCDate(end.getUTCDate() + 90);

// --- Export isolation ---
const created = await sessions.alex.rpc("create_private_challenge", {
  p_name: `M10 Export ${stamp}`,
  p_description: "two-account export",
  p_start_date: today,
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("create challenge", !created.error, created.error?.message);
const challengeId = created.data?.challenge?.id;
assert("challenge id", Boolean(challengeId), challengeId);

const fixtureSam = await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.sam,
  p_share_monetary_info: true,
  p_role: "member",
});
assert("approve sam", !fixtureSam.error, fixtureSam.error?.message);

const setupSam = await sessions.sam.rpc("activate_savings_setup", {
  p_challenge_id: challengeId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
});
assert("sam savings", !setupSam.error, setupSam.error?.message);

const setupAlex = await sessions.alex.rpc("activate_savings_setup", {
  p_challenge_id: challengeId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
});
assert("alex savings", !setupAlex.error, setupAlex.error?.message);

const contribSam = await sessions.sam.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 7777,
  p_idempotency_key: `m10-sam-${stamp}`,
});
assert("sam contribution", !contribSam.error, contribSam.error?.message);

const contribAlex = await sessions.alex.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 8888,
  p_idempotency_key: `m10-alex-${stamp}`,
});
assert("alex contribution", !contribAlex.error, contribAlex.error?.message);

const alexExport = await sessions.alex.rpc("export_own_personal_data");
assert("alex export", !alexExport.error, alexExport.error?.message);
const alexRaw = JSON.stringify(alexExport.data ?? {});
assert("alex export subject", alexExport.data?.subject_user_id === ids.alex);
assert("alex export has own amount", alexRaw.includes("8888"));
assert("alex export excludes sam amount", !alexRaw.includes("7777"));
assert("alex export excludes sam email", !alexRaw.includes(emails.sam));
assert(
  "alex export privacy note",
  String(alexExport.data?.privacy_note ?? "").toLowerCase().includes("other members"),
);

const samExport = await sessions.sam.rpc("export_own_personal_data");
assert("sam export", !samExport.error, samExport.error?.message);
const samRaw = JSON.stringify(samExport.data ?? {});
assert("sam export subject", samExport.data?.subject_user_id === ids.sam);
assert("sam export has own amount", samRaw.includes("7777"));
assert("sam export excludes alex amount", !samRaw.includes("8888"));
assert("sam export excludes alex email", !samRaw.includes(emails.alex));

const strangerExport = await sessions.stranger.rpc("export_own_personal_data");
assert("stranger export", !strangerExport.error, strangerExport.error?.message);
const strangerRaw = JSON.stringify(strangerExport.data ?? {});
assert("stranger excludes challenge money", !strangerRaw.includes("7777") && !strangerRaw.includes("8888"));
assert(
  "stranger no membership on challenge",
  !(strangerExport.data?.memberships ?? []).some((m) => m.challenge_id === challengeId),
);

const unauth = userClient();
const unauthExport = await unauth.rpc("export_own_personal_data");
assert("unauth export denied", Boolean(unauthExport.error));

// --- Transfer path ---
const delAlex = await sessions.alex.rpc("request_account_deletion");
assert(
  "alex deletion pending transfer",
  !delAlex.error && delAlex.data?.status === "pending_transfer",
  delAlex.error?.message || delAlex.data?.status,
);

const badTransfer = await sessions.alex.rpc("transfer_challenge_ownership", {
  p_challenge_id: challengeId,
  p_new_owner_user_id: ids.stranger,
});
assert("transfer to non-member rejected", Boolean(badTransfer.error));

const transfer = await sessions.alex.rpc("transfer_challenge_ownership", {
  p_challenge_id: challengeId,
  p_new_owner_user_id: ids.sam,
});
assert("transfer to sam", !transfer.error, transfer.error?.message);

const finAlex = await sessions.alex.rpc("finalize_account_deletion");
assert(
  "alex finalise after transfer",
  !finAlex.error && finAlex.data?.status === "completed",
  finAlex.error?.message || finAlex.data?.status,
);

const finAlexRetry = await sessions.alex.rpc("finalize_account_deletion");
assert(
  "alex finalise retry",
  !finAlexRetry.error && finAlexRetry.data?.idempotent === true,
  finAlexRetry.error?.message,
);

// Access denial after finalisation — re-login should fail / export identity gone
const alexRelogin = await userClient().auth.signInWithPassword({
  email: emails.alex,
  password,
});
assert("alex old email login fails", Boolean(alexRelogin.error));

const samDash = await sessions.sam.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert("sam still has access", !samDash.error, samDash.error?.message);

// --- Grace + transfer-during-grace prevents cancel ---
// Fresh owner (solo) creates a solo Active challenge → grace → add member → transfer → finalise
const createdGrace = await sessions.solo.rpc("create_private_challenge", {
  p_name: `M10 Grace ${stamp}`,
  p_description: "grace transfer",
  p_start_date: today,
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("grace challenge", !createdGrace.error, createdGrace.error?.message);
const graceChallengeId = createdGrace.data?.challenge?.id;

const delGrace = await sessions.solo.rpc("request_account_deletion");
assert(
  "solo grace pending",
  !delGrace.error && delGrace.data?.status === "grace_pending",
  delGrace.error?.message || delGrace.data?.status,
);

const early = await sessions.solo.rpc("finalize_account_deletion");
assert(
  "grace blocks early finalise",
  Boolean(early.error) && String(early.error.message).includes("DELETION_GRACE_ACTIVE"),
  early.error?.message,
);

const fixtureGraceMember = await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: graceChallengeId,
  p_user_id: ids.sam,
  p_share_monetary_info: true,
  p_role: "member",
});
assert("grace member fixture", !fixtureGraceMember.error, fixtureGraceMember.error?.message);

const transferGrace = await sessions.solo.rpc("transfer_challenge_ownership", {
  p_challenge_id: graceChallengeId,
  p_new_owner_user_id: ids.sam,
});
assert("transfer during grace", !transferGrace.error, transferGrace.error?.message);

const finSoloGrace = await sessions.solo.rpc("finalize_account_deletion");
assert(
  "solo finalise after grace transfer",
  !finSoloGrace.error && finSoloGrace.data?.status === "completed",
  finSoloGrace.error?.message || finSoloGrace.data?.status,
);

const graceChal = await admin
  .from("challenges")
  .select("lifecycle_status, owner_user_id")
  .eq("id", graceChallengeId)
  .single();
assert(
  "grace challenge not cancelled after transfer",
  graceChal.data?.lifecycle_status !== "Cancelled",
  graceChal.data?.lifecycle_status,
);
assert(
  "grace challenge owned by sam",
  graceChal.data?.owner_user_id === ids.sam,
  graceChal.data?.owner_user_id,
);

const soloLoginAfterGrace = await userClient().auth.signInWithPassword({
  email: emails.solo,
  password,
});
assert("solo email login fails after grace-transfer deletion", Boolean(soloLoginAfterGrace.error));

// --- No-replacement cancel path (fresh disposable owner) ---
const cancelOwnerEmail = `m10.cancel.${stamp}@example.com`;
const cancelOwnerId = await ensureUser(cancelOwnerEmail, password, "CancelOwner");
const cancelSession = userClient();
const cancelSign = await cancelSession.auth.signInWithPassword({
  email: cancelOwnerEmail,
  password,
});
assert("cancel owner sign-in", !cancelSign.error, cancelSign.error?.message);

const soloCreate = await cancelSession.rpc("create_private_challenge", {
  p_name: `M10 Cancel ${stamp}`,
  p_description: "solo cancel",
  p_start_date: today,
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("cancel challenge create", !soloCreate.error, soloCreate.error?.message);
const cancelChallengeId = soloCreate.data?.challenge?.id;

const cancelDel = await cancelSession.rpc("request_account_deletion");
assert(
  "cancel-path grace pending",
  !cancelDel.error && cancelDel.data?.status === "grace_pending",
  cancelDel.error?.message || cancelDel.data?.status,
);

const { data: cancelReq } = await admin
  .from("account_deletion_requests")
  .select("id")
  .eq("user_id", cancelOwnerId)
  .single();
const past = new Date(Date.now() - 60_000).toISOString();
await admin
  .from("account_deletion_requests")
  .update({ grace_ends_at: past, status: "grace_pending" })
  .eq("id", cancelReq.id);
await admin
  .from("account_deletion_challenge_holds")
  .update({ grace_ends_at: past })
  .eq("deletion_request_id", cancelReq.id)
  .is("resolved_at", null);

const tick = await admin.rpc("tick_account_deletion_grace");
assert("tick grace", !tick.error, tick.error?.message);
assert("tick finalised >= 1", Number(tick.data?.finalised ?? 0) >= 1, JSON.stringify(tick.data));

const cancelled = await admin
  .from("challenges")
  .select("lifecycle_status, owner_user_id")
  .eq("id", cancelChallengeId)
  .single();
assert(
  "challenge cancelled after grace",
  cancelled.data?.lifecycle_status === "Cancelled",
  cancelled.data?.lifecycle_status,
);

const cancelLogin = await userClient().auth.signInWithPassword({
  email: cancelOwnerEmail,
  password,
});
assert("cancel-owner old email login fails after deletion", Boolean(cancelLogin.error));

const outDir = join(process.cwd(), "media", "m10");
mkdirSync(outDir, { recursive: true });
const summary = {
  project: REF,
  stamp,
  emails: { alex: emails.alex, sam: emails.sam, solo: emails.solo },
  challengeId,
  graceChallengeId,
  cancelChallengeId,
  results,
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
};
writeFileSync(join(outDir, "pg-evidence.json"), JSON.stringify(summary, null, 2));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${failed === 0 ? "OK" : "FAILED"}  m10-postgres-evidence ${summary.passed}/${results.length}`);
process.exit(failed === 0 ? 0 : 1);
