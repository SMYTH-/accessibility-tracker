/**
 * M2 Postgres evidence against linked non-prod Supabase.
 * Loads .env.local; never prints secrets.
 *
 *   node --env-file=.env.local scripts/m2-postgres-evidence.mjs
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

const now = new Date("2026-11-12T12:00:00Z");
const create = await owner.rpc("create_private_challenge", {
  p_name: "Postgres Portugal",
  p_description: "M2 PG evidence",
  p_start_date: "2026-11-20",
  p_end_date: "2026-12-20",
  p_currency: "GBP",
  p_time_zone: "Europe/London",
  p_now: now.toISOString(),
});
assert("atomic create rpc ok", !create.error && create.data?.challenge?.id, create.error?.message);
const challengeId = create.data?.challenge?.id;
assert(
  "create → Scheduled",
  create.data?.challenge?.lifecycle_status === "Scheduled",
  create.data?.challenge?.lifecycle_status,
);
assert(
  "owner membership approved",
  create.data?.membership?.status === "approved" &&
    create.data?.membership?.role === "owner" &&
    create.data?.membership?.savings_participation_active === false,
);

// Count before fail test
const beforeCount = await admin.from("challenges").select("id", { count: "exact", head: true });
const beforeN = beforeCount.count ?? 0;

const fail = await owner.rpc("create_private_challenge_fail_membership", {
  p_name: "Should Roll Back",
  p_start_date: "2026-11-25",
  p_end_date: "2026-12-25",
  p_currency: "EUR",
  p_time_zone: "Europe/London",
});
assert("fail-membership rpc errors", Boolean(fail.error), fail.error?.message || "no error");

const afterCount = await admin.from("challenges").select("id", { count: "exact", head: true });
const afterN = afterCount.count ?? 0;
assert("no orphan challenge after failed membership", afterN === beforeN, `before=${beforeN} after=${afterN}`);

const orphan = await admin
  .from("challenges")
  .select("id,name")
  .eq("name", "Should Roll Back");
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

const otherMem = await other
  .from("challenge_memberships")
  .select("*")
  .eq("challenge_id", challengeId);
assert(
  "second user cannot read membership rows for foreign challenge",
  !otherMem.error && (otherMem.data?.length ?? 0) === 0,
  otherMem.error?.message || `rows=${otherMem.data?.length}`,
);

// Owner can still read (persist / session)
const ownerRead = await owner.from("challenges").select("*").eq("id", challengeId).single();
assert("owner can read own challenge", !ownerRead.error && ownerRead.data?.id === challengeId, ownerRead.error?.message);

// Fresh client = "app restart" persistence
const owner2 = userClient();
await owner2.auth.signInWithPassword({ email: ownerEmail, password });
const persist = await owner2.from("challenges").select("name,lifecycle_status").eq("id", challengeId).single();
assert(
  "persist across new client session",
  persist.data?.name === "Postgres Portugal",
  persist.error?.message || persist.data?.name,
);

// Lifecycle TZ boundaries via reconcile with frozen clocks
const activeTick = await admin.rpc("reconcile_challenge_lifecycles", {
  p_now: "2026-11-20T00:30:00Z",
});
assert("reconcile rpc ok (start midnight)", !activeTick.error, activeTick.error?.message);
const afterStart = await admin.from("challenges").select("lifecycle_status").eq("id", challengeId).single();
assert(
  "Scheduled → Active at start midnight TZ",
  afterStart.data?.lifecycle_status === "Active",
  afterStart.data?.lifecycle_status,
);

const doneTick = await admin.rpc("reconcile_challenge_lifecycles", {
  p_now: "2026-12-21T00:30:00Z",
});
assert("reconcile rpc ok (after end)", !doneTick.error, doneTick.error?.message);
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
assert(
  "audit has create + transitions",
  (audit.data?.length ?? 0) >= 3,
  `count=${audit.data?.length}`,
);

// Today → Active create
const todayCreate = await owner2.rpc("create_private_challenge", {
  p_name: "Starts Today PG",
  p_description: null,
  p_start_date: "2026-11-12",
  p_end_date: "2026-12-31",
  p_currency: "USD",
  p_time_zone: "Europe/London",
  p_now: now.toISOString(),
});
assert(
  "today start → Active",
  todayCreate.data?.challenge?.lifecycle_status === "Active",
  todayCreate.error?.message || todayCreate.data?.challenge?.lifecycle_status,
);

const failed = results.filter((r) => !r.ok);
mkdirSync(join(process.cwd(), ".data"), { recursive: true });
const out = {
  at: new Date().toISOString(),
  project: REF,
  ownerEmail,
  otherEmail,
  challengeId,
  results,
};
writeFileSync(join(process.cwd(), ".data", "m2-postgres-evidence.json"), JSON.stringify(out, null, 2));
console.log(`\n${failed.length ? failed.length + " failed" : "All " + results.length + " checks passed."}`);
console.log("EVIDENCE_WRITTEN .data/m2-postgres-evidence.json");
process.exit(failed.length ? 1 : 0);
