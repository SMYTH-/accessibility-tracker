import type { Membership } from "@/lib/challenge/types";
import { mapMembership, type MembershipRow } from "@/lib/challenge/map";
import type { SavingsSetup, SavingsSetupAuditEvent } from "./types";

export type SavingsSetupRow = {
  membership_id: string;
  challenge_id: string;
  user_id: string;
  target_minor: number | string;
  weekly_commitment_minor: number | string;
  activated_at: string;
  first_assessed_week_start: string;
  target_effective_from: string;
  updated_at: string;
};

export type SavingsAuditRow = {
  id: string;
  challenge_id: string;
  membership_id: string | null;
  actor_user_id: string | null;
  action: SavingsSetupAuditEvent["action"];
  from_target_minor: number | string | null;
  to_target_minor: number | string | null;
  from_weekly_commitment_minor: number | string | null;
  to_weekly_commitment_minor: number | string | null;
  effective_from: string | null;
  first_assessed_week_start: string | null;
  detail: string;
  at: string;
};

function asInt(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === "number" ? v : Number(v);
}

export function mapSavingsSetup(row: SavingsSetupRow): SavingsSetup {
  return {
    membershipId: row.membership_id,
    challengeId: row.challenge_id,
    userId: row.user_id,
    targetMinor: asInt(row.target_minor) ?? 0,
    weeklyCommitmentMinor: asInt(row.weekly_commitment_minor) ?? 0,
    activatedAt: row.activated_at,
    firstAssessedWeekStart: row.first_assessed_week_start,
    targetEffectiveFrom: row.target_effective_from,
    updatedAt: row.updated_at,
  };
}

export function mapSavingsAudit(row: SavingsAuditRow): SavingsSetupAuditEvent {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    membershipId: row.membership_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    fromTargetMinor: asInt(row.from_target_minor),
    toTargetMinor: asInt(row.to_target_minor),
    fromWeeklyCommitmentMinor: asInt(row.from_weekly_commitment_minor),
    toWeeklyCommitmentMinor: asInt(row.to_weekly_commitment_minor),
    effectiveFrom: row.effective_from,
    firstAssessedWeekStart: row.first_assessed_week_start,
    detail: row.detail,
    at: row.at,
  };
}

export function mapMembershipFromRpc(row: MembershipRow): Membership {
  return mapMembership(row);
}
