import {
  mapRosterMember,
  mapSharingTotals,
  type RosterRow,
  type SharingTotalsRow,
} from "@/lib/dashboard/map";
import type { MilestonePercent } from "@/lib/dashboard/types";
import type {
  ActivityFeed,
  ActivityFeedEvent,
  ActivityEventKind,
  ChallengeCompletionSummary,
  CompletionPersonalSummary,
} from "./types";

function n(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

function nNull(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  return Number(v);
}

const KINDS: ActivityEventKind[] = [
  "member_joined",
  "contribution",
  "commitment_completed",
  "milestone_reached",
  "challenge_completed",
];

function asKind(v: string): ActivityEventKind | null {
  return (KINDS as string[]).includes(v) ? (v as ActivityEventKind) : null;
}

function asMilestone(v: unknown): MilestonePercent | undefined {
  if (v === 25 || v === 50 || v === 75 || v === 100) return v;
  if (v === "25" || v === "50" || v === "75" || v === "100") {
    return Number(v) as MilestonePercent;
  }
  return undefined;
}

export type ActivityEventRow = {
  id: string;
  kind: string;
  user_id: string;
  display_name: string;
  title: string;
  meta: string;
  amount_minor?: number | string | null;
  currency?: string | null;
  milestone_percent?: number | string | null;
  at: string;
};

export type ActivityFeedRow = {
  events: ActivityEventRow[];
  limit?: number | string;
  before?: string | null;
  generated_at: string;
  read_only?: boolean;
};

export type CompletionPersonalRow = {
  eligible_total_minor: number | string;
  target_minor: number | string | null;
  current_progress_percent: number | string | null;
  milestones_reached: number[] | null;
  highest_milestone_reached: number | null;
  milestone_recognition_label: string | null;
  weekly_commitment_minor: number | string | null;
  savings_participation_active: boolean;
  share_monetary_info: boolean;
  source_label: string;
  currency: string;
};

export type CompletionSummaryRow = {
  challenge_id: string;
  challenge_name: string;
  lifecycle_status: string;
  start_date: string;
  end_date: string;
  currency: string;
  time_zone: string;
  read_only: boolean;
  participant_count: number | string;
  active_saver_count: number | string;
  personal: CompletionPersonalRow;
  sharing: SharingTotalsRow;
  roster: RosterRow[];
  activity: ActivityEventRow[];
  generated_at: string;
};

export function mapActivityEvent(row: ActivityEventRow): ActivityFeedEvent | null {
  const kind = asKind(row.kind);
  if (!kind) return null;
  const event: ActivityFeedEvent = {
    id: row.id,
    kind,
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
    event.currency = row.currency ?? undefined;
  }
  const mile = asMilestone(row.milestone_percent);
  if (mile != null) event.milestonePercent = mile;
  return event;
}

export function mapActivityFeed(row: ActivityFeedRow): ActivityFeed {
  return {
    events: (row.events ?? [])
      .map(mapActivityEvent)
      .filter((e): e is ActivityFeedEvent => e != null),
    limit: n(row.limit ?? 50),
    before: row.before ?? null,
    generatedAt: row.generated_at,
    readOnly: Boolean(row.read_only),
  };
}

function mapCompletionPersonal(row: CompletionPersonalRow): CompletionPersonalSummary {
  const milestones = (row.milestones_reached ?? []).filter(
    (m): m is MilestonePercent => m === 25 || m === 50 || m === 75 || m === 100,
  );
  return {
    eligibleTotalMinor: n(row.eligible_total_minor),
    targetMinor: nNull(row.target_minor),
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
    weeklyCommitmentMinor: nNull(row.weekly_commitment_minor),
    savingsParticipationActive: Boolean(row.savings_participation_active),
    shareMonetaryInfo: Boolean(row.share_monetary_info),
    sourceLabel: "self-reported",
    currency: row.currency,
  };
}

export function mapCompletionSummary(
  row: CompletionSummaryRow,
): ChallengeCompletionSummary {
  return {
    challengeId: row.challenge_id,
    challengeName: row.challenge_name,
    lifecycleStatus: "Completed",
    startDate: row.start_date,
    endDate: row.end_date,
    currency: row.currency,
    timeZone: row.time_zone,
    readOnly: true,
    participantCount: n(row.participant_count),
    activeSaverCount: n(row.active_saver_count),
    personal: mapCompletionPersonal(row.personal),
    sharing: mapSharingTotals(row.sharing),
    roster: (row.roster ?? []).map(mapRosterMember),
    activity: (row.activity ?? [])
      .map(mapActivityEvent)
      .filter((e): e is ActivityFeedEvent => e != null),
    generatedAt: row.generated_at,
  };
}
