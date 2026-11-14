/**
 * Pure helper smoke: week_start Monday + challenge-local date (no DB).
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Compile-free: reimplement checks mirroring src/lib/contributions/time.ts + challenge time.
function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function weekStartMonday(localYmd) {
  const [y, m, d] = localYmd.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(probe);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const dow = map[weekday];
  return addDaysYmd(localYmd, 1 - dow);
}

function zonedYmd(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

let failed = 0;
function assert(name, cond, detail = "") {
  if (!cond) {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

assert("Thu 12 Nov → week Mon 9 Nov", weekStartMonday("2026-11-12") === "2026-11-09");
assert("Mon 16 Nov → same Monday", weekStartMonday("2026-11-16") === "2026-11-16");
assert("Sun 15 Nov → Mon 9 Nov", weekStartMonday("2026-11-15") === "2026-11-09");

// Around UTC midnight: London still previous calendar day vs Auckland next day.
const nearMidnight = new Date("2026-11-13T00:30:00.000Z");
assert(
  "London local near UTC midnight",
  zonedYmd(nearMidnight, "Europe/London") === "2026-11-13",
  zonedYmd(nearMidnight, "Europe/London"),
);
assert(
  "Auckland local near UTC midnight",
  zonedYmd(nearMidnight, "Pacific/Auckland") === "2026-11-13",
  zonedYmd(nearMidnight, "Pacific/Auckland"),
);
const lateUtc = new Date("2026-11-12T23:30:00.000Z");
assert(
  "London still 12 Nov at 23:30Z",
  zonedYmd(lateUtc, "Europe/London") === "2026-11-12",
);
assert(
  "Auckland already 13 Nov at 23:30Z",
  zonedYmd(lateUtc, "Pacific/Auckland") === "2026-11-13",
);

void require;
console.log(failed ? `FAILED ${failed}` : "ALL PASS");
process.exit(failed ? 1 : 0);
