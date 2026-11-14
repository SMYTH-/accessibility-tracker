import { addDaysYmd, zonedYmd } from "@/lib/challenge/time";
import { zonedIsoWeekday } from "@/lib/savings/time";

/** Monday YYYY-MM-DD of the ISO week containing `localYmd`. */
export function weekStartMonday(localYmd: string): string {
  const [y, m, d] = localYmd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  // Use noon UTC to avoid DST edge issues when formatting weekday for a calendar date.
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  void utc;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(probe);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const dow = map[weekday];
  if (!dow) throw new Error(`Unexpected weekday: ${weekday}`);
  return addDaysYmd(localYmd, 1 - dow);
}

/** Challenge-local today as YYYY-MM-DD. */
export function challengeLocalToday(now: Date, timeZone: string): string {
  return zonedYmd(now, timeZone);
}

/** Week start for "now" in challenge TZ. */
export function currentWeekStart(now: Date, timeZone: string): string {
  return weekStartMonday(challengeLocalToday(now, timeZone));
}

export { zonedIsoWeekday };
