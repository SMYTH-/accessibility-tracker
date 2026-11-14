import { randomUUID } from "crypto";
import { findUserById, updateDisplayName } from "@/lib/auth/mock/store";
import { clearMockSession } from "@/lib/auth/mock/session";
import { readChallengeDb, withChallengeDb } from "@/lib/challenge/store";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { mapPersonalDataExport } from "./map";
import type {
  DeletionHold,
  DeletionRequestResult,
  DeletionStatusView,
  ExportResult,
  PersonalDataExport,
  TransferCandidate,
  TransferResult,
} from "./types";

type MockDeletionHold = {
  id: string;
  challengeId: string;
  holdKind: "needs_transfer" | "grace_no_replacement";
  graceEndsAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
};

type MockDeletionRequest = {
  id: string;
  userId: string;
  status: DeletionStatusView["status"];
  requestedAt: string;
  graceEndsAt: string | null;
  completedAt: string | null;
  holds: MockDeletionHold[];
  revocationError?: string | null;
  sessionsRevokedAt?: string | null;
  /** Test hook: force next revoke attempt to fail once. */
  failNextRevocation?: boolean;
};

const deletionByUser = new Map<string, MockDeletionRequest>();

export function accountAccessDeniedMock(userId: string): boolean {
  const req = deletionByUser.get(userId);
  return Boolean(req && (req.status === "revoking" || req.status === "completed"));
}

/** Test helper: next finalize revoke step fails once (stays revoking). */
export function mockForceNextRevocationFailure(userId: string): void {
  let req = deletionByUser.get(userId);
  if (!req) {
    req = {
      id: randomUUID(),
      userId,
      status: "ready",
      requestedAt: new Date().toISOString(),
      graceEndsAt: null,
      completedAt: null,
      holds: [],
    };
    deletionByUser.set(userId, req);
  }
  req.failNextRevocation = true;
}

function eligibleReplacements(
  challengeId: string,
  ownerUserId: string,
  memberships: { challengeId: string; userId: string; status: string }[],
) {
  return memberships.filter(
    (m) =>
      m.challengeId === challengeId &&
      m.status === "approved" &&
      m.userId !== ownerUserId,
  );
}

