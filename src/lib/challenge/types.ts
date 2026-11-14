export const LIFECYCLE_STATUSES = [
  "Draft",
  "Scheduled",
  "Active",
  "Completed",
  "Cancelled",
] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const MEMBERSHIP_STATUSES = [
  "pending",
  "approved",
  "declined",
  "left",
  "removed",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export type MembershipRole = "owner" | "member";

export type Challenge = {
  id: string;
  name: string;
  description: string | null;
  startDate: string; // YYYY-MM-DD calendar date in challenge TZ
  endDate: string;
  currency: string;
  timeZone: string;
  lifecycleStatus: LifecycleStatus;
  ownerUserId: string;
  visibility: "private";
  createdAt: string;
  updatedAt: string;
};

export type Membership = {
  id: string;
  challengeId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  /** Savings participation inactive until M4 target + weekly commitment. */
  savingsParticipationActive: boolean;
  shareMonetaryInfo: boolean;
  /** PRIV-01 — set when invitee acknowledges disclosure before join request. */
  privacyDisclosureAckedAt?: string | null;
  invitationId?: string | null;
  requestedAt?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LifecycleAuditEvent = {
  id: string;
  challengeId: string;
  actorUserId: string | null;
  action: "create" | "lifecycle_transition" | "invalid_transition_rejected";
  fromStatus: LifecycleStatus | null;
  toStatus: LifecycleStatus | null;
  reason: string;
  at: string;
};

export type CreateChallengeInput = {
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  currency: string;
  timeZone: string;
};

export type ChallengeWithMembership = {
  challenge: Challenge;
  membership: Membership;
};
