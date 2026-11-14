import type {
  Contribution,
  ContributionRevision,
  ContributionStatus,
  EligibleTotals,
} from "./types";

export type ContributionRow = {
  id: string;
  challenge_id: string;
  membership_id: string;
  user_id: string;
  amount_minor: number | string;
  currency: string;
  contribution_date: string;
  week_start: string;
  status: string;
  source_label: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  reversed_at: string | null;
};

export type ContributionRevisionRow = {
  id: string;
  contribution_id: string;
  challenge_id: string;
  actor_user_id: string | null;
  action: string;
  from_amount_minor: number | string | null;
  to_amount_minor: number | string | null;
  from_status: string | null;
  to_status: string | null;
  contribution_date: string;
  week_start: string;
  idempotency_key: string | null;
  detail: string;
  at: string;
};

export type EligibleTotalsRow = {
  eligible_total_minor: number | string;
  commitment_eligible_minor: number | string;
  pre_assessment_minor: number | string;
  first_assessed_week_start: string | null;
  target_minor: number | string | null;
  currency: string;
  source_label: string;
};

function n(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

export function mapContribution(row: ContributionRow): Contribution {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    membershipId: row.membership_id,
    userId: row.user_id,
    amountMinor: n(row.amount_minor),
    currency: row.currency,
    contributionDate: row.contribution_date,
    weekStart: row.week_start,
    status: row.status as ContributionStatus,
    sourceLabel: "self-reported",
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reversedAt: row.reversed_at,
  };
}

export function mapRevision(row: ContributionRevisionRow): ContributionRevision {
  return {
    id: row.id,
    contributionId: row.contribution_id,
    challengeId: row.challenge_id,
    actorUserId: row.actor_user_id,
    action: row.action as ContributionRevision["action"],
    fromAmountMinor: row.from_amount_minor == null ? null : n(row.from_amount_minor),
    toAmountMinor: row.to_amount_minor == null ? null : n(row.to_amount_minor),
    fromStatus: (row.from_status as ContributionStatus | null) ?? null,
    toStatus: (row.to_status as ContributionStatus | null) ?? null,
    contributionDate: row.contribution_date,
    weekStart: row.week_start,
    idempotencyKey: row.idempotency_key,
    detail: row.detail,
    at: row.at,
  };
}

export function mapTotals(row: EligibleTotalsRow): EligibleTotals {
  return {
    eligibleTotalMinor: n(row.eligible_total_minor),
    commitmentEligibleMinor: n(row.commitment_eligible_minor),
    preAssessmentMinor: n(row.pre_assessment_minor),
    firstAssessedWeekStart: row.first_assessed_week_start,
    targetMinor: row.target_minor == null ? null : n(row.target_minor),
    currency: row.currency,
    sourceLabel: "self-reported",
  };
}
