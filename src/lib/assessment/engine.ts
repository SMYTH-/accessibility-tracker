import { addDaysYmd, compareYmd } from "@/lib/challenge/time";

/** Persistable week outcomes. Open weeks never resolve to missed. */
export type WeekAssessmentStatus =
  | "completed"
  | "missed"
  | "in_progress"
  | "paused";

export type DashboardAssessmentStatus =
  | WeekAssessmentStatus
  | "inactive"
  | "pre_assessment";

export type StreakStatus = "active" | "recovering" | "none" | "inactive";

export type WeekAssessment = {
  weekStart: string;
  status: WeekAssessmentStatus;
  eligibleSumMinor: number;
  commitmentMinor: number;
  weekClosed: boolean;
};

/**
 * Assess one Monday-start week against commitment (challenge TZ calendar).
 * Pause scheduling remains OPEN — `isPaused` is reserved only.
 */
export function assessWeekStatus(args: {
  eligibleSumMinor: number;
  commitmentMinor: number;
  weekStart: string;
  currentWeekStart: string;
  isPaused?: boolean;
}): WeekAssessmentStatus {
  if (args.isPaused) return "paused";
  if (args.eligibleSumMinor >= args.commitmentMinor) return "completed";
  if (compareYmd(args.weekStart, args.currentWeekStart) < 0) return "missed";
  return "in_progress";
}

/**
 * Personal streak: consecutive Completed weeks looking back.
 * in_progress / paused skip without counting; missed breaks (G1.1-09).
 * After a miss, the next completed week starts a new streak automatically.
 */
export function computePersonalStreak(
  weeksAscending: Pick<WeekAssessment, "weekStart" | "status">[],
): number {
  let streak = 0;
  for (let i = weeksAscending.length - 1; i >= 0; i -= 1) {
    const status = weeksAscending[i]!.status;
    if (status === "completed") {
      streak += 1;
      continue;
    }
    if (status === "in_progress" || status === "paused") {
      continue;
    }
    break;
  }
  return streak;
}

export function streakStatusFrom(
  streakWeeks: number,
  weeks: Pick<WeekAssessment, "status">[],
  savingsActive: boolean,
): StreakStatus {
  if (!savingsActive) return "inactive";
  if (streakWeeks > 0) return "active";
  if (weeks.some((w) => w.status === "missed")) return "recovering";
  return "none";
}

/** Monday YYYY-MM-DD for a local calendar date. */
export function weekStartMonday(localYmd: string): string {
  const [y, m, d] = localYmd.split("-").map(Number);
  const probe = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
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

export function eachWeekStartInclusive(
  fromMonday: string,
  toMonday: string,
): string[] {
  const out: string[] = [];
  let cursor = fromMonday;
  while (compareYmd(cursor, toMonday) <= 0) {
    out.push(cursor);
    cursor = addDaysYmd(cursor, 7);
  }
  return out;
}

export function recomputeMemberAssessments(args: {
  savingsParticipationActive: boolean;
  firstAssessedWeekStart: string | null;
  weeklyCommitmentMinor: number | null;
  challengeStartDate: string;
  challengeEndDate: string;
  currentLocalYmd: string;
  /** Map week_start → eligible sum for active in-period contributions. */
  eligibleByWeekStart: Map<string, number>;
}): {
  streakWeeks: number;
  streakStatus: StreakStatus;
  weeklyAssessmentStatus: DashboardAssessmentStatus;
  currentWeekStart: string | null;
  currentWeekEligibleMinor: number;
  weeklyCommitmentMinor: number | null;
  firstAssessedWeekStart: string | null;
  history: WeekAssessment[];
} {
  const currentWeekStart = weekStartMonday(args.currentLocalYmd);

  if (
    !args.savingsParticipationActive ||
    !args.firstAssessedWeekStart ||
    args.weeklyCommitmentMinor == null ||
    args.weeklyCommitmentMinor <= 0
  ) {
    return {
      streakWeeks: 0,
      streakStatus: "inactive",
      weeklyAssessmentStatus: "inactive",
      currentWeekStart: null,
      currentWeekEligibleMinor: 0,
      weeklyCommitmentMinor: args.weeklyCommitmentMinor,
      firstAssessedWeekStart: args.firstAssessedWeekStart,
      history: [],
    };
  }

  if (compareYmd(currentWeekStart, args.firstAssessedWeekStart) < 0) {
    return {
      streakWeeks: 0,
      streakStatus: "none",
      weeklyAssessmentStatus: "pre_assessment",
      currentWeekStart,
      currentWeekEligibleMinor: 0,
      weeklyCommitmentMinor: args.weeklyCommitmentMinor,
      firstAssessedWeekStart: args.firstAssessedWeekStart,
      history: [],
    };
  }

  const endWeek = weekStartMonday(args.challengeEndDate);
  const lastWeek =
    compareYmd(currentWeekStart, endWeek) <= 0 ? currentWeekStart : endWeek;
  const weekStarts = eachWeekStartInclusive(
    args.firstAssessedWeekStart,
    lastWeek,
  );

  const history: WeekAssessment[] = weekStarts.map((weekStart) => {
    const eligible = args.eligibleByWeekStart.get(weekStart) ?? 0;
    const status = assessWeekStatus({
      eligibleSumMinor: eligible,
      commitmentMinor: args.weeklyCommitmentMinor!,
      weekStart,
      currentWeekStart,
    });
    return {
      weekStart,
      status,
      eligibleSumMinor: eligible,
      commitmentMinor: args.weeklyCommitmentMinor!,
      weekClosed: compareYmd(weekStart, currentWeekStart) < 0,
    };
  });

  const streakWeeks = computePersonalStreak(history);
  const current = history.find((w) => w.weekStart === currentWeekStart);

  return {
    streakWeeks,
    streakStatus: streakStatusFrom(
      streakWeeks,
      history,
      true,
    ),
    weeklyAssessmentStatus: current?.status ?? "pre_assessment",
    currentWeekStart,
    currentWeekEligibleMinor: current?.eligibleSumMinor ?? 0,
    weeklyCommitmentMinor: args.weeklyCommitmentMinor,
    firstAssessedWeekStart: args.firstAssessedWeekStart,
    history,
  };
}

export function supportiveMissMessage(): string {
  return "This week was missed — that’s okay. Completing your next weekly commitment starts Your streak again automatically.";
}
