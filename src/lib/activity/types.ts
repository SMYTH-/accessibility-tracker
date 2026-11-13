import type {
  MilestonePercent,
  RosterMemberProjection,
  SharingMemberTotals,
} from "@/lib/dashboard/types";

export type ActivityEventKind =
  | "member_joined"
  | "contribution"
  | "commitment_completed"
  | "milestone_reached"
  | "challenge_completed";

export type ActivityFeedEvent = {
  id: string;
  kind: ActivityEventKind;
  userId: string;
  displayName: string;
  title: string;
  meta: string;
  amountMinor?: number;
  currency?: string;
  milestonePercent?: MilestonePercent;
  at: string;
};

export type ActivityFeed = {
  events: ActivityFeedEvent[];
  limit: number;
  before: string | null;
  generatedAt: string;
  readOnly: boolean;
};

export type CompletionPersonalSummary = {
  eligibleTotalMinor: number;
  targetMinor: number | null;
  currentProgressPercent: number | null;
  milestonesReached: MilestonePercent[];
  highestMilestoneReached: MilestonePercent | null;
  milestoneRecognitionLabel: string | null;
  weeklyCommitmentMinor: number | null;
  savingsParticipationActive: boolean;
  shareMonetaryInfo: boolean;
  sourceLabel: "self-reported";
  currency: string;
};

export type ChallengeCompletionSummary = {
  challengeId: string;
  challengeName: string;
  lifecycleStatus: "Completed";
  startDate: string;
  endDate: string;
  currency: string;
  timeZone: string;
  readOnly: true;
  participantCount: number;
  activeSaverCount: number;
  personal: CompletionPersonalSummary;
  sharing: SharingMemberTotals;
  roster: RosterMemberProjection[];
  activity: ActivityFeedEvent[];
  generatedAt: string;
};
