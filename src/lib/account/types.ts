export type PersonalDataExport = {
  schemaVersion: number;
  exportedAt: string;
  subjectUserId: string;
  scope: "personal_authorised_only";
  privacyNote: string;
  profile: {
    userId: string;
    email: string;
    displayName: string;
    emailConfirmedAt: string | null;
    createdAt: string | null;
  };
  memberships: Record<string, unknown>[];
  challenges: Record<string, unknown>[];
  savingsSetups: Record<string, unknown>[];
  contributions: Record<string, unknown>[];
  contributionRevisions: Record<string, unknown>[];
  weeklyAssessments: Record<string, unknown>[];
  progressMilestones: Record<string, unknown>[];
  invitationsCreated: Record<string, unknown>[];
};

export type ExportResult =
  | { ok: true; export: PersonalDataExport; raw: unknown }
  | { ok: false; error: string };

export type DeletionHold = {
  challengeId: string;
  name?: string;
  lifecycleStatus?: string;
  holdKind: "needs_transfer" | "grace_no_replacement" | string;
  graceEndsAt?: string | null;
  eligibleReplacements?: number;
  resolvedAt?: string | null;
  resolution?: string | null;
};

export type DeletionStatus =
  | "none"
  | "pending_transfer"
  | "grace_pending"
  | "ready"
  | "completed"
  | "cancelled";

export type DeletionRequestResult =
  | {
      ok: true;
      status: DeletionStatus | "completed";
      requestId?: string;
      graceEndsAt?: string | null;
      holds?: DeletionHold[];
      message?: string;
      cancelledChallenges?: number;
      idempotent?: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

export type DeletionStatusView = {
  status: DeletionStatus;
  requestId?: string;
  requestedAt?: string;
  graceEndsAt?: string | null;
  completedAt?: string | null;
  holds: DeletionHold[];
};

export type TransferCandidate = {
  userId: string;
  membershipId: string;
  displayName: string;
  email: string;
};

export type TransferResult =
  | {
      ok: true;
      challengeId: string;
      fromUserId: string;
      toUserId: string;
      lifecycleStatus: string;
    }
  | { ok: false; error: string };
