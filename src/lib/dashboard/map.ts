import type {
  DashboardAssessmentStatus,
  StreakStatus,
  WeekAssessment,
  WeekAssessmentStatus,
} from "@/lib/assessment/engine";
import type {
  ActivityPreviewEvent,
  ChallengeDashboard,
  MilestonePercent,
  PersonalDashboard,
  RosterMemberProjection,
  SharingMemberTotals,
} from "./types";

function n(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

function nNull(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  return Number(v);
}

function asWeekStatus(v: string | null | undefined): WeekAssessmentStatus | null {
  if (
    v === "completed" ||
    v === "missed" ||
    v === "in_progress" ||
    v === "paused"
  ) {
    return v;
  }
  return null;
}

function asDashboardStatus(
  v: string | null | undefined,
): DashboardAssessmentStatus {
  if (
    v === "completed" ||
    v === "missed" ||
    v === "in_progress" ||
    v === "paused" ||
    v === "inactive" ||
    v === "pre_assessment"
  ) {
    return v;
  }
  return "inactive";
}

function asStreakStatus(v: string | null | undefined): StreakStatus {
  if (
    v === "active" ||
    v === "recovering" ||
    v === "none" ||
    v === "inactive"
  ) {
    return v;
  }
  return "inactive";
}

function mapHistory(raw: unknown): WeekAssessment[] {
  if (!Array.isArray(raw)) return [];
  const out: WeekAssessment[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const status = asWeekStatus(String(r.status ?? r.Status ?? ""));
    const weekStart = String(r.week_start ?? r.weekStart ?? "");
    if (!status || !weekStart) continue;
    out.push({
      weekStart,
      status,
      eligibleSumMinor: n(r.eligible_sum_minor as number | string | undefined),
      commitmentMinor: n(r.commitment_minor as number | string | undefined),
      weekClosed: Boolean(r.week_closed ?? r.weekClosed),
    });
  }
  return out;
}

export type SharingTotalsRow = {
  saved_minor: number | string;
  target_minor: number | string;
  progress_percent: number | string | null;
  sharer_count: number | string;
  currency: string;
  label: string;
  scope_explanation: string;
  source_label: string;
  generated_at: string;
};

export type PersonalRow = {
  eligible_total_minor: number | string;
  commitment_eligible_minor: number | string;
  pre_assessment_minor: number | string;
  target_minor: number | string | null;
  weekly_commitment_minor: number | string | null;
  current_progress_percent: number | string | null;
  milestones_reached: number[] | null;
  highest_milestone_reached: number | null;
  milestone_recognition_label: string | null;
  source_label: string;
  currency: string;
  savings_participation_active: boolean;
  share_monetary_info: boolean;
  first_assessed_week_start: string | null;
  streak_weeks: number | string | null;
  streak_label: string;
  streak_status: string;
  weekly_assessment_status: string;
  current_week_start?: string | null;
  current_week_eligible_minor?: number | string | null;
  assessment_history?: unknown;
};

export type RosterRow = {
  membership_id: string;
  user_id: string;
  display_name: string;
  role: string;
  status: string;
  share_monetary_info: boolean;
  savings_participation_active: boolean;
  is_self: boolean;
  privacy_chip: string | null;
  eligible_total_minor?: number | string;
  target_minor?: number | string | null;
  progress_percent?: number | string | null;
  weekly_commitment_minor?: number | string | null;
  currency?: string;
  source_label?: string;
};

export type ActivityRow = {
  id: string;
  kind: string;
  user_id: string;
  display_name: string;
  title: string;
  meta: string;
  amount_minor?: number | string;
  currency?: string;
  milestone_percent?: number | string | null;
  at: string;
};

export type DashboardRow = {
  challenge_id: string;
  challenge_name: string;
  lifecycle_status: string;
  start_date: string;
  end_date: string;
  currency: string;
  time_zone: string;
  personal: PersonalRow;
  sharing: SharingTotalsRow;
  roster: RosterRow[];
  activity_preview: ActivityRow[];
  generated_at: string;
};

export function mapSharingTotals(row: SharingTotalsRow): SharingMemberTotals {
  return {
    savedMinor: n(row.saved_minor),
    targetMinor: n(row.target_minor),
    progressPercent: nNull(row.progress_percent),
    sharerCount: n(row.sharer_count),
    currency: row.currency,
    label: "Sharing members only",
    scopeExplanation: row.scope_explanation,
    sourceLabel: "self-reported",
    generatedAt: row.generated_at,
  };
}

export function mapPersonal(row: PersonalRow): PersonalDashboard {
  const milestones = (row.milestones_reached ?? []).filter(
    (m): m is MilestonePercent => m === 25 || m === 50 || m === 75 || m === 100,
  );
  return {
    eligibleTotalMinor: n(row.eligible_total_minor),
    commitmentEligibleMinor: n(row.commitment_eligible_minor),
    preAssessmentMinor: n(row.pre_assessment_minor),
    targetMinor: nNull(row.target_minor),
    weeklyCommitmentMinor: nNull(row.weekly_commitment_minor),
    currentProgressPercent: nNull(row.current_progress_percent),
    milestonesReached: milestones,
    highestMilestoneReached:
      row.highest_milestone_reached === 25 ||
      row.highest_milestone_reached === 50 ||
      row.highest_milestone_reached === 75 ||
      row.highest_milestone_reached === 100
        ? row.highest_milestone_reached
        : null,
    milestoneRecognitionLabel: row.milestone_recognition_label,
    sourceLabel: "self-reported",
    currency: row.currency,
    savingsParticipationActive: Boolean(row.savings_participation_active),
    shareMonetaryInfo: Boolean(row.share_monetary_info),
    firstAssessedWeekStart: row.first_assessed_week_start,
    streakWeeks: n(row.streak_weeks),
    streakLabel: "Your streak",
    streakStatus: asStreakStatus(row.streak_status),
    weeklyAssessmentStatus: asDashboardStatus(row.weekly_assessment_status),
    currentWeekStart: row.current_week_start ?? null,
    currentWeekEligibleMinor: n(row.current_week_eligible_minor),
    assessmentHistory: mapHistory(row.assessment_history),
  };
}

export function mapRosterMember(row: RosterRow): RosterMemberProjection {
  const base: RosterMemberProjection = {
    membershipId: row.membership_id,
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    shareMonetaryInfo: Boolean(row.share_monetary_info),
    savingsParticipationActive: Boolean(row.savings_participation_active),
    isSelf: Boolean(row.is_self),
    privacyChip: row.privacy_chip === "Private" ? "Private" : null,
  };

  // Only attach monetary keys when present (G1.1-06 — omit, do not zero).
  if (Object.prototype.hasOwnProperty.call(row, "eligible_total_minor")) {
    base.eligibleTotalMinor = n(row.eligible_total_minor);
    base.targetMinor = nNull(row.target_minor);
    base.progressPercent = nNull(row.progress_percent);
    base.weeklyCommitmentMinor = nNull(row.weekly_commitment_minor);
    base.currency = row.currency;
    base.sourceLabel = "self-reported";
  }
  return base;
}

function asActivityKind(
  kind: string,
): ActivityPreviewEvent["kind"] {
  switch (kind) {
    case "private_contribution":
    case "member_joined":
    case "commitment_completed":
    case "milestone_reached":
    case "challenge_completed":
    case "contribution":
      return kind;
    default:
      return "contribution";
  }
}

export function mapActivity(row: ActivityRow): ActivityPreviewEvent {
  const event: ActivityPreviewEvent = {
    id: row.id,
    kind: asActivityKind(row.kind),
    userId: row.user_id,
    displayName: row.display_name,
    title: row.title,
    meta: row.meta,
    at: row.at,
  };
  if (
    Object.prototype.hasOwnProperty.call(row, "amount_minor") &&
    row.amount_minor != null
  ) {
    event.amountMinor = n(row.amount_minor);
    event.currency = row.currency;
  }
  const mile = row.milestone_percent;
  if (mile === 25 || mile === 50 || mile === 75 || mile === 100) {
    event.milestonePercent = mile;
  } else if (
    mile === "25" ||
    mile === "50" ||
    mile === "75" ||
    mile === "100"
  ) {
    event.milestonePercent = Number(mile) as MilestonePercent;
  }
  return event;
}

export function mapDashboard(row: DashboardRow): ChallengeDashboard {
  return {
    challengeId: row.challenge_id,
    challengeName: row.challenge_name,
    lifecycleStatus: row.lifecycle_status,
    startDate: row.start_date,
    endDate: row.end_date,
    currency: row.currency,
    timeZone: row.time_zone,
    personal: mapPersonal(row.personal),
    sharing: mapSharingTotals(row.sharing),
    roster: (row.roster ?? []).map(mapRosterMember),
    activityPreview: (row.activity_preview ?? []).map(mapActivity),
    generatedAt: row.generated_at,
  };
}
