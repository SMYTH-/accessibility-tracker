import { createHash, randomBytes } from "crypto";
import { withChallengeDb, type ChallengeDb } from "@/lib/challenge/store";
import type { Membership } from "@/lib/challenge/types";
import type {
  ActionResult,
  ChallengeInvitation,
  CreateInviteResult,
  DecideResult,
  InvitePreview,
  MembershipAdminRow,
  NotificationRecord,
  RequestMembershipResult,
} from "./types";

function id(bytes = 12): string {
  return randomBytes(bytes).toString("hex");
}

function nowIso(d = new Date()): string {
  return d.toISOString();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function approvedCount(db: ChallengeDb, challengeId: string): number {
  return db.memberships.filter((m) => m.challengeId === challengeId && m.status === "approved")
    .length;
}

function previewFromChallenge(
  db: ChallengeDb,
  invitation: ChallengeInvitation & { tokenHash?: string },
): InvitePreview | { error: string } {
  if (invitation.revokedAt) return { error: "This invitation has been revoked." };
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    return { error: "This invitation has expired." };
  }
  const challenge = db.challenges.find((c) => c.id === invitation.challengeId);
  if (!challenge) return { error: "This invitation link is invalid." };
  return {
    invitationId: invitation.id,
    challengeId: challenge.id,
    name: challenge.name,
    description: challenge.description,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    participantCount: approvedCount(db, challenge.id),
    expiresAt: invitation.expiresAt,
  };
}

function ensureOwner(db: ChallengeDb, challengeId: string, userId: string): string | null {
  const mem = db.memberships.find(
    (m) =>
      m.challengeId === challengeId &&
      m.userId === userId &&
      m.role === "owner" &&
      m.status === "approved",
  );
  return mem ? null : "Only the challenge owner can do that.";
}

function pushNotification(
  db: ChallengeDb,
  input: {
    kind: NotificationRecord["kind"];
    challengeId: string;
    membershipId: string | null;
    recipientUserId: string;
    recipientEmail: string;
    subject: string;
    body: string;
  },
): string {
  const record: NotificationRecord = {
    id: id(10),
    kind: input.kind,
    challengeId: input.challengeId,
    membershipId: input.membershipId,
    recipientUserId: input.recipientUserId,
    recipientEmail: input.recipientEmail,
    subject: input.subject,
    body: input.body,
    status: "recorded",
    createdAt: nowIso(),
    sentAt: null,
    error: null,
  };
  db.notifications.push(record);
  return record.id;
}

export async function mockCreateInvitation(
  challengeId: string,
  ownerUserId: string,
  expiresInDays = 7,
): Promise<CreateInviteResult> {
  return withChallengeDb((db) => {
    const err = ensureOwner(db, challengeId, ownerUserId);
    if (err) return { ok: false, error: err };
    if (expiresInDays < 1 || expiresInDays > 30) {
      return { ok: false, error: "Invite expiry must be between 1 and 30 days." };
    }
    const token = randomBytes(32).toString("hex");
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
    const invitation = {
      id: id(),
      challengeId,
      createdBy: ownerUserId,
      expiresAt,
      revokedAt: null as string | null,
      createdAt,
      tokenHash: hashToken(token),
    };
    db.invitations.push(invitation);
    const publicInvite = {
      id: invitation.id,
      challengeId: invitation.challengeId,
      createdBy: invitation.createdBy,
      expiresAt: invitation.expiresAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
    };
    return {
      ok: true,
      invitation: publicInvite,
      token,
      expiresInDays,
      path: `/invite/${token}`,
    };
  });
}

export async function mockRevokeInvitation(
  invitationId: string,
  ownerUserId: string,
): Promise<
  { ok: true; invitation: ChallengeInvitation; alreadyRevoked: boolean } | { ok: false; error: string }
> {
  return withChallengeDb((db) => {
    const row = db.invitations.find((i) => i.id === invitationId);
    if (!row) return { ok: false, error: "Invitation not found." };
    const err = ensureOwner(db, row.challengeId, ownerUserId);
    if (err) return { ok: false, error: err };
    const toPublic = (inv: typeof row) => ({
      id: inv.id,
      challengeId: inv.challengeId,
      createdBy: inv.createdBy,
      expiresAt: inv.expiresAt,
      revokedAt: inv.revokedAt,
      createdAt: inv.createdAt,
    });
    if (row.revokedAt) {
      return { ok: true, invitation: toPublic(row), alreadyRevoked: true };
    }
    row.revokedAt = nowIso();
    return { ok: true, invitation: toPublic(row), alreadyRevoked: false };
  });
}

