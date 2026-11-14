/**
 * Offline pure-engine smoke for M8 weekly assessment + streak rules.
 */
import assertNode from "node:assert/strict";

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function compareYmd(a, b) {
  return a.localeCompare(b);
}

function weekStartMonday(localYmd) {
  const [y, m, d] = localYmd.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(probe);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return addDaysYmd(localYmd, 1 - map[weekday]);
}

function assessWeekStatus({
  eligibleSumMinor,
  commitmentMinor,
  weekStart,
  currentWeekStart,
  isPaused = false,
}) {
  if (isPaused) return "paused";
  if (eligibleSumMinor >= commitmentMinor) return "completed";
  if (compareYmd(weekStart, currentWeekStart) < 0) return "missed";
  return "in_progress";
}

function computePersonalStreak(weeksAscending) {
  let streak = 0;
  for (let i = weeksAscending.length - 1; i >= 0; i -= 1) {
    const status = weeksAscending[i].status;
    if (status === "completed") {
      streak += 1;
      continue;
    }
    if (status === "in_progress" || status === "paused") continue;
    break;
  }
  return streak;
}

function firstAssessedWeekStart(activatedLocalYmd) {
  const dowMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const [y, m, d] = activatedLocalYmd.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(probe);
  const dow = dowMap[weekday];
  if (dow === 1) return activatedLocalYmd;
  return addDaysYmd(activatedLocalYmd, 8 - dow);
}

let failed = 0;
function assert(name, cond, detail = "") {
  try {
    assertNode.ok(cond, detail);
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL  ${name} — ${e.message || detail}`);
  }
}

const commitment = 5000;
const current = "2026-11-12"; // Thu → W46 open (Mon 9 Nov)
const currentWeek = weekStartMonday(current);
assert("local week boundary Mon 9", currentWeek === "2026-11-09", currentWeek);

// Mon vs Tue–Sun activation
assert(
  "Monday activation → current week",
  firstAssessedWeekStart("2026-11-16") === "2026-11-16",
);
assert(
  "Friday activation → following Monday",
  firstAssessedWeekStart("2026-11-13") === "2026-11-16",
);

// Open week below commitment → in_progress (never missed while open)
assert(
  "open week below → in_progress",
  assessWeekStatus({
    eligibleSumMinor: 2000,
    commitmentMinor: commitment,
    weekStart: currentWeek,
    currentWeekStart: currentWeek,
  }) === "in_progress",
);

// Completion while open allowed
assert(
  "open week met → completed",
  assessWeekStatus({
    eligibleSumMinor: 5000,
    commitmentMinor: commitment,
    weekStart: currentWeek,
    currentWeekStart: currentWeek,
  }) === "completed",
);

// Closed missed
assert(
  "closed under → missed",
  assessWeekStatus({
    eligibleSumMinor: 4000,
    commitmentMinor: commitment,
    weekStart: "2026-11-02",
    currentWeekStart: currentWeek,
  }) === "missed",
);

// Paused distinct
assert(
  "paused distinct",
  assessWeekStatus({
    eligibleSumMinor: 0,
    commitmentMinor: commitment,
    weekStart: "2026-11-02",
    currentWeekStart: currentWeek,
    isPaused: true,
  }) === "paused",
);

// Approved example: two completed, then miss corrected → streak 3
const before = [
  { weekStart: "2026-10-19", status: "completed" }, // W43
  { weekStart: "2026-10-26", status: "completed" }, // W44
  { weekStart: "2026-11-02", status: "missed" }, // W45
  { weekStart: "2026-11-09", status: "in_progress" }, // W46
];
assert("streak after miss = 0", computePersonalStreak(before) === 0);

const afterAmend = before.map((w) =>
  w.weekStart === "2026-11-02" ? { ...w, status: "completed" } : w,
);
assert(
  "correct missed after two completed → streak 3",
  computePersonalStreak(afterAmend) === 3,
  String(computePersonalStreak(afterAmend)),
);

// Recovery: miss then next completed starts new streak
const recovery = [
  { weekStart: "2026-10-26", status: "completed" },
  { weekStart: "2026-11-02", status: "missed" },
  { weekStart: "2026-11-09", status: "completed" },
];
assert("recovery streak = 1", computePersonalStreak(recovery) === 1);

// Reverse / amend down breaks streak
const broken = [
  { weekStart: "2026-10-26", status: "completed" },
  { weekStart: "2026-11-02", status: "completed" },
  { weekStart: "2026-11-09", status: "missed" },
];
assert("amend/reverse miss → streak 0", computePersonalStreak(broken) === 0);

// Idempotent assess
const a = assessWeekStatus({
  eligibleSumMinor: 5000,
  commitmentMinor: commitment,
  weekStart: "2026-11-02",
  currentWeekStart: currentWeek,
});
const b = assessWeekStatus({
  eligibleSumMinor: 5000,
  commitmentMinor: commitment,
  weekStart: "2026-11-02",
  currentWeekStart: currentWeek,
});
assert("repeated assess consistent", a === b && a === "completed");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll m8 assessment smoke checks passed.");
