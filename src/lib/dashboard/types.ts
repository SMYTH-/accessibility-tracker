export type MilestonePercent = 25 | 50 | 75 | 100;

export type PersonalDashboard = {
  eligibleTotalMinor: number;
  commitmentEligibleMinor: number;
  preAssessmentMinor: number;
  targetMinor: number | null;
  weeklyCommitmentMinor: number | null;
  currentProgressPercent: number | null;
  milestonesReached: MilestonePercent[];
  highestMilestoneReached: MilestonePercent | null;
  milestoneRecognitionLabel: string | null;
  sourceLabel: "self-reported";
  currency: string;
  savingsParticipationActive: boolean;
  shareMonetaryInfo: boolean;
  firstAssessedWeekStart: string | null;
  /** M8 owns calculation; label locked to mid-fi "Your streak". */
  streakWeeks: number | null;
  streakLabel: "Your streak";
  streakStatus: "deferred_to_m8";
  weeklyAssessmentStatus: "deferred_to_m8";
};

export type SharingMemberTotals = {
  savedMinor: number;
  targetMinor: number;
  progressPercent: number | null;
  sharerCount: number;
  currency: string;
  label: "Sharing members only";
  scopeExplanation: string;
  sourceLabel: "self-reported";
  generatedAt: string;
};

/** Monetary fields omitted (not zeroed) when private and not self. */
export type RosterMemberProjection = {
  membershipId: string;
  userId: string;
  displayName: string;
  role: string;
  status: string;
  shareMonetaryInfo: boolean;
  savingsParticipationActive: boolean;
  isSelf: boolean;
  privacyChip: "Private" | null;
  eligibleTotalMinor?: number;
  targetMinor?: number | null;
  progressPercent?: number | null;
  weeklyCommitmentMinor?: number | null;
  currency?: string;
  sourceLabel?: "self-reported";
};

export type ActivityPreviewEvent = {
  id: string;
  kind: "contribution" | "private_contribution";
  userId: string;
  displayName: string;
  title: string;
  meta: string;
  amountMinor?: number;
  currency?: string;
  at: string;
};

export type ChallengeDashboard = {
  challengeId: string;
  challengeName: string;
  lifecycleStatus: string;
  startDate: string;
  endDate: string;
  currency: string;
  timeZone: string;
  personal: PersonalDashboard;
  sharing: SharingMemberTotals;
  roster: RosterMemberProjection[];
  activityPreview: ActivityPreviewEvent[];
  generatedAt: string;
};