export async function mockGetInvitationPreview(
  token: string,
): Promise<{ ok: true; preview: InvitePreview } | { ok: false; error: string }> {
  return withChallengeDb((db) => {
    if (!token.trim()) return { ok: false, error: "This invitation link is invalid." };
    const hash = hashToken(token.trim());
    const invitation = db.invitations.find((i) => i.tokenHash === hash);
    if (!invitation) return { ok: false, error: "This invitation link is invalid." };
    const preview = previewFromChallenge(db, invitation);
    if ("error" in preview) return { ok: false, error: preview.error };
    return { ok: true, preview };
  });
}

export async function mockRequestMembership(
  token: string,
  userId: string,
  privacyAck: boolean,
): Promise<RequestMembershipResult> {
  return withChallengeDb((db) => {
    if (!privacyAck) {
      return {
        ok: false,
        error:
          "You must acknowledge the financial visibility disclosure before requesting to join.",
      };
    }
    const hash = hashToken(token.trim());
    const invitation = db.invitations.find((i) => i.tokenHash === hash);
    if (!invitation) return { ok: false, error: "This invitation link is invalid." };
    const preview = previewFromChallenge(db, invitation);
    if ("error" in preview) return { ok: false, error: preview.error };
    const challenge = db.challenges.find((c) => c.id === invitation.challengeId)!;
    if (challenge.lifecycleStatus === "Cancelled" || challenge.lifecycleStatus === "Completed") {
      return { ok: false, error: "This challenge is no longer open for join requests." };
    }

    const existing = db.memberships.find(
      (m) => m.challengeId === challenge.id && m.userId === userId,
    );
    const stamp = nowIso();
    const previewFields = {
      name: preview.name,
      description: preview.description,
      startDate: preview.startDate,
      endDate: preview.endDate,
      participantCount: preview.participantCount,
    };

    if (existing?.status === "approved") {
      return { ok: false, error: "You are already an approved member of this challenge." };
    }
    if (existing?.status === "pending") {
      existing.privacyDisclosureAckedAt = stamp;
      existing.invitationId = invitation.id;
      existing.updatedAt = stamp;
      return { ok: true, membership: existing, created: false, preview: previewFields };
    }

    if (existing) {
      existing.role = "member";
      existing.status = "pending";
      existing.savingsParticipationActive = false;
      existing.shareMonetaryInfo = true;
      existing.privacyDisclosureAckedAt = stamp;
      existing.invitationId = invitation.id;
      existing.requestedAt = stamp;
      existing.decidedAt = null;
      existing.decidedBy = null;
      existing.updatedAt = stamp;
      return { ok: true, membership: existing, created: true, preview: previewFields };
    }

    const membership: Membership = {
      id: id(),
      challengeId: challenge.id,
      userId,
      role: "member",
      status: "pending",
      savingsParticipationActive: false,
      shareMonetaryInfo: true,
      privacyDisclosureAckedAt: stamp,
      invitationId: invitation.id,
      requestedAt: stamp,
      decidedAt: null,
      decidedBy: null,
      createdAt: stamp,
      updatedAt: stamp,
    };
    db.memberships.push(membership);
    return { ok: true, membership, created: true, preview: previewFields };
  });
}

export async function mockDecideMembership(
  membershipId: string,
  ownerUserId: string,
  decision: "approve" | "decline",
  recipientEmail: string,
): Promise<DecideResult> {
  return withChallengeDb((db) => {
    const membership = db.memberships.find((m) => m.id === membershipId);
    if (!membership) return { ok: false, error: "Membership not found." };
    const err = ensureOwner(db, membership.challengeId, ownerUserId);
    if (err) return { ok: false, error: err };
    const challenge = db.challenges.find((c) => c.id === membership.challengeId);
    if (!challenge) return { ok: false, error: "Membership not found." };

    if (membership.status !== "pending") {
      if (
        (decision === "approve" && membership.status === "approved") ||
        (decision === "decline" && membership.status === "declined")
      ) {
        return {
          ok: true,
          membership,
          alreadyDecided: true,
          challengeName: challenge.name,
        };
      }
      return { ok: false, error: "This membership request is not pending." };
    }

    const stamp = nowIso();
    membership.status = decision === "approve" ? "approved" : "declined";
    membership.savingsParticipationActive = false;
    membership.decidedAt = stamp;
    membership.decidedBy = ownerUserId;
    membership.updatedAt = stamp;

    const notificationId = pushNotification(db, {
      kind: decision === "approve" ? "membership_approved" : "membership_rejected",
      challengeId: challenge.id,
      membershipId: membership.id,
      recipientUserId: membership.userId,
      recipientEmail,
      subject:
        decision === "approve"
          ? `Pactwell — Membership approved — ${challenge.name}`
          : `Pactwell — Membership declined — ${challenge.name}`,
      body:
        decision === "approve"
          ? `Your request to join "${challenge.name}" on Pactwell was approved. You are an approved member; savings setup is still required before recording contributions.`
          : `Your request to join "${challenge.name}" on Pactwell was declined. You do not have access to this private challenge.`,
    });

    return {
      ok: true,
      membership,
      alreadyDecided: false,
      notificationId,
      challengeName: challenge.name,
    };
  });
}

