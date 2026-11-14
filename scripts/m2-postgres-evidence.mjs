/**
 * M2 Postgres evidence against linked non-prod Supabase.
 * Loads .env.local; never prints secrets.
 *
 * Live create/reconcile use DB time only. Frozen-clock helper = service_role tests.
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

async function ensureUser(email, password) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: email.split("@")[0] },
    });
    return existing.id;
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: email.split("@")[0] },
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

const stamp = Date.now();
const ownerEmail = `m2.owner.${stamp}@example.com`;
const otherEmail = `m2.other.${stamp}@example.com`;
const password = `M2-Test-${stamp}!`;

const ownerId = await ensureUser(ownerEmail, password);
const otherId = await ensureUser(otherEmail, password);
assert("created/confirmed owner+other users", Boolean(ownerId && otherId));

const owner = userClient();
const ownerSign = await owner.auth.signInWithPassword({ email: ownerEmail, password });
assert("owner supabase sign-in", !ownerSign.error && Boolean(ownerSign.data.session), ownerSign.error?.message);

// --- Clock override denial (authenticated) ---
const clockCreate = await owner.rpc("create_private_challenge", {
  p_name: "Clock Override Attempt",
  p_description: null,
  p_start_date: "2099-01-01",
  p_end_date: "2099-02-01",
  p_currency: "GBP",
  p_time_zone: "Europe/London",
  p_now: "2000-01-01T00:00:00Z",
});
// PostgREST may ignore unknown keys OR error depending on version; either way lifecycle must not use 2000.
assert(
  "signed-in caller cannot override create clock via p_now",
  Boolean(clockCreate.error) ||
    (clockCreate.data?.challenge?.lifecycle_status === "Scheduled" &&
      !String(clockCreate.data?.challenge?.created_at || "").startsWith("2000")),
  clockCreate.error?.message ||
    `status=${clockCreate.data?.challenge?.lifecycle_status} created=${clockCreate.data?.challenge?.created_at}`,
);

const clockReconcile = await owner.rpc("reconcile_challenge_lifecycles", {
  p_now: "2099-12-31T00:00:00Z",
});
assert(
  "signed-in caller cannot pass p_now to live reconcile",
  Boolean(clockReconcile.error) || clockReconcile.data?.transitioned === 0 || clockReconcile.data != null,
  clockReconcile.error?.message || JSON.stringify(clockReconcile.data),
);
// Stronger: frozen-clock helper must be denied for authenticated
const frozenDenied = await owner.rpc("reconcile_challenge_lifecycles_at", {
  p_now: "2099-12-31T00:00:00Z",
});
assert(
  "signed-in caller denied frozen-clock reconcile helper",
  Boolean(frozenDenied.error),
  frozenDenied.error?.message || "unexpectedly allowed",
);

const failDenied = await owner.rpc("create_private_challenge_fail_membership", {
  p_name: "Auth Fail Helper",
  p_start_date: "2099-03-01",
  p_end_date: "2099-04-01",
  p_currency: "EUR",
  p_time_zone: "Europe/London",
});
assert(
  "signed-in caller denied forced-rollback test helper",
  Boolean(failDenied.error),
  failDenied.error?.message || "unexpectedly allowed",
);

// Clean up accidental create if PostgREST ignored p_now and created
if (clockCreate.data?.challenge?.id) {
  await admin.from("challenges").delete().eq("id", clockCreate.data.challenge.id);
}

// Live create (DB time only) — use far-future dates so status is Scheduled under real now()
const create = await owner.rpc("create_private_challenge", {
  p_name: "Postgres Portugal",
  p_description: "M2 PG evidence",
  p_start_date: "2099-01-10",
  p_end_date: "2099-02-10",
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("atomic create rpc ok (DB time)", !create.error && create.data?.challenge?.id, create.error?.message);
const challengeId = create.data?.challenge?.id;
assert(
  "create future start → Scheduled",
  create.data?.challenge?.lifecycle_status === "Scheduled",
  create.data?.challenge?.lifecycle_status,
);
assert(
  "owner membership approved",
  create.data?.membership?.status === "approved" &&
    create.data?.membership?.role === "owner" &&
    create.data?.membership?.savings_participation_active === false,
);

// Orphan rollback via service_role test helper only
const beforeCount = await admin.from("challenges").select("id", { count: "exact", head: true });
const beforeN = beforeCount.count ?? 0;
const fail = await admin.rpc("create_private_challenge_fail_membership", {
  p_name: "Should Roll Back",
  p_start_date: "2099-03-01",
  p_end_date: "2099-04-01",
  p_currency: "EUR",
  p_time_zone: "Europe/London",
  p_owner_user_id: ownerId,
});
assert("fail-membership rpc errors (service_role)", Boolean(fail.error), fail.error?.message || "no error");
const afterCount = await admin.from("challenges").select("id", { count: "exact", head: true });
const afterN = afterCount.count ?? 0;
assert("no orphan challenge after failed membership", afterN === beforeN, `before=${beforeN} after=${afterN}`);
const orphan = await admin.from("challenges").select("id,name").eq("name", "Should Roll Back");
assert("orphan name absent", (orphan.data?.length ?? 0) === 0, JSON.stringify(orphan.data));

// Second user cannot access
const other = userClient();
const otherSign = await other.auth.signInWithPassword({ email: otherEmail, password });
assert("other supabase sign-in", !otherSign.error && Boolean(otherSign.data.session), otherSign.error?.message);
const otherRead = await other.from("challenges").select("*").eq("id", challengeId);
assert(
  "second user cannot read private challenge (RLS)",
  !otherRead.error && (otherRead.data?.length ?? 0) === 0,
  otherRead.error?.message || `rows=${otherRead.data?.length}`,
);

const ownerRead = await owner.from("challenges").select("*").eq("id", challengeId).single();
assert("owner can read own challenge", !ownerRead.error && ownerRead.data?.id === challengeId, ownerRead.error?.message);

const owner2 = userClient();
await owner2.auth.signInWithPassword({ email: ownerEmail, password });
const persist = await owner2.from("challenges").select("name,lifecycle_status").eq("id", challengeId).single();
assert(
  "persist across new client session",
  persist.data?.name === "Postgres Portugal",
  persist.error?.message || persist.data?.name,
);

// Lifecycle TZ boundaries via **test-only** frozen-clock helper (service_role)
const activeTick = await admin.rpc("reconcile_challenge_lifecycles_at", {
  p_now: "2099-01-10T00:30:00Z",
});
assert("frozen-clock helper ok (start midnight)", !activeTick.error, activeTick.error?.message);
const afterStart = await admin.from("challenges").select("lifecycle_status").eq("id", challengeId).single();
assert(
  "Scheduled → Active at start midnight TZ",
  afterStart.data?.lifecycle_status === "Active",
  afterStart.data?.lifecycle_status,
);

const doneTick = await admin.rpc("reconcile_challenge_lifecycles_at", {
  p_now: "2099-02-11T00:30:00Z",
});
assert("frozen-clock helper ok (after end)", !doneTick.error, doneTick.error?.message);
const afterEnd = await admin.from("challenges").select("lifecycle_status").eq("id", challengeId).single();
assert(
  "Active → Completed after end midnight TZ",
  afterEnd.data?.lifecycle_status === "Completed",
  afterEnd.data?.lifecycle_status,
);

const audit = await admin
  .from("challenge_lifecycle_audit")
  .select("action,from_status,to_status")
  .eq("challenge_id", challengeId)
  .order("at", { ascending: true });
assert("audit has create + transitions", (audit.data?.length ?? 0) >= 3, `count=${audit.data?.length}`);

// Live reconcile (no args) still callable
const liveTick = await owner2.rpc("reconcile_challenge_lifecycles");
assert("live reconcile uses DB time (no args)", !liveTick.error, liveTick.error?.message);

// Today → Active under real DB time
const todayYmd = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const endYmd = "2099-12-31";
const todayCreate = await owner2.rpc("create_private_challenge", {
  p_name: "Starts Today PG",
  p_description: null,
  p_start_date: todayYmd,
  p_end_date: endYmd,
  p_currency: "USD",
  p_time_zone: "Europe/London",
});
assert(
  "today start → Active (DB time)",
  todayCreate.data?.challenge?.lifecycle_status === "Active",
  todayCreate.error?.message || todayCreate.data?.challenge?.lifecycle_status,
);

const failed = results.filter((r) => !r.ok);
mkdirSync(join(process.cwd(), ".data"), { recursive: true });
writeFileSync(
  join(process.cwd(), ".data", "m2-postgres-evidence.json"),
  JSON.stringify({ at: new Date().toISOString(), project: REF, ownerEmail, otherEmail, challengeId, results }, null, 2),
);
console.log(`\n${failed.length ? failed.length + " failed" : "All " + results.length + " checks passed."}`);
console.log("EVIDENCE_WRITTEN .data/m2-postgres-evidence.json");
process.exit(failed.length ? 1 : 0);
