import { addDaysYmd, zonedYmd } from "@/lib/challenge/time";

/**
 * ISO weekday in challenge TZ: 1=Monday … 7=Sunday.
 */
export function zonedIsoWeekday(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const n = map[weekday];
  if (!n) throw new Error(`Unexpected weekday token: ${weekday}`);
  return n;
}

/**
 * First assessed commitment week start (Monday YYYY-MM-DD) in challenge TZ.
 * Monday activation → that Monday (current week).
 * Tuesday–Sunday → following Monday.
 * Approved contribution timing §3.1 / m0-architecture Example D.
 */
export function firstAssessedWeekStart(
  activatedAt: Date,
  timeZone: string,
): string {
  const localYmd = zonedYmd(activatedAt, timeZone);
  const dow = zonedIsoWeekday(activatedAt, timeZone);
  if (dow === 1) return localYmd;
  return addDaysYmd(localYmd, 8 - dow);
}

/**
 * G1.1-10: next weekly period start after `at` in challenge TZ (always the following Monday).
 */
export function nextWeeklyPeriodStart(at: Date, timeZone: string): string {
  const localYmd = zonedYmd(at, timeZone);
  const dow = zonedIsoWeekday(at, timeZone);
  return addDaysYmd(localYmd, 8 - dow);
}
