import { randomBytes } from "crypto";
import { getChallengeForUser } from "@/lib/challenge/service";
import { readChallengeDb, withChallengeDb, type ChallengeDb } from "@/lib/challenge/store";
import type { Membership } from "@/lib/challenge/types";
import { firstAssessedWeekStart, nextWeeklyPeriodStart } from "./time";
import { validateSavingsAmounts } from "./validate";
import { parsePositiveMajorToMinor } from "./money";
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
      error: "Savings participation is already active. Use target update for changes.",
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
        error: "Savings participation is already active. Use target update for changes.",
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

export async function mockUpdateTarget(
  userId: string,
  challengeId: string,
  targetMajor: string,
  now: Date = new Date(),
): Promise<UpdateTargetResult> {
  const target = parsePositiveMajorToMinor(targetMajor, "Personal savings target");
  if (!target.ok) return target;

  const row = await getChallengeForUser(challengeId, userId, now);
  if (!row) {
    return { ok: false, error: "Approved membership is required for savings setup." };
  }
  if (
    row.challenge.lifecycleStatus === "Completed" ||
    row.challenge.lifecycleStatus === "Cancelled"
  ) {
    return {
      ok: false,
      error: "Completed or cancelled challenges do not accept savings setup changes.",
    };
  }
  if (!row.membership.savingsParticipationActive) {
    return { ok: false, error: "Complete savings setup before changing your target." };
  }

  return withChallengeDb((db) => {
    const existing = findSetup(db, challengeId, userId);
    if (!existing) {
      return { ok: false, error: "Complete savings setup before changing your target." };
    }
    if (existing.targetMinor === target.minor) {
      return {
        ok: true,
        membership: row.membership,
        setup: existing,
        unchanged: true,
      };
    }

    const effective = nextWeeklyPeriodStart(now, row.challenge.timeZone);
    const at = nowIso(now);
    const from = existing.targetMinor;
    existing.targetMinor = target.minor;
    existing.targetEffectiveFrom = effective;
    existing.updatedAt = at;
    db.savingsAudit.push({
      id: id(),
      challengeId,
      membershipId: existing.membershipId,
      actorUserId: userId,
      action: "target_change",
      fromTargetMinor: from,
      toTargetMinor: target.minor,
      fromWeeklyCommitmentMinor: existing.weeklyCommitmentMinor,
      toWeeklyCommitmentMinor: existing.weeklyCommitmentMinor,
      effectiveFrom: effective,
      firstAssessedWeekStart: existing.firstAssessedWeekStart,
      detail: "Prospective target change (G1.1-10); effective next weekly period",
      at,
    });
    return {
      ok: true,
      membership: row.membership,
      setup: { ...existing },
      unchanged: false,
    };
  });
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