async function buildMockExport(userId: string): Promise<PersonalDataExport> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  const rate = await consumeRateLimit("account.export", userId);
  if (!rate.allowed) {
    throw new Error("RATE_LIMITED");
  }
  const db = await readChallengeDb();
  const memberships = db.memberships.filter((m) => m.userId === userId);
  const challengeIds = new Set(memberships.map((m) => m.challengeId));
  const contributions = db.contributions.filter((c) => c.userId === userId);
  const contributionIds = new Set(contributions.map((c) => c.id));
  const revisions = db.contributionRevisions.filter((r) =>
    contributionIds.has(r.contributionId),
  );
  const savings = (db.savingsSetups ?? []).filter((s) => s.userId === userId);
  const milestones = (db.progressMilestoneAnnouncements ?? []).filter(
    (p) => p.userId === userId,
  );
  const invites = db.invitations.filter((i) => i.createdBy === userId);

  const raw = {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    subject_user_id: userId,
    scope: "personal_authorised_only",
    privacy_note:
      "Contains only the requester's personal records and challenge descriptors for memberships they hold. Other members' emails, amounts, targets, and private monetary fields are excluded (ACC-01 / G1.1-06).",
    profile: {
      user_id: user.id,
      email: user.email,
      display_name: user.displayName,
      email_confirmed_at: user.emailVerified ? user.createdAt : null,
      created_at: user.createdAt,
    },
    memberships: memberships.map((m) => ({
      membership_id: m.id,
      challenge_id: m.challengeId,
      role: m.role,
      status: m.status,
      savings_participation_active: m.savingsParticipationActive,
      share_monetary_info: m.shareMonetaryInfo,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    })),
    challenges: db.challenges
      .filter((c) => challengeIds.has(c.id))
      .map((c) => ({
        challenge_id: c.id,
        name: c.name,
        description: c.description,
        start_date: c.startDate,
        end_date: c.endDate,
        currency: c.currency,
        time_zone: c.timeZone,
        lifecycle_status: c.lifecycleStatus,
        visibility: c.visibility,
        is_owner: c.ownerUserId === userId,
        created_at: c.createdAt,
      })),
    savings_setups: savings.map((s) => ({
      membership_id: s.membershipId,
      challenge_id: s.challengeId,
      target_minor: s.targetMinor,
      weekly_commitment_minor: s.weeklyCommitmentMinor,
      activated_at: s.activatedAt,
      first_assessed_week_start: s.firstAssessedWeekStart,
      target_effective_from: s.targetEffectiveFrom,
      updated_at: s.updatedAt,
    })),
    contributions: contributions.map((c) => ({
      contribution_id: c.id,
      challenge_id: c.challengeId,
      membership_id: c.membershipId,
      amount_minor: c.amountMinor,
      currency: c.currency,
      contribution_date: c.contributionDate,
      week_start: c.weekStart,
      status: c.status,
      source_label: c.sourceLabel,
      idempotency_key: c.idempotencyKey,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      reversed_at: c.reversedAt,
    })),
    contribution_revisions: revisions.map((r) => ({
      revision_id: r.id,
      contribution_id: r.contributionId,
      challenge_id: r.challengeId,
      action: r.action,
      from_amount_minor: r.fromAmountMinor,
      to_amount_minor: r.toAmountMinor,
      from_status: r.fromStatus,
      to_status: r.toStatus,
      contribution_date: r.contributionDate,
      week_start: r.weekStart,
      detail: r.detail,
      at: r.at,
    })),
    weekly_assessments: [],
    progress_milestones: milestones.map((p) => ({
      announcement_id: p.id,
      challenge_id: p.challengeId,
      membership_id: p.membershipId,
      milestone_percent: p.milestonePercent,
      announced_at: p.announcedAt,
      source_contribution_id: p.sourceContributionId ?? null,
    })),
    invitations_created: invites.map((i) => ({
      invitation_id: i.id,
      challenge_id: i.challengeId,
      expires_at: i.expiresAt,
      created_at: i.createdAt,
      revoked_at: i.revokedAt ?? null,
      is_revoked: Boolean(i.revokedAt),
    })),
  };

  return mapPersonalDataExport(raw);
}

export async function mockExportOwnPersonalData(userId: string): Promise<ExportResult> {
  try {
    if (accountAccessDeniedMock(userId)) {
      return {
        ok: false,
        error:
          "This account has been deleted or is pending session revocation. Sign in is no longer available.",
      };
    }
    const mapped = await buildMockExport(userId);
    return { ok: true, export: mapped, raw: mapped };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed.";
    if (message.includes("UNAUTHENTICATED")) {
      return { ok: false, error: "You must be signed in." };
    }
    if (message.includes("RATE_LIMITED")) {
      return { ok: false, error: "Too many export requests. Try again later." };
    }
    return { ok: false, error: message };
  }
}

function toHoldViews(
  req: MockDeletionRequest,
  challenges: { id: string; name: string; lifecycleStatus: string }[],
): DeletionHold[] {
  return req.holds.map((h) => {
    const chal = challenges.find((c) => c.id === h.challengeId);
    return {
      challengeId: h.challengeId,
      name: chal?.name,
      lifecycleStatus: chal?.lifecycleStatus,
      holdKind: h.holdKind,
      graceEndsAt: h.graceEndsAt,
      resolvedAt: h.resolvedAt,
      resolution: h.resolution,
    };
  });
}

export async function mockGetOwnDeletionStatus(
  userId: string,
): Promise<DeletionStatusView> {
  const req = deletionByUser.get(userId);
  if (!req) return { status: "none", holds: [] };
  const db = await readChallengeDb();
  return {
    status: req.status,
    requestId: req.id,
    requestedAt: req.requestedAt,
    graceEndsAt: req.graceEndsAt,
    completedAt: req.completedAt,
    holds: toHoldViews(req, db.challenges),
  };
}

