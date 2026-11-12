import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";
import { createClient } from "@/lib/auth/supabase/server";
import type { Membership } from "@/lib/challenge/types";
import {
  mockCreateInvitation,
  mockDecideMembership,
  mockGetInvitationPreview,
  mockGetOwnMembership,
  mockLeaveChallenge,
  mockListInvitations,
  mockListMembershipAdmin,
  mockListNotificationsForUser,
  mockRemoveMember,
  mockRequestMembership,
  mockRevokeInvitation,
} from "./mock";
import {
  pgCreateInvitation,
  pgDecideMembership,
  pgGetInvitationPreview,
  pgGetOwnMembership,
  pgLeaveChallenge,
  pgListInvitations,
  pgListMembershipAdmin,
  pgListNotificationsForUser,
  pgRemoveMember,
  pgRequestMembership,
  pgRevokeInvitation,
} from "./postgres";
import type {
  ActionResult,
  ChallengeInvitation,
  CreateInviteResult,
  DecideResult,
  InvitePreview,
  MembershipAdminRow,
  NotificationRecord,
  PendingAccessView,
  RequestMembershipResult,
} from "./types";

function isPostgresMode(): boolean {
  return getAuthMode() === "supabase";
}

async function userClient(): Promise<SupabaseClient> {
  return createClient();
}

/** Anon-capable client for invite preview (works signed-out). */
async function previewClient(): Promise<SupabaseClient> {
  return createClient();
}

export async function createInvitation(
  challengeId: string,
  ownerUserId: string,
  expiresInDays = 7,
): Promise<CreateInviteResult> {
  if (isPostgresMode()) {
    void ownerUserId;
    return pgCreateInvitation(await userClient(), challengeId, expiresInDays);
  }
  return mockCreateInvitation(challengeId, ownerUserId, expiresInDays);
}

export async function revokeInvitation(
  invitationId: string,
  ownerUserId: string,
): Promise<
  { ok: true; invitation: ChallengeInvitation; alreadyRevoked: boolean } | { ok: false; error: string }
> {
  if (isPostgresMode()) {
    void ownerUserId;
    return pgRevokeInvitation(await userClient(), invitationId);
  }
  return mockRevokeInvitation(invitationId, ownerUserId);
}

export async function getInvitationPreview(
  token: string,
): Promise<{ ok: true; preview: InvitePreview } | { ok: false; error: string }> {
  if (isPostgresMode()) {
    return pgGetInvitationPreview(await previewClient(), token);
  }
  return mockGetInvitationPreview(token);
}

export async function requestMembership(
  token: string,
  userId: string,
  privacyAck: boolean,
): Promise<RequestMembershipResult> {
  if (isPostgresMode()) {
    void userId;
    return pgRequestMembership(await userClient(), token, privacyAck);
  }
  return mockRequestMembership(token, userId, privacyAck);
}

export async function decideMembershipRequest(
  membershipId: string,
  ownerUserId: string,
  decision: "approve" | "decline",
  recipientEmail: string,
): Promise<DecideResult> {
  if (isPostgresMode()) {
    void ownerUserId;
    void recipientEmail;
    return pgDecideMembership(await userClient(), membershipId, decision);
  }
  return mockDecideMembership(membershipId, ownerUserId, decision, recipientEmail);
}

export async function leaveChallenge(
  challengeId: string,
  userId: string,
): Promise<ActionResult> {
  if (isPostgresMode()) {
    void userId;
    return pgLeaveChallenge(await userClient(), challengeId);
  }
  return mockLeaveChallenge(challengeId, userId);
}

export async function removeMember(
  membershipId: string,
  ownerUserId: string,
): Promise<ActionResult> {
  if (isPostgresMode()) {
    void ownerUserId;
    return pgRemoveMember(await userClient(), membershipId);
  }
  return mockRemoveMember(membershipId, ownerUserId);
}

export async function listMembershipAdmin(
  challengeId: string,
  ownerUserId: string,
): Promise<{ ok: true; members: MembershipAdminRow[] } | { ok: false; error: string }> {
  if (isPostgresMode()) {
    void ownerUserId;
    return pgListMembershipAdmin(await userClient(), challengeId);
  }
  return mockListMembershipAdmin(challengeId, ownerUserId);
}

export async function listInvitations(
  challengeId: string,
  ownerUserId: string,
): Promise<{ ok: true; invitations: ChallengeInvitation[] } | { ok: false; error: string }> {
  if (isPostgresMode()) {
    void ownerUserId;
    return pgListInvitations(await userClient(), challengeId);
  }
  return mockListInvitations(challengeId, ownerUserId);
}

export async function getOwnMembership(
  challengeId: string,
  userId: string,
): Promise<Membership | null> {
  if (isPostgresMode()) {
    void userId;
    return pgGetOwnMembership(await userClient(), challengeId);
  }
  return mockGetOwnMembership(challengeId, userId);
}

export async function listNotificationsForUser(userId: string): Promise<NotificationRecord[]> {
  if (isPostgresMode()) {
    return pgListNotificationsForUser(await userClient(), userId);
  }
  return mockListNotificationsForUser(userId);
}

/**
 * Non-approved access surface: preview fields only (G1.1-07).
 * Used when invitee is pending/declined and must not see financials.
 */
export async function getPendingAccessView(
  challengeId: string,
  userId: string,
): Promise<(PendingAccessView & { membership: Membership }) | null> {
  if (isPostgresMode()) {
    const supabase = await userClient();
    const { data, error } = await supabase.rpc("get_membership_wait_preview", {
      p_challenge_id: challengeId,
    });
    if (error) throw new Error(error.message);
    if (!data) return null;
    const payload = data as {
      membership: import("@/lib/challenge/map").MembershipRow;
      preview: Record<string, unknown>;
    };
    const { mapMembership } = await import("@/lib/challenge/map");
    const membership = mapMembership(payload.membership);
    if (membership.status === "approved") return null;
    return {
      kind: membership.status as PendingAccessView["kind"],
      status: membership.status,
      membership,
      preview: {
        name: String(payload.preview.name),
        description: (payload.preview.description as string | null) ?? null,
        startDate: String(payload.preview.start_date),
        endDate: String(payload.preview.end_date),
        participantCount: Number(payload.preview.participant_count ?? 0),
      },
    };
  }

  const membership = await mockGetOwnMembership(challengeId, userId);
  if (!membership || membership.status === "approved") return null;
  const { readChallengeDb } = await import("@/lib/challenge/store");
  const db = await readChallengeDb();
  const challenge = db.challenges.find((c) => c.id === challengeId);
  if (!challenge) return null;
  return {
    kind: membership.status as PendingAccessView["kind"],
    status: membership.status,
    membership,
    preview: {
      name: challenge.name,
      description: challenge.description,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      participantCount: db.memberships.filter(
        (m) => m.challengeId === challengeId && m.status === "approved",
      ).length,
    },
  };
}
