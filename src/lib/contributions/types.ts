export type ContributionStatus = "active" | "reversed";

export type Contribution = {
  id: string;
  challengeId: string;
  membershipId: string;
  userId: string;
  /** Integer minor units; always positive. */
  amountMinor: number;
  currency: string;
  /** Challenge-local YYYY-MM-DD; immutable after create. */
  contributionDate: string;
  /** Monday YYYY-MM-DD of the week containing contributionDate. */
  weekStart: string;
  status: ContributionStatus;
  /** Always "self-reported" in MVP. */
  sourceLabel: "self-reported";
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  reversedAt: string | null;
};

export type ContributionRevisionAction = "create" | "amend" | "reverse";

export type ContributionRevision = {
  id: string;
  contributionId: string;
  challengeId: string;
  actorUserId: string | null;
  action: ContributionRevisionAction;
  fromAmountMinor: number | null;
  toAmountMinor: number | null;
  fromStatus: ContributionStatus | null;
  toStatus: ContributionStatus | null;
  contributionDate: string;
  weekStart: string;
  idempotencyKey: string | null;
  detail: string;
  at: string;
};

export type EligibleTotals = {
  eligibleTotalMinor: number;
  /** Amounts in weeks on/after first assessed week (commitment scope). */
  commitmentEligibleMinor: number;
  /** Amounts before first assessed week — personal target / progress milestones only. */
  preAssessmentMinor: number;
  firstAssessedWeekStart: string | null;
  targetMinor: number | null;
  currency: string;
  sourceLabel: "self-reported";
};

export type RecordContributionResult =
  | {
      ok: true;
      contribution: Contribution;
      replayed: boolean;
      totals: EligibleTotals;
    }
  | { ok: false; error: string };

export type AmendContributionResult =
  | {
      ok: true;
      contribution: Contribution;
      unchanged: boolean;
      totals: EligibleTotals;
    }
  | { ok: false; error: string };

export type ReverseContributionResult =
  | {
      ok: true;
      contribution: Contribution;
      totals: EligibleTotals;
    }
  | { ok: false; error: string };

export type OwnContributionsView = {
  contributions: Contribution[];
  revisions: ContributionRevision[];
};