export async function mockTransferOwnership(
  actorUserId: string,
  challengeId: string,
  newOwnerUserId: string,
): Promise<TransferResult> {
  if (actorUserId === newOwnerUserId) {
    return { ok: false, error: "Choose a different approved member as the new owner." };
  }
  let lifecycleStatus = "";
  const result = await withChallengeDb((db) => {
    const chal = db.challenges.find((c) => c.id === challengeId);
    if (!chal) return { ok: false as const, error: "Challenge not found." };
    if (chal.ownerUserId !== actorUserId) {
      return {
        ok: false as const,
        error: "Only the current challenge owner can transfer ownership.",
      };
    }
    const oldMem = db.memberships.find(
      (m) =>
        m.challengeId === challengeId &&
        m.userId === actorUserId &&
        m.status === "approved" &&
        m.role === "owner",
    );
    const newMem = db.memberships.find(
      (m) =>
        m.challengeId === challengeId &&
        m.userId === newOwnerUserId &&
        m.status === "approved",
    );
    if (!oldMem) {
      return {
        ok: false as const,
        error: "Only the current challenge owner can transfer ownership.",
      };
    }
    if (!newMem) {
      return {
        ok: false as const,
        error: "That member is not an eligible approved replacement owner.",
      };
    }
    chal.ownerUserId = newOwnerUserId;
    chal.updatedAt = new Date().toISOString();
    oldMem.role = "member";
    oldMem.updatedAt = chal.updatedAt;
    newMem.role = "owner";
    newMem.updatedAt = chal.updatedAt;
    lifecycleStatus = chal.lifecycleStatus;
    db.audit.push({
      id: randomUUID(),
      challengeId,
      actorUserId,
      action: "lifecycle_transition",
      fromStatus: chal.lifecycleStatus,
      toStatus: chal.lifecycleStatus,
      reason: `Ownership transferred from ${actorUserId} to ${newOwnerUserId}`,
      at: chal.updatedAt,
    });
    return { ok: true as const };
  });
  if (!result.ok) return result;

  const req = deletionByUser.get(actorUserId);
  if (req) {
    for (const hold of req.holds) {
      if (hold.challengeId === challengeId && !hold.resolvedAt) {
        hold.resolvedAt = new Date().toISOString();
        hold.resolution = "transferred";
      }
    }
  }

  return {
    ok: true,
    challengeId,
    fromUserId: actorUserId,
    toUserId: newOwnerUserId,
    lifecycleStatus,
  };
}

export async function mockListTransferCandidates(
  actorUserId: string,
  challengeId: string,
): Promise<TransferCandidate[]> {
  const db = await readChallengeDb();
  const chal = db.challenges.find((c) => c.id === challengeId);
  if (!chal || chal.ownerUserId !== actorUserId) {
    throw new Error("NOT_CHALLENGE_OWNER");
  }
  const out: TransferCandidate[] = [];
  for (const m of eligibleReplacements(challengeId, actorUserId, db.memberships)) {
    const user = await findUserById(m.userId);
    out.push({
      userId: m.userId,
      membershipId: `${challengeId}:${m.userId}`,
      displayName: user?.displayName ?? "Member",
      email: user?.email ?? "",
    });
  }
  return out;
}

