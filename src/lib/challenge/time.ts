import type { LifecycleStatus } from "./types";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar date YYYY-MM-DD in the given IANA time zone. */
export function zonedYmd(date: Date, timeZone: string): string {
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isYmd(value: string): boolean {
  if (!YMD_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function compareYmd(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Add calendar days to a YYYY-MM-DD string (UTC date arithmetic). */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Expected lifecycle from dates + “now” in challenge TZ.
 * Active from start date through end date inclusive;
 * Completed beginning the calendar day after end (local midnight after end).
 */
export function expectedLifecycleStatus(
  startDate: string,
  endDate: string,
  timeZone: string,
  now: Date = new Date(),
): Extract<LifecycleStatus, "Scheduled" | "Active" | "Completed"> {
  const today = zonedYmd(now, timeZone);
  if (compareYmd(today, startDate) < 0) return "Scheduled";
  if (compareYmd(today, endDate) > 0) return "Completed";
  return "Active";
}

export function initialLifecycleOnCreate(
  startDate: string,
  timeZone: string,
  now: Date = new Date(),
): "Scheduled" | "Active" | "reject_past" {
  const today = zonedYmd(now, timeZone);
  if (compareYmd(startDate, today) < 0) return "reject_past";
  if (compareYmd(startDate, today) === 0) return "Active";
  return "Scheduled";
}
