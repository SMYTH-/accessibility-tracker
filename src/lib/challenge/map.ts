import type {
  Challenge,
  LifecycleAuditEvent,
  LifecycleStatus,
  Membership,
  MembershipRole,
  MembershipStatus,
} from "./types";

export type ChallengeRow = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  currency: string;
  time_zone: string;
  lifecycle_status: LifecycleStatus;
  owner_user_id: string;
  visibility: "private";
  created_at: string;
  updated_at: string;
};

export type MembershipRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  savings_participation_active: boolean;
  share_monetary_info: boolean;
  privacy_disclosure_acked_at?: string | null;
  invitation_id?: string | null;
  requested_at?: string | null;
  decided_at?: string | null;
  decided_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditRow = {
  id: string;
  challenge_id: string;
  actor_user_id: string | null;
  action: LifecycleAuditEvent["action"];
  from_status: LifecycleStatus | null;
  to_status: LifecycleStatus | null;
  reason: string;
  at: string;
};

export function mapChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    currency: row.currency,
    timeZone: row.time_zone,
    lifecycleStatus: row.lifecycle_status,
    ownerUserId: row.owner_user_id,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    savingsParticipationActive: row.savings_participation_active,
    shareMonetaryInfo: row.share_monetary_info,
    privacyDisclosureAckedAt: row.privacy_disclosure_acked_at ?? null,
    invitationId: row.invitation_id ?? null,
    requestedAt: row.requested_at ?? null,
    decidedAt: row.decided_at ?? null,
    decidedBy: row.decided_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAudit(row: AuditRow): LifecycleAuditEvent {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    reason: row.reason,
    at: row.at,
  };
}