async function mockFinalize(userId: string): Promise<DeletionRequestResult> {
  const req = deletionByUser.get(userId);
  if (!req) {
    return { ok: false, error: "Request account deletion first.", code: "DELETION_REQUEST_REQUIRED" };
  }
  if (req.status === "completed") {
    return {
      ok: true,
      status: "completed",
      idempotent: true,
      requestId: req.id,
      sessionsRevokedAt: req.sessionsRevokedAt,
    };
  }

  const now = Date.now();
  let cancelled = 0;
  const alreadyRevoking = req.status === "revoking";

  if (!alreadyRevoking) {
    await withChallengeDb((db) => {
      for (const hold of req.holds) {
        if (hold.resolvedAt) continue;
        const chal = db.challenges.find((c) => c.id === hold.challengeId);
        if (!chal) {
          hold.resolvedAt = new Date().toISOString();
          hold.resolution = "lifecycle_non_blocking";
          continue;
        }
        if (chal.ownerUserId !== userId) {
          hold.resolvedAt = new Date().toISOString();
          hold.resolution = "transferred";
          continue;
        }
        if (chal.lifecycleStatus !== "Active" && chal.lifecycleStatus !== "Scheduled") {
          hold.resolvedAt = new Date().toISOString();
          hold.resolution = "lifecycle_non_blocking";
          continue;
        }
        const eligible = eligibleReplacements(chal.id, userId, db.memberships);
        if (eligible.length > 0) {
          throw new Error("DELETION_TRANSFER_REQUIRED");
        }
        if (hold.holdKind === "grace_no_replacement") {
          if (!hold.graceEndsAt || Date.parse(hold.graceEndsAt) > now) {
            throw new Error("DELETION_GRACE_ACTIVE");
          }
          const from = chal.lifecycleStatus;
          chal.lifecycleStatus = "Cancelled";
          chal.ownerUserId = "";
          chal.updatedAt = new Date().toISOString();
          db.audit.push({
            id: randomUUID(),
            challengeId: chal.id,
            actorUserId: userId,
            action: "lifecycle_transition",
            fromStatus: from,
            toStatus: "Cancelled",
            reason:
              "Auto-cancelled after owner deletion grace with no eligible replacement",
            at: chal.updatedAt,
          });
          hold.resolvedAt = chal.updatedAt;
          hold.resolution = "cancelled_challenge";
          cancelled += 1;
          continue;
        }
        throw new Error("DELETION_TRANSFER_REQUIRED");
      }

      if (
        db.challenges.some(
          (c) =>
            c.ownerUserId === userId &&
            (c.lifecycleStatus === "Active" || c.lifecycleStatus === "Scheduled"),
        )
      ) {
        throw new Error("DELETION_TRANSFER_REQUIRED");
      }

      for (const m of db.memberships) {
        if (m.userId !== userId) continue;
        if (m.status === "approved" || m.status === "pending") {
          m.status = "left";
          m.savingsParticipationActive = false;
          if (m.role === "owner") m.role = "member";
          m.updatedAt = new Date().toISOString();
        }
      }
      for (const c of db.challenges) {
        if (c.ownerUserId === userId) c.ownerUserId = "";
      }
    });

    await updateDisplayName(userId, "Deleted user");
    req.status = "revoking";
    req.revocationError = null;
  }

  if (req.failNextRevocation) {
    req.failNextRevocation = false;
    req.status = "revoking";
    req.revocationError = "MOCK_SESSION_REVOCATION_FAILED";
    return {
      ok: true,
      status: "revoking",
      requestId: req.id,
      revocationError: req.revocationError,
      message:
        "Access revoked pending successful session revocation. Retry finalise; deletion is not complete until sessions are revoked.",
    };
  }

  await clearMockSession();
  req.status = "completed";
  req.completedAt = new Date().toISOString();
  req.sessionsRevokedAt = req.completedAt;
  req.revocationError = null;

  return {
    ok: true,
    status: "completed",
    requestId: req.id,
    cancelledChallenges: cancelled,
    sessionsRevokedAt: req.sessionsRevokedAt,
  };
}

