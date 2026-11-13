/**
 * M10 dual-session deletion evidence on gdrkejobqlvtwnlaedpu.
 * Session A finalises deletion; session B must lose protected API access
 * immediately (in-lifetime access token) and refresh must fail.
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
      ban_duration: "none",
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

function ymdInTz(d, tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const stamp = Date.now();
const password = `M10-Dual-${stamp}!`;
const email = `m10.dual.${stamp}@example.com`;
const userId = await ensureUser(email, password, "Dual");
assert("user ready", Boolean(userId));

const sessionA = userClient();
const sessionB = userClient();
const signA = await sessionA.auth.signInWithPassword({ email, password });
const signB = await sessionB.auth.signInWithPassword({ email, password });
assert("session A sign-in", !signA.error, signA.error?.message);
assert("session B sign-in", !signB.error, signB.error?.message);

const tokenBBefore = (await sessionB.auth.getSession()).data.session?.access_token;
assert("session B has access token", Boolean(tokenBBefore));

const today = ymdInTz(new Date(), "Europe/London");
const end = new Date();
end.setUTCDate(end.getUTCDate() + 60);

const created = await sessionA.rpc("create_private_challenge", {
  p_name: `M10 Dual ${stamp}`,
  p_description: "dual-session deletion",
  p_start_date: today,
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("create challenge", !created.error, created.error?.message);
const challengeId = created.data?.challenge?.id;

// Complete the challenge so owner deletion can finalise without grace/transfer.
await admin
  .from("challenges")
  .update({ lifecycle_status: "Completed" })
  .eq("id", challengeId);

const exportBBefore = await sessionB.rpc("export_own_personal_data");
assert("B export before deletion", !exportBBefore.error, exportBBefore.error?.message);

const dashBBefore = await sessionB.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert("B dashboard before deletion", !dashBBefore.error, dashBBefore.error?.message);

const deniedProbeBefore = await sessionB.rpc("account_access_denied_for_me");
assert(
  "B access-denied probe false before",
  !deniedProbeBefore.error && deniedProbeBefore.data === false,
  deniedProbeBefore.error?.message ?? String(deniedProbeBefore.data),
);

// Session A requests deletion (Completed owner → finalise path).
const del = await sessionA.rpc("request_account_deletion");
assert(
  "A deletion request",
  !del.error &&
    (del.data?.status === "completed" || del.data?.status === "revoking"),
  del.error?.message || del.data?.status,
);

// If stuck revoking, retry until completed (safe retry).
let status = del.data?.status;
let attempts = 0;
while (status === "revoking" && attempts < 3) {
  attempts += 1;
  const retry = await sessionA.rpc("finalize_account_deletion");
  assert(
    `A finalize retry ${attempts}`,
    !retry.error &&
      (retry.data?.status === "completed" || retry.data?.status === "revoking"),
    retry.error?.message || retry.data?.status,
  );
  status = retry.data?.status;
  if (status === "completed") break;
}
assert("deletion completed", status === "completed", status);

// --- Session B: in-lifetime token must lose access immediately ---
const deniedProbeAfter = await sessionB.rpc("account_access_denied_for_me");
assert(
  "B access-denied probe true after",
  !deniedProbeAfter.error && deniedProbeAfter.data === true,
  deniedProbeAfter.error?.message ?? String(deniedProbeAfter.data),
);

const exportBAfter = await sessionB.rpc("export_own_personal_data");
assert(
  "B export denied after deletion",
  Boolean(exportBAfter.error?.message?.includes("ACCOUNT_ACCESS_REVOKED")),
  exportBAfter.error?.message || "unexpected ok",
);

const dashBAfter = await sessionB.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "B challenge API denied after deletion",
  Boolean(dashBAfter.error),
  dashBAfter.error?.message || "unexpected ok",
);

const createBAfter = await sessionB.rpc("create_private_challenge", {
  p_name: `M10 Dual After ${stamp}`,
  p_description: "should fail",
  p_start_date: today,
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert(
  "B create challenge denied after deletion",
  Boolean(createBAfter.error),
  createBAfter.error?.message || "unexpected ok",
);

const getUserB = await sessionB.auth.getUser();
assert(
  "B getUser fails or banned after deletion",
  Boolean(getUserB.error) || !getUserB.data.user,
  getUserB.error?.message || getUserB.data.user?.id,
);

const refreshB = await sessionB.auth.refreshSession();
assert(
  "B refresh fails after deletion",
  Boolean(refreshB.error),
  refreshB.error?.message || "unexpected ok",
);

// Old email login must fail.
const relogin = await userClient().auth.signInWithPassword({ email, password });
assert("old email login fails", Boolean(relogin.error), relogin.error?.message);

// Idempotent complete
const again = await sessionA.rpc("finalize_account_deletion");
assert(
  "A finalize idempotent after complete",
  !again.error && (again.data?.status === "completed" || again.data?.idempotent === true),
  again.error?.message || JSON.stringify(again.data),
);

const outDir = join(process.cwd(), "media", "m10");
mkdirSync(outDir, { recursive: true });
const summary = {
  project: REF,
  stamp,
  email,
  userId,
  challengeId,
  results,
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
};
writeFileSync(join(outDir, "dual-session-evidence.json"), JSON.stringify(summary, null, 2));

const failed = results.filter((r) => !r.ok).length;
console.log(
  `\n${failed === 0 ? "OK" : "FAILED"}  m10-dual-session-evidence ${summary.passed}/${results.length}`,
);
process.exit(failed === 0 ? 0 : 1);
