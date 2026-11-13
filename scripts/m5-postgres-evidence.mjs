/**
 * M5 Postgres evidence against non-prod Supabase gdrkejobqlvtwnlaedpu.
 * Checks: record, idempotent duplicate, amend, reverse, cross-user denial,
 * challenge-local date, inactive/ineligible rejection, eligible totals,
 * pre-assessment split.
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

function ymdInTz(isoOrDate, tz) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function weekMonday(localYmd) {
  const [y, m, d] = localYmd.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(probe);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const dow = map[weekday];
  const dt = new Date(Date.UTC(y, m - 1, d + (1 - dow)));
  return dt.toISOString().slice(0, 10);
}

const stamp = Date.now();
const ownerEmail = `m5.owner.${stamp}@example.com`;
const otherEmail = `m5.other.${stamp}@example.com`;
const password = `M5-Test-${stamp}!`;

const ownerId = await ensureUser(ownerEmail, password, "M5 Owner");
const otherId = await ensureUser(otherEmail, password, "M5 Other");
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

const now = new Date();
const todayLondon = ymdInTz(now, "Europe/London");
const end = new Date(now);
end.setUTCDate(end.getUTCDate() + 120);
const endDate = end.toISOString().slice(0, 10);

// Active challenge (start = today)
const create = await owner.rpc("create_private_challenge", {
  p_name: `M5 Evidence ${stamp}`,
  p_description: "Contribution recording",
  p_start_date: todayLondon,
  p_end_date: endDate,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("create Active challenge", !create.error, create.error?.message);
const challengeId = create.data?.challenge?.id;
assert("challenge id", Boolean(challengeId));
assert(
  "lifecycle Active",
  create.data?.challenge?.lifecycle_status === "Active",
  create.data?.challenge?.lifecycle_status,
);

const beforeSetup = await owner.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 5000,
  p_idempotency_key: `early-${stamp}`,
});
assert("reject before setup", Boolean(beforeSetup.error), beforeSetup.error?.message);

const act = await owner.rpc("activate_savings_setup", {
  p_challenge_id: challengeId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
});
assert("activate savings", !act.error, act.error?.message);

const zero = await owner.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 0,
  p_idempotency_key: `zero-${stamp}`,
});
assert("reject zero amount", Boolean(zero.error));

const otherRec = await other.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 5000,
  p_idempotency_key: `other-${stamp}`,
});
assert("reject non-member", Boolean(otherRec.error));

const idem = `idem-${stamp}`;
const rec = await owner.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 5000,
  p_idempotency_key: idem,
});
assert("record ok", !rec.error, rec.error?.message);
assert("amount 5000", Number(rec.data?.contribution?.amount_minor) === 5000);
assert(
  "self-reported",
  rec.data?.contribution?.source_label === "self-reported",
);
assert(
  "date = challenge-local today",
  rec.data?.contribution?.contribution_date === todayLondon,
  rec.data?.contribution?.contribution_date,
);
assert(
  "week start monday",
  rec.data?.contribution?.week_start === weekMonday(todayLondon),
  rec.data?.contribution?.week_start,
);
assert("not replayed", rec.data?.replayed === false);
assert("eligible 5000", Number(rec.data?.totals?.eligible_total_minor) === 5000);
const contributionId = rec.data?.contribution?.id;

const dup = await owner.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 5000,
  p_idempotency_key: idem,
});
assert("duplicate submit ok", !dup.error, dup.error?.message);
assert("replayed true", dup.data?.replayed === true);
assert("same contribution id", dup.data?.contribution?.id === contributionId);
assert(
  "no double count",
  Number(dup.data?.totals?.eligible_total_minor) === 5000,
);

const second = await owner.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 4000,
  p_idempotency_key: `idem2-${stamp}`,
});
assert("second record", !second.error, second.error?.message);
assert(
  "eligible 9000",
  Number(second.data?.totals?.eligible_total_minor) === 9000,
);
const secondId = second.data?.contribution?.id;

const amend = await owner.rpc("amend_contribution", {
  p_contribution_id: contributionId,
  p_amount_minor: 5500,
});
assert("amend ok", !amend.error, amend.error?.message);
assert("amended 5500", Number(amend.data?.contribution?.amount_minor) === 5500);
assert(
  "amend date preserved",
  amend.data?.contribution?.contribution_date === todayLondon,
);
assert(
  "amend week preserved",
  amend.data?.contribution?.week_start === weekMonday(todayLondon),
);
assert(
  "eligible after amend 9500",
  Number(amend.data?.totals?.eligible_total_minor) === 9500,
);

const otherAmend = await other.rpc("amend_contribution", {
  p_contribution_id: contributionId,
  p_amount_minor: 100,
});
assert("cross-user amend denied", Boolean(otherAmend.error));

const otherRev = await other.rpc("reverse_contribution", {
  p_contribution_id: secondId,
});
assert("cross-user reverse denied", Boolean(otherRev.error));

const rev = await owner.rpc("reverse_contribution", {
  p_contribution_id: secondId,
});
assert("reverse ok", !rev.error, rev.error?.message);
assert("status reversed", rev.data?.contribution?.status === "reversed");
assert(
  "eligible after reverse 5500",
  Number(rev.data?.totals?.eligible_total_minor) === 5500,
);
assert(
  "reverse date preserved",
  rev.data?.contribution?.contribution_date === todayLondon,
);

const totals = await owner.rpc("own_eligible_totals", { p_challenge_id: challengeId });
assert("own totals", !totals.error, totals.error?.message);
assert("totals 5500", Number(totals.data?.eligible_total_minor) === 5500);

const otherTotals = await other.rpc("own_eligible_totals", {
  p_challenge_id: challengeId,
});
assert("other totals denied", Boolean(otherTotals.error));

const rls = await other.from("contributions").select("*").eq("challenge_id", challengeId);
assert(
  "RLS hides other contributions",
  !rls.error && (rls.data?.length ?? 0) === 0,
);

const list = await owner.rpc("list_own_contributions", { p_challenge_id: challengeId });
assert("list own", !list.error);
assert("two contributions", (list.data?.contributions?.length ?? 0) === 2);
assert(
  "audit trail present",
  (list.data?.revisions?.length ?? 0) >= 3,
);

// Scheduled (inactive) challenge — activate savings but cannot record
const futStart = new Date(now);
futStart.setUTCDate(futStart.getUTCDate() + 30);
const futEnd = new Date(futStart);
futEnd.setUTCDate(futEnd.getUTCDate() + 60);
const sched = await owner.rpc("create_private_challenge", {
  p_name: `M5 Scheduled ${stamp}`,
  p_description: null,
  p_start_date: futStart.toISOString().slice(0, 10),
  p_end_date: futEnd.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("scheduled create", !sched.error, sched.error?.message);
const schedId = sched.data?.challenge?.id;
assert(
  "scheduled status",
  sched.data?.challenge?.lifecycle_status === "Scheduled",
);
const schedAct = await owner.rpc("activate_savings_setup", {
  p_challenge_id: schedId,
  p_target_minor: 100000,
  p_weekly_commitment_minor: 5000,
});
assert("scheduled activate ok", !schedAct.error, schedAct.error?.message);
const schedRec = await owner.rpc("record_contribution", {
  p_challenge_id: schedId,
  p_amount_minor: 1000,
  p_idempotency_key: `sched-${stamp}`,
});
assert(
  "reject inactive challenge",
  Boolean(schedRec.error),
  schedRec.error?.message,
);

// Challenge-local date via frozen clock (service_role)
const todayAuckland = ymdInTz(now, "Pacific/Auckland");
const aucklandCreate = await owner.rpc("create_private_challenge", {
  p_name: `M5 Auckland ${stamp}`,
  p_description: null,
  p_start_date: todayAuckland,
  p_end_date: endDate,
  p_currency: "NZD",
  p_time_zone: "Pacific/Auckland",
});
assert("auckland create", !aucklandCreate.error, aucklandCreate.error?.message);
const aucklandId = aucklandCreate.data?.challenge?.id;
assert("auckland id", Boolean(aucklandId));

// Widen period so frozen Nov dates are in-period; keep Active.
const aukForce = await admin
  .from("challenges")
  .update({
    start_date: "2026-11-01",
    end_date: "2026-12-31",
    lifecycle_status: "Active",
    time_zone: "Pacific/Auckland",
    currency: "NZD",
  })
  .eq("id", aucklandId)
  .select("id");
assert("auckland force Active window", !aukForce.error && (aukForce.data?.length ?? 0) === 1);

const aukAct = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: aucklandId,
  p_user_id: ownerId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  // Friday 13 Nov 2026 11:30 UTC = Sat 14 Nov morning Auckland → first assessed Mon 16
  p_now: "2026-11-13T11:30:00.000Z",
});
assert("auckland activate", !aukAct.error, aukAct.error?.message);

// 2026-11-12T23:30Z → still 12 Nov London, already 13 Nov Auckland
const frozen = await admin.rpc("record_contribution_at", {
  p_challenge_id: aucklandId,
  p_user_id: ownerId,
  p_amount_minor: 2500,
  p_idempotency_key: `auk-${stamp}`,
  p_now: "2026-11-12T23:30:00.000Z",
});
assert("frozen auckland record", !frozen.error, frozen.error?.message);
assert(
  "auckland local date 13 Nov",
  frozen.data?.contribution?.contribution_date === "2026-11-13",
  frozen.data?.contribution?.contribution_date,
);
assert(
  "auckland week Mon 9 Nov",
  frozen.data?.contribution?.week_start === "2026-11-09",
  frozen.data?.contribution?.week_start,
);

const deniedFrozen = await owner.rpc("record_contribution_at", {
  p_challenge_id: aucklandId,
  p_user_id: ownerId,
  p_amount_minor: 1,
  p_idempotency_key: `denied-${stamp}`,
  p_now: "2026-11-12T23:30:00.000Z",
});
assert("frozen helper denied to authenticated", Boolean(deniedFrozen.error));

// Pre-assessment: first assessed week after contribution week
const preCreate = await owner.rpc("create_private_challenge", {
  p_name: `M5 PreAssess ${stamp}`,
  p_description: null,
  p_start_date: todayLondon,
  p_end_date: endDate,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("pre-assess create", !preCreate.error, preCreate.error?.message);
const preId = preCreate.data?.challenge?.id;
await admin
  .from("challenges")
  .update({ lifecycle_status: "Active", start_date: "2026-11-01", end_date: "2026-12-31" })
  .eq("id", preId);

// Activate Friday → first assessed Mon 16 Nov
const preAct = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: preId,
  p_user_id: ownerId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-11-13T12:00:00.000Z",
});
assert("pre-assess activate", !preAct.error, preAct.error?.message);
assert(
  "first assessed Mon 16",
  preAct.data?.setup?.first_assessed_week_start === "2026-11-16",
  preAct.data?.setup?.first_assessed_week_start,
);

const preRec = await admin.rpc("record_contribution_at", {
  p_challenge_id: preId,
  p_user_id: ownerId,
  p_amount_minor: 3000,
  p_idempotency_key: `pre-${stamp}`,
  p_now: "2026-11-13T15:00:00.000Z",
});
assert("pre-assess record", !preRec.error, preRec.error?.message);
assert(
  "pre_assessment_minor 3000",
  Number(preRec.data?.totals?.pre_assessment_minor) === 3000,
  JSON.stringify(preRec.data?.totals),
);
assert(
  "commitment_eligible 0 before first week",
  Number(preRec.data?.totals?.commitment_eligible_minor) === 0,
);
assert(
  "eligible total still includes pre-assessment",
  Number(preRec.data?.totals?.eligible_total_minor) === 3000,
);

const failed = results.filter((r) => !r.ok).length;
mkdirSync(join(process.cwd(), ".data"), { recursive: true });
writeFileSync(
  join(process.cwd(), ".data", "m5-postgres-evidence.json"),
  JSON.stringify({ failed, results, stamp }, null, 2),
);
console.log(failed ? `FAILED ${failed}/${results.length}` : `ALL PASS ${results.length}/${results.length}`);
process.exit(failed ? 1 : 0);
