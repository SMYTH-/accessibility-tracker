/**
 * Pure first-assessed-week helpers (Mon vs Tue–Sun) — no DB.
 * Locked examples from m0-architecture §3 Example D (Europe/London, Nov 2026).
 */
import assert from "node:assert/strict";

function zonedYmd(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function zonedIsoWeekday(date, timeZone) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[weekday];
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function firstAssessedWeekStart(activatedAt, timeZone) {
  const localYmd = zonedYmd(activatedAt, timeZone);
  const dow = zonedIsoWeekday(activatedAt, timeZone);
  if (dow === 1) return localYmd;
  return addDaysYmd(localYmd, 8 - dow);
}

function nextWeeklyPeriodStart(at, timeZone) {
  const localYmd = zonedYmd(at, timeZone);
  const dow = zonedIsoWeekday(at, timeZone);
  return addDaysYmd(localYmd, 8 - dow);
}

const TZ = "Europe/London";
let failed = 0;
function check(name, cond, detail = "") {
  if (!cond) {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// Friday 13 Nov 2026 12:00 UTC ≈ afternoon London (GMT)
const fri = new Date("2026-11-13T12:00:00.000Z");
check("Fri local YMD", zonedYmd(fri, TZ) === "2026-11-13");
check("Fri isoday", zonedIsoWeekday(fri, TZ) === 5);
check(
  "Tue–Sun activation → Mon 16 Nov 2026",
  firstAssessedWeekStart(fri, TZ) === "2026-11-16",
);

// Monday 16 Nov 2026 10:00 UTC
const mon = new Date("2026-11-16T10:00:00.000Z");
check("Mon local YMD", zonedYmd(mon, TZ) === "2026-11-16");
check("Mon isoday", zonedIsoWeekday(mon, TZ) === 1);
check(
  "Monday activation → current week Mon 16 Nov",
  firstAssessedWeekStart(mon, TZ) === "2026-11-16",
);

// Sunday 15 Nov → following Monday 16 Nov
const sun = new Date("2026-11-15T18:00:00.000Z");
check("Sun → Mon 16", firstAssessedWeekStart(sun, TZ) === "2026-11-16");

// Tuesday 10 Nov → Mon 16 Nov
const tue = new Date("2026-11-10T12:00:00.000Z");
check("Tue → Mon 16", firstAssessedWeekStart(tue, TZ) === "2026-11-16");

// G1.1-10: next period after Friday 13 = Monday 16
check("next period Fri→Mon16", nextWeeklyPeriodStart(fri, TZ) === "2026-11-16");
// After Monday 16 = Monday 23
check("next period Mon→Mon23", nextWeeklyPeriodStart(mon, TZ) === "2026-11-23");

assert.equal(failed, 0, `${failed} checks failed`);
console.log(`ALL PASS (${10 - failed}/10)`);
