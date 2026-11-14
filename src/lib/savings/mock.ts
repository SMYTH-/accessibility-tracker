import { randomBytes } from "crypto";
import { getChallengeForUser } from "@/lib/challenge/service";
import { readChallengeDb, withChallengeDb, type ChallengeDb } from "@/lib/challenge/store";
import type { Membership } from "@/lib/challenge/types";
import { firstAssessedWeekStart } from "./time";
import { validateSavingsAmounts } from "./validate";
import type {
  ActivateSavingsResult,
  OwnSavingsView,
  SavingsSetup,
  SavingsSetupAuditEvent,
  UpdateTargetResult,
} from "./types";

function id(bytes = 10): string {
  return randomBytes(bytes).toString("hex");
}

function nowIso(d = new Date()): string {
  return d.toISOString();
}

function findMembership(
  db: ChallengeDb,
  challengeId: string,
  userId: string,
): Membership | undefined {
  return db.memberships.find(
    (m) => m.challengeId === challengeId && m.userId === userId,
  );
}

function findSetup(
  db: ChallengeDb,
  challengeId: string,
  userId: string,
): SavingsSetup | undefined {
  return db.savingsSetups.find(
    (s) => s.challengeId === challengeId && s.userId === userId,
  );
}

export async function mockActivateSavings(
  userId: string,
  challengeId: string,
  targetMajor: string,
  weeklyCommitmentMajor: string,
  now: Date = new Date(),
): Promise<ActivateSavingsResult> {
  const amounts = validateSavingsAmounts(targetMajor, weeklyCommitmentMajor);
  if (!amounts.ok) return amounts;

  const row = await getChallengeForUser(challengeId, userId, now);
  if (!row) {
    return { ok: false, error: "Approved membership is required for savings setup." };
  }
  const { challenge, membership } = row;
  if (challenge.lifecycleStatus === "Completed" || challenge.lifecycleStatus === "Cancelled") {
    return {
      ok: false,
      error: "Completed or cancelled challenges do not accept savings setup changes.",
    };
  }
  if (membership.savingsParticipationActive) {
    return {
      ok: false,
      error: "Savings participation is already active.",
    };
  }

  const first = firstAssessedWeekStart(now, challenge.timeZone);
  const at = nowIso(now);
  const setup: SavingsSetup = {
    membershipId: membership.id,
    challengeId,
    userId,
    targetMinor: amounts.value.targetMinor,
    weeklyCommitmentMinor: amounts.value.weeklyCommitmentMinor,
    activatedAt: at,
    firstAssessedWeekStart: first,
    targetEffectiveFrom: first,
    updatedAt: at,
  };

  return withChallengeDb((db) => {
    const mem = findMembership(db, challengeId, userId);
    if (!mem || mem.status !== "approved") {
      return { ok: false, error: "Approved membership is required for savings setup." };
    }
    if (mem.savingsParticipationActive || findSetup(db, challengeId, userId)) {
      return {
        ok: false,
        error: "Savings participation is already active.",
      };
    }
    mem.savingsParticipationActive = true;
    mem.updatedAt = at;
    db.savingsSetups.push(setup);
    db.savingsAudit.push({
      id: id(),
      challengeId,
      membershipId: mem.id,
      actorUserId: userId,
      action: "activate",
      fromTargetMinor: null,
      toTargetMinor: setup.targetMinor,
      fromWeeklyCommitmentMinor: null,
      toWeeklyCommitmentMinor: setup.weeklyCommitmentMinor,
      effectiveFrom: first,
      firstAssessedWeekStart: first,
      detail: "Initial savings setup; participation active",
      at,
    });
    return { ok: true, membership: { ...mem }, setup };
  });
}

/** Signed-in / user-facing path: parked until G1.1-10 progress/milestone rules approved. */
export async function mockUpdateTarget(
  _userId: string,
  _challengeId: string,
  _targetMajor: string,
  _now: Date = new Date(),
): Promise<UpdateTargetResult> {
  return {
    ok: false,
    error:
      "Changing your personal target after activation is not available yet.",
  };
}

export async function mockGetOwnSavings(
  userId: string,
  challengeId: string,
  now: Date = new Date(),
): Promise<OwnSavingsView | null> {
  const row = await getChallengeForUser(challengeId, userId, now);
  if (!row) return null;
  const db = await readChallengeDb();
  const setup = findSetup(db, challengeId, userId) ?? null;
  return {
    membership: row.membership,
    setup,
    savingsParticipationActive: row.membership.savingsParticipationActive,
  };
}

export async function mockListSavingsAudit(
  challengeId: string,
  userId: string,
): Promise<SavingsSetupAuditEvent[]> {
  const db = await readChallengeDb();
  return db.savingsAudit
    .filter((e) => e.challengeId === challengeId && e.actorUserId === userId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Test helper — clear savings rows in the active mock challenge file. */
export async function resetMockSavingsState(): Promise<void> {
  await withChallengeDb((db) => {
    db.savingsSetups.length = 0;
    db.savingsAudit.length = 0;
    for (const m of db.memberships) {
      m.savingsParticipationActive = false;
    }
  });
}