export async function mockRequestAccountDeletion(
  userId: string,
): Promise<DeletionRequestResult> {
  const existing = deletionByUser.get(userId);
  if (existing?.status === "completed") {
    return {
      ok: true,
      status: "completed",
      idempotent: true,
      requestId: existing.id,
    };
  }

  const db = await readChallengeDb();
  const req: MockDeletionRequest = existing ?? {
    id: randomUUID(),
    userId,
    status: "ready",
    requestedAt: new Date().toISOString(),
    graceEndsAt: null,
    completedAt: null,
    holds: [],
  };
  req.holds = req.holds.filter((h) => !h.resolvedAt);
  deletionByUser.set(userId, req);

  const graceEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const holdViews: DeletionHold[] = [];
  let needsTransfer = false;
  let grace = false;

  for (const chal of db.challenges) {
    if (chal.ownerUserId !== userId) continue;
    if (chal.lifecycleStatus !== "Active" && chal.lifecycleStatus !== "Scheduled") {
      continue;
    }
    const eligible = eligibleReplacements(chal.id, userId, db.memberships);
    if (eligible.length > 0) {
      needsTransfer = true;
      let hold = req.holds.find((h) => h.challengeId === chal.id);
      if (!hold) {
        hold = {
          id: randomUUID(),
          challengeId: chal.id,
          holdKind: "needs_transfer",
          graceEndsAt: null,
          resolvedAt: null,
          resolution: null,
        };
        req.holds.push(hold);
      } else {
        hold.holdKind = "needs_transfer";
        hold.graceEndsAt = null;
        hold.resolvedAt = null;
        hold.resolution = null;
      }
      holdViews.push({
        challengeId: chal.id,
        name: chal.name,
        lifecycleStatus: chal.lifecycleStatus,
        holdKind: "needs_transfer",
        eligibleReplacements: eligible.length,
      });
    } else {
      grace = true;
      let hold = req.holds.find((h) => h.challengeId === chal.id);
      if (!hold) {
        hold = {
          id: randomUUID(),
          challengeId: chal.id,
          holdKind: "grace_no_replacement",
          graceEndsAt: graceEnds,
          resolvedAt: null,
          resolution: null,
        };
        req.holds.push(hold);
      } else if (!hold.graceEndsAt) {
        hold.holdKind = "grace_no_replacement";
        hold.graceEndsAt = graceEnds;
        hold.resolvedAt = null;
        hold.resolution = null;
      }
      holdViews.push({
        challengeId: chal.id,
        name: chal.name,
        lifecycleStatus: chal.lifecycleStatus,
        holdKind: "grace_no_replacement",
        graceEndsAt: hold.graceEndsAt,
        eligibleReplacements: 0,
      });
    }
  }

  if (needsTransfer) {
    req.status = "pending_transfer";
    return {
      ok: true,
      status: "pending_transfer",
      requestId: req.id,
      holds: holdViews,
      message:
        "Transfer ownership of Active/Scheduled challenges to an eligible approved member before deletion can finalise.",
    };
  }
  if (grace) {
    req.status = "grace_pending";
    req.graceEndsAt = graceEnds;
    return {
      ok: true,
      status: "grace_pending",
      requestId: req.id,
      graceEndsAt: graceEnds,
      holds: holdViews,
      message:
        "No eligible replacement owner. 7-day grace started. A valid transfer during grace prevents cancellation.",
    };
  }

  req.status = "ready";
  try {
    return await mockFinalize(userId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Deletion failed.";
    return { ok: false, error: message, code: message };
  }
}

export async function mockFinalizeAccountDeletion(
  userId: string,
): Promise<DeletionRequestResult> {
  try {
    return await mockFinalize(userId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Deletion failed.";
    if (message.includes("DELETION_TRANSFER_REQUIRED")) {
      return {
        ok: false,
        error:
          "Transfer ownership of Active or Scheduled challenges to an eligible approved member before deletion can finish.",
        code: "DELETION_TRANSFER_REQUIRED",
      };
    }
    if (message.includes("DELETION_GRACE_ACTIVE")) {
      return {
        ok: false,
        error:
          "Deletion grace period is still active. A valid ownership transfer during grace prevents cancellation.",
        code: "DELETION_GRACE_ACTIVE",
      };
    }
    return { ok: false, error: message, code: message };
  }
}

/** Test helper: expire grace immediately for a user. */
export function mockExpireDeletionGrace(userId: string): void {
  const req = deletionByUser.get(userId);
  if (!req) return;
  const past = new Date(Date.now() - 60_000).toISOString();
  req.graceEndsAt = past;
  for (const h of req.holds) {
    if (h.holdKind === "grace_no_replacement" && !h.resolvedAt) {
      h.graceEndsAt = past;
    }
  }
}

export function resetMockDeletionState(): void {
  deletionByUser.clear();
}
