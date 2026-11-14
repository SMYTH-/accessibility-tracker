import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";
import { createClient } from "@/lib/auth/supabase/server";
import { expectedLifecycleStatus, initialLifecycleOnCreate } from "./time";
import { withChallengeDb, readChallengeDb } from "./store";
import {
  pgAttemptTransition,
  pgCreateChallenge,
  pgGetForUser,
  pgListAudit,
  pgListForUser,
  pgReconcile,
} from "./postgres";
import {
  isAllowedAutoTransition,
  rejectTransitionMessage,
  validateCreateChallengeInput,
} from "./validate";
import type {
  Challenge,
  ChallengeWithMembership,
  CreateChallengeInput,
  LifecycleAuditEvent,
  LifecycleStatus,
  Membership,
} from "./types";

function id(bytes = 12): string {
  return randomBytes(bytes).toString("hex");
}

function nowIso(d = new Date()): string {
  return d.toISOString();
}

function isPostgresMode(): boolean {
  return getAuthMode() === "supabase";
}

async function userClient(): Promise<SupabaseClient> {
  return createClient();
}

function pushAudit(
  audit: LifecycleAuditEvent[],
  event: Omit<LifecycleAuditEvent, "id" | "at"> & { at?: string },
): void {
  audit.push({
    id: id(10),
    at: event.at ?? nowIso(),
    challengeId: event.challengeId,
    actorUserId: event.actorUserId,
    action: event.action,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    reason: event.reason,
  });
}

function reconcileChallenge(
  challenge: Challenge,
  audit: LifecycleAuditEvent[],
  now: Date,
): Challenge {
  if (
    challenge.lifecycleStatus === "Cancelled" ||
    challenge.lifecycleStatus === "Draft" ||
    challenge.lifecycleStatus === "Completed"
  ) {
    return challenge;
  }

  const expected = expectedLifecycleStatus(
    challenge.startDate,
    challenge.endDate,
    challenge.timeZone,
    now,
  );

  if (expected === challenge.lifecycleStatus) return challenge;

  if (!isAllowedAutoTransition(challenge.lifecycleStatus, expected)) {
    pushAudit(audit, {
      challengeId: challenge.id,
      actorUserId: null,
      action: "invalid_transition_rejected",
      fromStatus: challenge.lifecycleStatus,
      toStatus: expected,
      reason: rejectTransitionMessage(challenge.lifecycleStatus, expected),
    });
    return challenge;
  }

  const from = challenge.lifecycleStatus;
  challenge.lifecycleStatus = expected;
  challenge.updatedAt = nowIso(now);
  pushAudit(audit, {
    challengeId: challenge.id,
    actorUserId: null,
    action: "lifecycle_transition",
    fromStatus: from,
    toStatus: expected,
    reason:
      expected === "Active"
        ? "Local midnight on start date (challenge TZ)"
        : "Local midnight after end date (challenge TZ)",
    at: nowIso(now),
  });
  return challenge;
}

export async function reconcileAllChallenges(now: Date = new Date()): Promise<{
  transitioned: number;
}> {
  if (isPostgresMode()) {
    return pgReconcile(await userClient(), now);
  }
  return withChallengeDb((db) => {
    let transitioned = 0;
    for (const challenge of db.challenges) {
      const before = challenge.lifecycleStatus;
      reconcileChallenge(challenge, db.audit, now);
      if (challenge.lifecycleStatus !== before) transitioned += 1;
    }
    return { transitioned };
  });
}

export type CreateChallengeResult =
  | { ok: true; challenge: Challenge; membership: Membership }
  | { ok: false; error: string };

/**
 * Atomic create: private challenge + approved owner membership (savings inactive).
 * Postgres path uses create_private_challenge RPC (single transaction).
 */
export async function createChallenge(
  ownerUserId: string,
  input: CreateChallengeInput,
  now: Date = new Date(),
): Promise<CreateChallengeResult> {
  if (isPostgresMode()) {
    void ownerUserId; // RPC binds auth.uid() from the session
    return pgCreateChallenge(await userClient(), input, now);
  }

  const validated = validateCreateChallengeInput(input, now);
  if (!validated.ok) return { ok: false, error: validated.error };

  const initial = initialLifecycleOnCreate(
    validated.value.startDate,
    validated.value.timeZone,
    now,
  );
  if (initial === "reject_past") {
    return { ok: false, error: "Start date cannot be in the past." };
  }

  return withChallengeDb((db) => {
    const createdAt = nowIso(now);
    const challenge: Challenge = {
      id: id(),
      name: validated.value.name,
      description: validated.value.description,
      startDate: validated.value.startDate,
      endDate: validated.value.endDate,
      currency: validated.value.currency,
      timeZone: validated.value.timeZone,
      lifecycleStatus: initial,
      ownerUserId,
      visibility: "private",
      createdAt,
      updatedAt: createdAt,
    };

    const membership: Membership = {
      id: id(),
      challengeId: challenge.id,
      userId: ownerUserId,
      role: "owner",
      status: "approved",
      savingsParticipationActive: false,
      shareMonetaryInfo: true,
      createdAt,
      updatedAt: createdAt,
    };

    db.challenges.push(challenge);
    db.memberships.push(membership);
    pushAudit(db.audit, {
      challengeId: challenge.id,
      actorUserId: ownerUserId,
      action: "create",
      fromStatus: null,
      toStatus: initial,
      reason: `Created private challenge as ${initial}`,
      at: createdAt,
    });

    return { ok: true, challenge, membership };
  });
}

