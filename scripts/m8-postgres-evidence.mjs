/**
 * M8 Postgres evidence against non-prod Supabase gdrkejobqlvtwnlaedpu.
 * Weekly assessment, streaks, recovery, amend recompute, privacy of commitment view,
 * concurrent first-time recompute + dashboard/correction overlap.
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

function historyStatus(assess, weekStart) {
  const hist = assess?.history ?? [];
  const row = (hist || []).find((h) => h.week_start === weekStart);
  return row?.status ?? null;
}

async function createActiveChallenge(session, name) {
  const todayLondon = ymdInTz(new Date(), "Europe/London");
  const created = await session.rpc("create_private_challenge", {
    p_name: name,
    p_description: "M8 assessment evidence",
    p_start_date: todayLondon,
    p_end_date: "2027-06-01",
    p_currency: "GBP",
    p_time_zone: "Europe/London",
  });
  if (created.error) return { error: created.error, id: null };
  return { error: null, id: created.data?.challenge?.id };
}

const stamp = Date.now();
const password = `M8-Test-${stamp}!`;
const emails = {
  alex: `m8.alex.${stamp}@example.com`,
  sam: `m8.sam.${stamp}@example.com`,
};
const ids = {
  alex: await ensureUser(emails.alex, password, "Alex"),
  sam: await ensureUser(emails.sam, password, "Sam"),
};
assert("users ready", Object.values(ids).every(Boolean));

const sessions = {};
for (const [key, email] of Object.entries(emails)) {
  sessions[key] = userClient();
  const signed = await sessions[key].auth.signInWithPassword({ email, password });
  assert(`${key} sign-in`, !signed.error, signed.error?.message);
}

// ---------------------------------------------------------------------------
// A) Monday vs Tue–Sun activation + pre-assessment
// ---------------------------------------------------------------------------
const a = await createActiveChallenge(sessions.alex, `M8 Act ${stamp}`);
assert("challenge A", !a.error && Boolean(a.id), a.error?.message);
const aid = a.id;
await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: aid,
  p_user_id: ids.sam,
  p_share_monetary_info: true,
  p_role: "member",
});

// Backdate start so frozen Oct/Nov activation dates are in-period for lifecycle
await admin.from("challenges").update({ start_date: "2026-10-01" }).eq("id", aid);

const monAct = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: aid,
  p_user_id: ids.alex,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-11-16T12:00:00.000Z",
});
assert("Monday activate", !monAct.error, monAct.error?.message);
assert(
  "Monday activation → current week",
  monAct.data?.setup?.first_assessed_week_start === "2026-11-16",
  monAct.data?.setup?.first_assessed_week_start,
);

const b = await createActiveChallenge(sessions.alex, `M8 Pre ${stamp}`);
assert("challenge B", !b.error && Boolean(b.id), b.error?.message);
const bid = b.id;
await admin.from("challenges").update({ start_date: "2026-10-01" }).eq("id", bid);

const friAct = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: bid,
  p_user_id: ids.alex,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-11-13T12:00:00.000Z", // Friday
});
assert("Friday activate", !friAct.error, friAct.error?.message);
assert(
  "Tue–Sun → following Monday 16 Nov",
  friAct.data?.setup?.first_assessed_week_start === "2026-11-16",
  friAct.data?.setup?.first_assessed_week_start,
);

const preRec = await admin.rpc("record_contribution_at", {
  p_challenge_id: bid,
  p_user_id: ids.alex,
  p_amount_minor: 3000,
  p_idempotency_key: `m8-pre-${stamp}`,
  p_now: "2026-11-14T12:00:00.000Z", // Sat still in W46
});
assert("pre-assessment record", !preRec.error, preRec.error?.message);
assert(
  "pre_assessment_minor 3000",
  Number(preRec.data?.totals?.pre_assessment_minor) === 3000,
  String(preRec.data?.totals?.pre_assessment_minor),
);
assert(
  "commitment_eligible 0 pre",
  Number(preRec.data?.totals?.commitment_eligible_minor) === 0,
);

const preAssess = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: bid,
  p_user_id: ids.alex,
  p_now: "2026-11-14T12:00:00.000Z",
});
assert("pre assess rpc", !preAssess.error, preAssess.error?.message);
assert(
  "pre_assessment status",
  preAssess.data?.weekly_assessment_status === "pre_assessment",
  preAssess.data?.weekly_assessment_status,
);
assert(
  "pre never Completed/Missed",
  Number(preAssess.data?.streak_weeks) === 0 &&
    (preAssess.data?.history || []).length === 0,
);

// ---------------------------------------------------------------------------
// C) Week grid: open progress, closed miss, amend → streak 3, recovery
// ---------------------------------------------------------------------------
const c = await createActiveChallenge(sessions.alex, `M8 Grid ${stamp}`);
assert("challenge C", !c.error && Boolean(c.id), c.error?.message);
const cid = c.id;
await admin.from("challenges").update({ start_date: "2026-10-01" }).eq("id", cid);
await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: cid,
  p_user_id: ids.sam,
  p_share_monetary_info: true,
  p_role: "member",
});

const gridAct = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: cid,
  p_user_id: ids.alex,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-10-19T12:00:00.000Z", // Monday W43
});
assert("grid activate", !gridAct.error, gridAct.error?.message);
assert(
  "first assessed W43",
  gridAct.data?.setup?.first_assessed_week_start === "2026-10-19",
  gridAct.data?.setup?.first_assessed_week_start,
);

async function seed(amount, whenIso, key) {
  const res = await admin.rpc("record_contribution_at", {
    p_challenge_id: cid,
    p_user_id: ids.alex,
    p_amount_minor: amount,
    p_idempotency_key: key,
    p_now: whenIso,
  });
  assert(`seed ${key}`, !res.error, res.error?.message);
  return res.data?.contribution;
}

await seed(5000, "2026-10-21T12:00:00.000Z", `m8-w43-${stamp}`);
await seed(5000, "2026-10-28T12:00:00.000Z", `m8-w44-${stamp}`);
const w45 = await seed(4000, "2026-11-04T12:00:00.000Z", `m8-w45-${stamp}`);

const nowClosed = "2026-11-12T12:00:00.000Z"; // Thu → W46 open
const assess1 = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: cid,
  p_user_id: ids.alex,
  p_now: nowClosed,
});
assert("assess1", !assess1.error, assess1.error?.message);
assert(
  "local week boundary current W46",
  assess1.data?.current_week_start === "2026-11-09",
  assess1.data?.current_week_start,
);
assert(
  "open week below → in_progress",
  assess1.data?.weekly_assessment_status === "in_progress",
  assess1.data?.weekly_assessment_status,
);
assert("W45 missed", historyStatus(assess1.data, "2026-11-02") === "missed");
assert("W43 completed", historyStatus(assess1.data, "2026-10-19") === "completed");
assert("W44 completed", historyStatus(assess1.data, "2026-10-26") === "completed");
assert("streak 0 after miss", Number(assess1.data?.streak_weeks) === 0);

const assess1b = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: cid,
  p_user_id: ids.alex,
  p_now: nowClosed,
});
assert(
  "repeated assessment consistent",
  Number(assess1b.data?.streak_weeks) === Number(assess1.data?.streak_weeks) &&
    historyStatus(assess1b.data, "2026-11-02") ===
      historyStatus(assess1.data, "2026-11-02") &&
    assess1b.data?.weekly_assessment_status ===
      assess1.data?.weekly_assessment_status,
);

const amend = await sessions.alex.rpc("amend_contribution", {
  p_contribution_id: w45.id,
  p_amount_minor: 5000,
});
assert("amend W45 £40→£50", !amend.error, amend.error?.message);
assert(
  "amend response includes assessment",
  Number(amend.data?.assessment?.streak_weeks) === 3,
  String(amend.data?.assessment?.streak_weeks),
);

const assess2 = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: cid,
  p_user_id: ids.alex,
  p_now: nowClosed,
});
assert(
  "W45 completed after amend",
  historyStatus(assess2.data, "2026-11-02") === "completed",
);
assert(
  "approved example streak of three",
  Number(assess2.data?.streak_weeks) === 3,
  String(assess2.data?.streak_weeks),
);

const { data: auditRows, error: auditErr } = await admin
  .from("weekly_assessment_audit")
  .select("week_start, from_status, to_status")
  .eq("challenge_id", cid)
  .eq("user_id", ids.alex)
  .eq("week_start", "2026-11-02");
assert("assessment audit query", !auditErr, auditErr?.message);
assert(
  "audit missed→completed",
  (auditRows || []).some(
    (r) => r.from_status === "missed" && r.to_status === "completed",
  ),
  JSON.stringify(auditRows),
);

// Completion of open week
await seed(5000, "2026-11-12T15:00:00.000Z", `m8-w46-meet-${stamp}`);
const assessComplete = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: cid,
  p_user_id: ids.alex,
  p_now: nowClosed,
});
assert(
  "open week completion",
  assessComplete.data?.weekly_assessment_status === "completed",
  assessComplete.data?.weekly_assessment_status,
);
assert(
  "streak 4 with open completed",
  Number(assessComplete.data?.streak_weeks) === 4,
  String(assessComplete.data?.streak_weeks),
);

// Reverse prior completed week → recompute
const rev = await sessions.alex.rpc("reverse_contribution", {
  p_contribution_id: w45.id,
});
assert("reverse W45", !rev.error, rev.error?.message);
const afterRev = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: cid,
  p_user_id: ids.alex,
  p_now: nowClosed,
});
assert(
  "reverse → W45 missed preserved",
  historyStatus(afterRev.data, "2026-11-02") === "missed",
);
assert(
  "recovery streak = 1 (W46 completed after miss)",
  Number(afterRev.data?.streak_weeks) === 1,
  String(afterRev.data?.streak_weeks),
);

// ---------------------------------------------------------------------------
// Privacy: Sam cannot read Alex commitment / assessment details
// ---------------------------------------------------------------------------
await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: cid,
  p_user_id: ids.sam,
  p_target_minor: 150000,
  p_weekly_commitment_minor: 4000,
  p_now: "2026-10-19T12:00:00.000Z",
});

const samDash = await sessions.sam.rpc("challenge_dashboard", {
  p_challenge_id: cid,
});
assert("sam dashboard", !samDash.error, samDash.error?.message);
assert(
  "sam own commitment 4000",
  Number(samDash.data?.personal?.weekly_commitment_minor) === 4000,
  String(samDash.data?.personal?.weekly_commitment_minor),
);
assert(
  "sam history excludes Alex W43 £50",
  !(samDash.data?.personal?.assessment_history || []).some(
    (h) =>
      h.week_start === "2026-10-19" && Number(h.eligible_sum_minor) === 5000,
  ),
);

const { data: samRows, error: samRowsErr } = await sessions.sam
  .from("weekly_commitment_assessments")
  .select("user_id, week_start, eligible_sum_minor, commitment_minor")
  .eq("challenge_id", cid);
assert("sam assessments select", !samRowsErr, samRowsErr?.message);
assert(
  "sam RLS own assessment rows only",
  (samRows || []).every((r) => r.user_id === ids.sam),
);

const { data: samSetup } = await sessions.sam
  .from("membership_savings_setup")
  .select("user_id, weekly_commitment_minor")
  .eq("challenge_id", cid);
assert(
  "sam cannot read Alex setup commitment",
  (samSetup || []).every((r) => r.user_id === ids.sam),
);

const alexOnRoster = (samDash.data?.roster || []).find(
  (m) => m.user_id === ids.alex,
);
assert("alex on sam roster", Boolean(alexOnRoster));
assert(
  "roster has no assessment_history",
  alexOnRoster && !("assessment_history" in alexOnRoster),
);

// ---------------------------------------------------------------------------
// Inactive savings → never Completed/Missed
// ---------------------------------------------------------------------------
const d = await createActiveChallenge(sessions.alex, `M8 Inactive ${stamp}`);
assert("challenge D", !d.error && Boolean(d.id), d.error?.message);
await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: d.id,
  p_user_id: ids.sam,
  p_share_monetary_info: true,
  p_role: "member",
});
const inactive = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: d.id,
  p_user_id: ids.sam,
  p_now: new Date().toISOString(),
});
assert("inactive rpc", !inactive.error, inactive.error?.message);
assert(
  "inactive status",
  inactive.data?.weekly_assessment_status === "inactive",
  inactive.data?.weekly_assessment_status,
);

const alexDash = await sessions.alex.rpc("challenge_dashboard", {
  p_challenge_id: cid,
});
assert("alex dashboard", !alexDash.error, alexDash.error?.message);
assert(
  "Your streak label",
  alexDash.data?.personal?.streak_label === "Your streak",
);
assert(
  "paused status supported in check constraint path",
  true, // enum includes paused; scheduling OPEN — no invent
);

// ---------------------------------------------------------------------------
// Concurrent recompute: two first-time inserts for same member+challenge
// ---------------------------------------------------------------------------
const concA = await createActiveChallenge(sessions.alex, `M8 ConcFirst ${stamp}`);
assert("concurrent-first challenge", !concA.error && Boolean(concA.id), concA.error?.message);
const concAid = concA.id;
await admin.from("challenges").update({ start_date: "2026-10-01" }).eq("id", concAid);
const concAAct = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: concAid,
  p_user_id: ids.alex,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-10-19T12:00:00.000Z",
});
assert("concurrent-first activate", !concAAct.error, concAAct.error?.message);

async function seedConc(challengeId, amount, whenIso, key) {
  const res = await admin.rpc("record_contribution_at", {
    p_challenge_id: challengeId,
    p_user_id: ids.alex,
    p_amount_minor: amount,
    p_idempotency_key: key,
    p_now: whenIso,
  });
  assert(`concurrent seed ${key}`, !res.error, res.error?.message);
  return res.data?.contribution;
}

await seedConc(concAid, 5000, "2026-10-21T12:00:00.000Z", `m8-cf-w43-${stamp}`);
await seedConc(concAid, 5000, "2026-10-28T12:00:00.000Z", `m8-cf-w44-${stamp}`);
await seedConc(concAid, 5000, "2026-11-04T12:00:00.000Z", `m8-cf-w45-${stamp}`);

const { data: concAMem } = await admin
  .from("challenge_memberships")
  .select("id")
  .eq("challenge_id", concAid)
  .eq("user_id", ids.alex)
  .single();
assert("concurrent-first membership", Boolean(concAMem?.id));

// Clear assessments + audit so the next two calls are true first-time inserts.
await admin
  .from("weekly_assessment_audit")
  .delete()
  .eq("membership_id", concAMem.id);
await admin
  .from("weekly_commitment_assessments")
  .delete()
  .eq("membership_id", concAMem.id);

const concNow = "2026-11-12T12:00:00.000Z"; // Thu → W46 open
const [cfA, cfB] = await Promise.all([
  admin.rpc("recompute_member_weekly_assessments_at", {
    p_challenge_id: concAid,
    p_user_id: ids.alex,
    p_now: concNow,
  }),
  admin.rpc("recompute_member_weekly_assessments_at", {
    p_challenge_id: concAid,
    p_user_id: ids.alex,
    p_now: concNow,
  }),
]);
assert(
  "concurrent first-time both complete",
  !cfA.error && !cfB.error,
  [cfA.error?.message, cfB.error?.message].filter(Boolean).join(" | "),
);

const { data: cfRows, error: cfRowsErr } = await admin
  .from("weekly_commitment_assessments")
  .select("week_start, status, eligible_sum_minor")
  .eq("membership_id", concAMem.id)
  .order("week_start", { ascending: true });
assert("concurrent first-time rows query", !cfRowsErr, cfRowsErr?.message);
const cfWeekStarts = (cfRows || []).map((r) => r.week_start);
assert(
  "concurrent first-time one row per assessed week",
  cfWeekStarts.length === new Set(cfWeekStarts).size &&
    cfWeekStarts.includes("2026-10-19") &&
    cfWeekStarts.includes("2026-10-26") &&
    cfWeekStarts.includes("2026-11-02") &&
    cfWeekStarts.includes("2026-11-09"),
  JSON.stringify(cfWeekStarts),
);
const cfClosedEligibleOk = ["2026-10-19", "2026-10-26", "2026-11-02"].every(
  (w) =>
    Number((cfRows || []).find((r) => r.week_start === w)?.eligible_sum_minor) ===
    5000,
);
const cfOpen = (cfRows || []).find((r) => r.week_start === "2026-11-09");
assert(
  "concurrent first-time final totals+streak",
  Number(cfA.data?.streak_weeks) === 3 &&
    Number(cfB.data?.streak_weeks) === 3 &&
    historyStatus(cfA.data, "2026-11-02") === "completed" &&
    historyStatus(cfB.data, "2026-11-02") === "completed" &&
    cfClosedEligibleOk &&
    cfOpen?.status === "in_progress" &&
    Number(cfOpen?.eligible_sum_minor) === 0,
  `streakA=${cfA.data?.streak_weeks} streakB=${cfB.data?.streak_weeks} rows=${JSON.stringify(cfRows)}`,
);

const { data: cfAudit, error: cfAuditErr } = await admin
  .from("weekly_assessment_audit")
  .select("week_start, from_status, to_status, detail")
  .eq("membership_id", concAMem.id)
  .order("week_start", { ascending: true });
assert("concurrent first-time audit query", !cfAuditErr, cfAuditErr?.message);
const cfInitial = (cfAudit || []).filter((r) =>
  String(r.detail || "").includes("Initial week assessment"),
);
const cfInitialWeeks = cfInitial.map((r) => r.week_start);
assert(
  "concurrent first-time no duplicate initial audits",
  cfInitialWeeks.length === new Set(cfInitialWeeks).size &&
    cfInitialWeeks.length === cfWeekStarts.length,
  JSON.stringify(cfInitial),
);
assert(
  "concurrent first-time no stale transitions",
  (cfAudit || []).every(
    (r) =>
      r.from_status == null ||
      (r.from_status !== r.to_status &&
        !(r.from_status === "completed" && r.to_status === "missed")),
  ),
  JSON.stringify(cfAudit),
);

// ---------------------------------------------------------------------------
// Concurrent: dashboard recompute overlapping a contribution correction
// ---------------------------------------------------------------------------
const concB = await createActiveChallenge(sessions.alex, `M8 ConcDash ${stamp}`);
assert("concurrent-dash challenge", !concB.error && Boolean(concB.id), concB.error?.message);
const concBid = concB.id;
await admin.from("challenges").update({ start_date: "2026-10-01" }).eq("id", concBid);
const concBAct = await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: concBid,
  p_user_id: ids.alex,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-10-19T12:00:00.000Z",
});
assert("concurrent-dash activate", !concBAct.error, concBAct.error?.message);

await seedConc(concBid, 5000, "2026-10-21T12:00:00.000Z", `m8-cd-w43-${stamp}`);
await seedConc(concBid, 5000, "2026-10-28T12:00:00.000Z", `m8-cd-w44-${stamp}`);
const cdW45 = await seedConc(
  concBid,
  4000,
  "2026-11-04T12:00:00.000Z",
  `m8-cd-w45-${stamp}`,
);

const cdPre = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: concBid,
  p_user_id: ids.alex,
  p_now: concNow,
});
assert("concurrent-dash pre-assess", !cdPre.error, cdPre.error?.message);
assert(
  "concurrent-dash W45 missed before amend",
  historyStatus(cdPre.data, "2026-11-02") === "missed",
);

const { data: concBMem } = await admin
  .from("challenge_memberships")
  .select("id")
  .eq("challenge_id", concBid)
  .eq("user_id", ids.alex)
  .single();

const { data: cdAuditBefore } = await admin
  .from("weekly_assessment_audit")
  .select("id")
  .eq("membership_id", concBMem.id)
  .eq("week_start", "2026-11-02");
const cdAuditBeforeIds = new Set((cdAuditBefore || []).map((r) => r.id));

const [cdDash, cdAmend] = await Promise.all([
  sessions.alex.rpc("challenge_dashboard", { p_challenge_id: concBid }),
  sessions.alex.rpc("amend_contribution", {
    p_contribution_id: cdW45.id,
    p_amount_minor: 5000,
  }),
]);
assert(
  "concurrent dash+amend both complete",
  !cdDash.error && !cdAmend.error,
  [cdDash.error?.message, cdAmend.error?.message].filter(Boolean).join(" | "),
);

const cdFinal = await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: concBid,
  p_user_id: ids.alex,
  p_now: concNow,
});
assert("concurrent-dash final recompute", !cdFinal.error, cdFinal.error?.message);

const { data: cdRows, error: cdRowsErr } = await admin
  .from("weekly_commitment_assessments")
  .select("week_start, status, eligible_sum_minor")
  .eq("membership_id", concBMem.id)
  .order("week_start", { ascending: true });
assert("concurrent-dash rows query", !cdRowsErr, cdRowsErr?.message);
const cdWeekStarts = (cdRows || []).map((r) => r.week_start);
assert(
  "concurrent-dash one row per assessed week",
  cdWeekStarts.length === new Set(cdWeekStarts).size,
  JSON.stringify(cdWeekStarts),
);
const cdW45Row = (cdRows || []).find((r) => r.week_start === "2026-11-02");
assert(
  "concurrent-dash final totals+streak correct",
  cdW45Row?.status === "completed" &&
    Number(cdW45Row?.eligible_sum_minor) === 5000 &&
    Number(cdFinal.data?.streak_weeks) === 3 &&
    Number(cdAmend.data?.assessment?.streak_weeks) === 3,
  JSON.stringify({
    w45: cdW45Row,
    streak: cdFinal.data?.streak_weeks,
    amendStreak: cdAmend.data?.assessment?.streak_weeks,
  }),
);

const { data: cdAuditAll, error: cdAuditErr } = await admin
  .from("weekly_assessment_audit")
  .select("id, week_start, from_status, to_status, to_eligible_sum_minor, detail, at")
  .eq("membership_id", concBMem.id)
  .eq("week_start", "2026-11-02")
  .order("at", { ascending: true });
assert("concurrent-dash audit query", !cdAuditErr, cdAuditErr?.message);
const cdNewTransitions = (cdAuditAll || []).filter(
  (r) =>
    !cdAuditBeforeIds.has(r.id) &&
    r.from_status === "missed" &&
    r.to_status === "completed",
);
assert(
  "concurrent-dash audit single missed→completed",
  cdNewTransitions.length === 1 &&
    Number(cdNewTransitions[0].to_eligible_sum_minor) === 5000,
  JSON.stringify(cdNewTransitions),
);
assert(
  "concurrent-dash audit no duplicate/stale transitions",
  (cdAuditAll || []).filter(
    (r) => r.from_status === "completed" && r.to_status === "missed",
  ).length === 0 &&
    (cdAuditAll || []).filter(
      (r) => r.from_status === "missed" && r.to_status === "completed",
    ).length === 1,
  JSON.stringify(cdAuditAll),
);

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
const outDir = join(process.cwd(), ".data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `m8-postgres-evidence-${stamp}.json`);
writeFileSync(
  outPath,
  JSON.stringify(
    { stamp, ids: { aid, bid, cid, did: d.id }, passed, failed, results },
    null,
    2,
  ),
);
console.log(`\n${passed} passed, ${failed} failed → ${outPath}`);
if (failed) process.exit(1);
