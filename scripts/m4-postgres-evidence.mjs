/**
 * M4 Postgres evidence against non-prod Supabase gdrkejobqlvtwnlaedpu.
 * Requires gitignored .env.local with URL + anon + service role.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REF = "gdrkejobqlvtwnlaedpu";

if (!url?.includes(REF) || !anon || !service) {
  console.error("MISSING_ENV_OR_WRONG_PROJECT");
  console.error(
    "Need in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY",
  );
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
const ownerEmail = `m4.owner.${stamp}@example.com`;
const otherEmail = `m4.other.${stamp}@example.com`;
const password = `M4-Test-${stamp}!`;

const ownerId = await ensureUser(ownerEmail, password, "M4 Owner");
const otherId = await ensureUser(otherEmail, password, "M4 Other");
assert("users ready", Boolean(ownerId && otherId));

const owner = userClient();
const other = userClient();
assert(
  "owner sign-in",
  !(await owner.auth.signInWithPassword({ email: ownerEmail, password })).error,
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
  p_name: `M4 Evidence ${stamp}`,
  p_description: "Savings setup evidence",
  p_start_date: startDate,
  p_end_date: endDate,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("create challenge", !create.error, create.error?.message);
const challengeId = create.data?.challenge?.id;
assert("challenge id", Boolean(challengeId));
assert(
  "inactive at create",
  create.data?.membership?.savings_participation_active === false,
);

const zero = await owner.rpc("activate_savings_setup", {
  p_challenge_id: challengeId,
  p_target_minor: 0,
  p_weekly_commitment_minor: 5000,
});
assert("reject zero target", Boolean(zero.error));

const otherAct = await other.rpc("activate_savings_setup", {
  p_challenge_id: challengeId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
});
assert("reject non-member", Boolean(otherAct.error));

const act = await owner.rpc("activate_savings_setup", {
  p_challenge_id: challengeId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
});
assert("activate ok", !act.error, act.error?.message);
assert("active flag", act.data?.membership?.savings_participation_active === true);
assert("target minor", Number(act.data?.setup?.target_minor) === 200000);
assert("weekly minor", Number(act.data?.setup?.weekly_commitment_minor) === 5000);
assert("first assessed week set", Boolean(act.data?.setup?.first_assessed_week_start));

const own = await owner.rpc("get_own_savings_setup", { p_challenge_id: challengeId });
assert("get own setup", !own.error && own.data?.setup);
assert(
  "other cannot get setup",
  Boolean((await other.rpc("get_own_savings_setup", { p_challenge_id: challengeId })).error),
);

const otherRead = await other.from("membership_savings_setup").select("*").eq("challenge_id", challengeId);
assert(
  "RLS hides other members' setup",
  !otherRead.error && (otherRead.data?.length ?? 0) === 0,
);

const dup = await owner.rpc("activate_savings_setup", {
  p_challenge_id: challengeId,
  p_target_minor: 100000,
  p_weekly_commitment_minor: 4000,
});
assert("reject second activate", Boolean(dup.error));

const upd = await owner.rpc("update_savings_target", {
  p_challenge_id: challengeId,
  p_target_minor: 250000,
});
assert(
  "signed-in post-activation target update rejected",
  Boolean(upd.error),
  upd.error?.message,
);
assert(
  "park reason TARGET_CHANGE_DEFERRED",
  Boolean(upd.error?.message?.includes("TARGET_CHANGE_DEFERRED")),
  upd.error?.message,
);
const afterPark = await owner.rpc("get_own_savings_setup", { p_challenge_id: challengeId });
assert(
  "target unchanged after parked signed-in update",
  Number(afterPark.data?.setup?.target_minor) === 200000,
);

// Frozen-clock Mon vs Tue–Sun via service_role helper
const create2 = await owner.rpc("create_private_challenge", {
  p_name: `M4 Week Rule ${stamp}`,
  p_description: null,
  p_start_date: startDate,
  p_end_date: endDate,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
const c2 = create2.data?.challenge?.id;
assert("second challenge", Boolean(c2));

const friAt = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: c2,
  p_user_id: ownerId,
  p_target_minor: 150000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-11-13T12:00:00.000Z",
});
assert("frozen Fri activate", !friAt.error, friAt.error?.message);
assert(
  "Fri → Mon 16 Nov",
  friAt.data?.setup?.first_assessed_week_start === "2026-11-16",
  friAt.data?.setup?.first_assessed_week_start,
);

const create3 = await owner.rpc("create_private_challenge", {
  p_name: `M4 Mon Rule ${stamp}`,
  p_description: null,
  p_start_date: startDate,
  p_end_date: endDate,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
const c3 = create3.data?.challenge?.id;
const monAt = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: c3,
  p_user_id: ownerId,
  p_target_minor: 150000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-11-16T10:00:00.000Z",
});
assert("frozen Mon activate", !monAt.error, monAt.error?.message);
assert(
  "Mon → Mon 16 Nov current week",
  monAt.data?.setup?.first_assessed_week_start === "2026-11-16",
);

// Authenticated caller cannot use frozen helper
const denied = await owner.rpc("activate_savings_setup_at", {
  p_challenge_id: c3,
  p_user_id: ownerId,
  p_target_minor: 1,
  p_weekly_commitment_minor: 1,
  p_now: "2026-11-16T10:00:00.000Z",
});
assert("frozen helper denied to authenticated", Boolean(denied.error));

const audit = await owner
  .from("savings_setup_audit")
  .select("action")
  .eq("challenge_id", challengeId);
assert(
  "audit has activate only (no signed-in target_change)",
  (audit.data || []).some((r) => r.action === "activate") &&
    !(audit.data || []).some((r) => r.action === "target_change"),
);

// Service-role test helper may still apply a prospective change for evidence infra.
const svcUpd = await admin.rpc("update_savings_target_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ownerId,
  p_target_minor: 250000,
  p_now: "2026-11-13T12:00:00.000Z",
});
assert("service-role test helper update ok", !svcUpd.error, svcUpd.error?.message);
assert("service helper new target", Number(svcUpd.data?.setup?.target_minor) === 250000);

const deniedSvc = await owner.rpc("update_savings_target_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ownerId,
  p_target_minor: 300000,
  p_now: "2026-11-13T12:00:00.000Z",
});
assert("service helper denied to authenticated", Boolean(deniedSvc.error));

const failed = results.filter((r) => !r.ok).length;
mkdirSync(join(process.cwd(), ".data"), { recursive: true });
writeFileSync(
  join(process.cwd(), ".data", "m4-postgres-evidence.json"),
  JSON.stringify({ failed, results, stamp }, null, 2),
);
console.log(failed ? `FAILED ${failed}/${results.length}` : `ALL PASS ${results.length}/${results.length}`);
process.exit(failed ? 1 : 0);