export async function mockLeaveChallenge(
  challengeId: string,
  userId: string,
): Promise<ActionResult> {
  return withChallengeDb((db) => {
    const membership = db.memberships.find(
      (m) => m.challengeId === challengeId && m.userId === userId,
    );
    if (!membership || (membership.status !== "approved" && membership.status !== "pending")) {
      return { ok: false, error: "You are not an active member of this challenge." };
    }
    const challenge = db.challenges.find((c) => c.id === challengeId);
    if (
      membership.role === "owner" &&
      membership.status === "approved" &&
      challenge &&
      (challenge.lifecycleStatus === "Scheduled" || challenge.lifecycleStatus === "Active")
    ) {
      return {
        ok: false,
        error:
          "Owners of Scheduled or Active challenges must transfer ownership before leaving. Use Profile → Account controls to transfer to an eligible approved member.",
      };
    }
    membership.status = "left";
    membership.savingsParticipationActive = false;
    membership.updatedAt = nowIso();
    return { ok: true, membership };
  });
}

export async function mockRemoveMember(
  membershipId: string,
  ownerUserId: string,
): Promise<ActionResult> {
  return withChallengeDb((db) => {
    const membership = db.memberships.find((m) => m.id === membershipId);
    if (!membership) return { ok: false, error: "Membership not found." };
    const err = ensureOwner(db, membership.challengeId, ownerUserId);
    if (err) return { ok: false, error: err };
    if (membership.userId === ownerUserId) {
      return { ok: false, error: "Use Leave to exit the challenge yourself." };
    }
    if (membership.role === "owner") {
      return { ok: false, error: "Cannot remove the challenge owner." };
    }
    if (membership.status === "removed" || membership.status === "left") {
      return { ok: true, membership, already: true };
    }
    membership.status = "removed";
    membership.savingsParticipationActive = false;
    membership.decidedAt = membership.decidedAt ?? nowIso();
    membership.decidedBy = ownerUserId;
    membership.updatedAt = nowIso();
    return { ok: true, membership };
  });
}

export async function mockListMembershipAdmin(
  challengeId: string,
  ownerUserId: string,
): Promise<{ ok: true; members: MembershipAdminRow[] } | { ok: false; error: string }> {
  return withChallengeDb((db) => {
    const err = ensureOwner(db, challengeId, ownerUserId);
    if (err) return { ok: false, error: err };
    return {
      ok: true,
      members: db.memberships
        .filter((m) => m.challengeId === challengeId)
        .map((m) => ({
          ...m,
          displayName: m.userId.slice(0, 8),
          email: `${m.userId.slice(0, 8)}@example.com`,
        })),
    };
  });
}

export async function mockListInvitations(
  challengeId: string,
  ownerUserId: string,
): Promise<{ ok: true; invitations: ChallengeInvitation[] } | { ok: false; error: string }> {
  return withChallengeDb((db) => {
    const err = ensureOwner(db, challengeId, ownerUserId);
    if (err) return { ok: false, error: err };
    return {
      ok: true,
      invitations: db.invitations
        .filter((i) => i.challengeId === challengeId)
        .map((i) => ({
          id: i.id,
          challengeId: i.challengeId,
          createdBy: i.createdBy,
          expiresAt: i.expiresAt,
          revokedAt: i.revokedAt,
          createdAt: i.createdAt,
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  });
}

export async function mockGetOwnMembership(
  challengeId: string,
  userId: string,
): Promise<Membership | null> {
  return withChallengeDb((db) => {
    return db.memberships.find((m) => m.challengeId === challengeId && m.userId === userId) ?? null;
  });
}

export async function mockListNotificationsForUser(userId: string): Promise<NotificationRecord[]> {
  return withChallengeDb((db) =>
    db.notifications
      .filter((n) => n.recipientUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