export async function listChallengesForUser(
  userId: string,
  now: Date = new Date(),
): Promise<ChallengeWithMembership[]> {
  if (isPostgresMode()) {
    return pgListForUser(await userClient(), userId, now);
  }
  await reconcileAllChallenges(now);
  const db = await readChallengeDb();
  const mine = db.memberships.filter(
    (m) => m.userId === userId && m.status === "approved",
  );
  return mine
    .map((membership) => {
      const challenge = db.challenges.find((c) => c.id === membership.challengeId);
      if (!challenge) return null;
      return { challenge, membership };
    })
    .filter((x): x is ChallengeWithMembership => Boolean(x))
    .sort((a, b) => b.challenge.createdAt.localeCompare(a.challenge.createdAt));
}

export async function getChallengeForUser(
  challengeId: string,
  userId: string,
  now: Date = new Date(),
): Promise<ChallengeWithMembership | null> {
  if (isPostgresMode()) {
    return pgGetForUser(await userClient(), challengeId, userId, now);
  }
  await reconcileAllChallenges(now);
  const db = await readChallengeDb();
  const challenge = db.challenges.find((c) => c.id === challengeId);
  if (!challenge) return null;
  const membership = db.memberships.find(
    (m) => m.challengeId === challengeId && m.userId === userId && m.status === "approved",
  );
  if (!membership) return null;
  return { challenge, membership };
}

export function canRecordSavings(
  challenge: Challenge,
  membership: Membership,
): { allowed: boolean; reason: string } {
  if (challenge.lifecycleStatus !== "Active") {
    return {
      allowed: false,
      reason: `Recording savings requires an Active challenge (currently ${challenge.lifecycleStatus}).`,
    };
  }
  if (!membership.savingsParticipationActive) {
    return {
      allowed: false,
      reason:
        "Recording savings requires personal target and weekly commitment setup first.",
    };
  }
  return { allowed: true, reason: "Eligible." };
}

export function isAssessedForWeeklyCommitments(membership: Membership): boolean {
  return membership.savingsParticipationActive;
}

export async function listAuditForChallenge(
  challengeId: string,
): Promise<LifecycleAuditEvent[]> {
  if (isPostgresMode()) {
    return pgListAudit(await userClient(), challengeId);
  }
  const db = await readChallengeDb();
  return db.audit
    .filter((e) => e.challengeId === challengeId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function attemptLifecycleTransition(
  challengeId: string,
  to: LifecycleStatus,
  actorUserId: string | null,
  now: Date = new Date(),
): Promise<{ ok: true; challenge: Challenge } | { ok: false; error: string }> {
  if (isPostgresMode()) {
    void actorUserId;
    return pgAttemptTransition(await userClient(), challengeId, to, now);
  }
  return withChallengeDb((db) => {
    const challenge = db.challenges.find((c) => c.id === challengeId);
    if (!challenge) return { ok: false, error: "Challenge not found." };
    reconcileChallenge(challenge, db.audit, now);
    if (challenge.lifecycleStatus === to) return { ok: true, challenge };
    if (!isAllowedAutoTransition(challenge.lifecycleStatus, to)) {
      const msg = rejectTransitionMessage(challenge.lifecycleStatus, to);
      pushAudit(db.audit, {
        challengeId,
        actorUserId,
        action: "invalid_transition_rejected",
        fromStatus: challenge.lifecycleStatus,
        toStatus: to,
        reason: msg,
        at: nowIso(now),
      });
      return { ok: false, error: msg };
    }
    const from = challenge.lifecycleStatus;
    challenge.lifecycleStatus = to;
    challenge.updatedAt = nowIso(now);
    pushAudit(db.audit, {
      challengeId,
      actorUserId,
      action: "lifecycle_transition",
      fromStatus: from,
      toStatus: to,
      reason: "Explicit transition",
      at: nowIso(now),
    });
    return { ok: true, challenge };
  });
}
