import type { Membership, MembershipStatus } from "@/lib/challenge/types";

/** G1.1-07 invite preview — no financial fields. */
export type InvitePreview = {
  invitationId: string;
  challengeId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  participantCount: number;
  expiresAt: string;
};

export type ChallengeInvitation = {
  id: string;
  challengeId: string;
  createdBy: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

export type CreateInviteResult =
  | {
      ok: true;
      invitation: ChallengeInvitation;
      token: string;
      expiresInDays: number;
      /** Absolute path for sharing; site origin prefixed by caller/UI. */
      path: string;
    }
  | { ok: false; error: string };

export type MembershipAdminRow = Membership & {
  displayName: string;
  email: string;
};

export type NotificationRecord = {
  id: string;
  kind: "membership_approved" | "membership_rejected";
  challengeId: string;
  membershipId: string | null;
  recipientUserId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: "recorded" | "queued" | "sent" | "failed";
  createdAt: string;
  sentAt: string | null;
  error: string | null;
};

export type RequestMembershipResult =
  | {
      ok: true;
      membership: Membership;
      created: boolean;
      preview: Pick<
        InvitePreview,
        "name" | "description" | "startDate" | "endDate" | "participantCount"
      >;
    }
  | { ok: false; error: string };

export type DecideResult =
  | {
      ok: true;
      membership: Membership;
      alreadyDecided: boolean;
      notificationId?: string;
      challengeName: string;
    }
  | { ok: false; error: string };

export type ActionResult =
  | { ok: true; membership: Membership; already?: boolean }
  | { ok: false; error: string };

export type PendingAccessView = {
  kind: "pending" | "declined" | "left" | "removed";
  status: MembershipStatus;
  preview: Pick<
    InvitePreview,
    "name" | "description" | "startDate" | "endDate" | "participantCount"
  >;
};
