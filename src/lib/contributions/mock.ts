import { randomBytes } from "crypto";
import { compareYmd } from "@/lib/challenge/time";
import { getChallengeForUser } from "@/lib/challenge/service";
import { readChallengeDb, withChallengeDb, type ChallengeDb } from "@/lib/challenge/store";
import type { Membership } from "@/lib/challenge/types";
import type { SavingsSetup } from "@/lib/savings/types";
import { challengeLocalToday, weekStartMonday } from "./time";
import { validateContributionAmount, validateIdempotencyKey } from "./validate";
import type {
  AmendContributionResult,
  Contribution,
  EligibleTotals,
  OwnContributionsView,
  RecordContributionResult,
  ReverseContributionResult,
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

function computeTotals(
  db: ChallengeDb,
  challengeId: string,
  userId: string,
  startDate: string,
  endDate: string,
  currency: string,
): EligibleTotals {
  const setup = findSetup(db, challengeId, userId);
  const rows = db.contributions.filter(
    (c) =>
      c.challengeId === challengeId &&
      c.userId === userId &&
      c.status === "active" &&
      compareYmd(c.contributionDate, startDate) >= 0 &&
      compareYmd(c.contributionDate, endDate) <= 0,
  );
  let eligible = 0;
  let commitment = 0;
  let pre = 0;
  for (const c of rows) {
    eligible += c.amountMinor;
    if (setup?.firstAssessedWeekStart) {
      if (compareYmd(c.weekStart, setup.firstAssessedWeekStart) >= 0) {
        commitment += c.amountMinor;
      } else {
        pre += c.amountMinor;
      }
    } else {
      commitment += c.amountMinor;
    }
  }
  return {
    eligibleTotalMinor: eligible,
    commitmentEligibleMinor: commitment,
    preAssessmentMinor: pre,
    firstAssessedWeekStart: setup?.firstAssessedWeekStart ?? null,
    targetMinor: setup?.targetMinor ?? null,
    currency,
    sourceLabel: "self-reported",
  };
}

export async function mockRecordContribution(
  userId: string,
  challengeId: string,
  amountMajor: string,
  idempotencyKey: string,
  now: Date = new Date(),
): Promise<RecordContributionResult> {
  const amount = validateContributionAmount(amountMajor);
  if (!amount.ok) return amount;
  const key = validateIdempotencyKey(idempotencyKey);
  if (!key.ok) return key;

  const row = await getChallengeForUser(challengeId, userId, now);
  if (!row) {
    return { ok: false, error: "Approved membership is required." };
  }
  const { challenge, membership } = row;
  if (challenge.lifecycleStatus !== "Active") {
    return { ok: false, error: "Recording savings requires an Active challenge." };
  }
  if (!membership.savingsParticipationActive) {
    return {
      ok: false,
      error: "Complete savings setup (target and weekly commitment) before recording.",
    };
  }

  const local = challengeLocalToday(now, challenge.timeZone);
  if (
    compareYmd(local, challenge.startDate) < 0 ||
    compareYmd(local, challenge.endDate) > 0
  ) {
    return {
      ok: false,
      error: "Contribution date is outside the challenge savings period.",
    };
  }

  return withChallengeDb((db) => {
    const mem = findMembership(db, challengeId, userId);
    if (!mem || mem.status !== "approved" || !mem.savingsParticipationActive) {
      return {
        ok: false as const,
        error: "Complete savings setup (target and weekly commitment) before recording.",
      };
    }

    const existing = db.contributions.find(
      (c) =>
        c.challengeId === challengeId &&
        c.userId === userId &&
        c.idempotencyKey === key.key,
    );
    if (existing) {
      return {
        ok: true as const,
        contribution: existing,
        replayed: true,
        totals: computeTotals(
          db,
          challengeId,
          userId,
          challenge.startDate,
          challenge.endDate,
          challenge.currency,
        ),
      };
    }

    const week = weekStartMonday(local);
    const at = nowIso(now);
    const contribution: Contribution = {
      id: id(12),
      challengeId,
      membershipId: mem.id,
      userId,
      amountMinor: amount.minor,
      currency: challenge.currency,
      contributionDate: local,
      weekStart: week,
      status: "active",
      sourceLabel: "self-reported",
      idempotencyKey: key.key,
      createdAt: at,
      updatedAt: at,
      reversedAt: null,
    };
    db.contributions.push(contribution);
    db.contributionRevisions.push({
      id: id(),
      contributionId: contribution.id,
      challengeId,
      actorUserId: userId,
      action: "create",
      fromAmountMinor: null,
      toAmountMinor: amount.minor,
      fromStatus: null,
      toStatus: "active",
      contributionDate: local,
      weekStart: week,
      idempotencyKey: key.key,
      detail: "Self-reported contribution recorded",
      at,
    });

    return {
      ok: true as const,
      contribution,
      replayed: false,
      totals: computeTotals(
        db,
        challengeId,
        userId,
        challenge.startDate,
        challenge.endDate,
        challenge.currency,
      ),
    };
  });
}

export async function mockAmendContribution(
  userId: string,
  contributionId: string,
  amountMajor: string,
  now: Date = new Date(),
): Promise<AmendContributionResult> {
  const amount = validateContributionAmount(amountMajor);
  if (!amount.ok) return amount;

  return withChallengeDb((db) => {
    const contribution = db.contributions.find((c) => c.id === contributionId);
    if (!contribution) {
      return { ok: false as const, error: "Contribution not found." };
    }
    if (contribution.userId !== userId) {
      return { ok: false as const, error: "You can only correct your own contributions." };
    }
    if (contribution.status !== "active") {
      return {
        ok: false as const,
        error: "Only active contributions can be amended or reversed.",
      };
    }
    const challenge = db.challenges.find((c) => c.id === contribution.challengeId);
    if (!challenge) {
      return { ok: false as const, error: "Challenge not found." };
    }
    if (
      challenge.lifecycleStatus === "Completed" ||
      challenge.lifecycleStatus === "Cancelled"
    ) {
      return {
        ok: false as const,
        error: "Completed or cancelled challenges do not accept contribution changes.",
      };
    }

    if (contribution.amountMinor === amount.minor) {
      return {
        ok: true as const,
        contribution,
        unchanged: true,
        totals: computeTotals(
          db,
          challenge.id,
          userId,
          challenge.startDate,
          challenge.endDate,
          challenge.currency,
        ),
      };
    }

    const from = contribution.amountMinor;
    const at = nowIso(now);
    contribution.amountMinor = amount.minor;
    contribution.updatedAt = at;
    db.contributionRevisions.push({
      id: id(),
      contributionId: contribution.id,
      challengeId: challenge.id,
      actorUserId: userId,
      action: "amend",
      fromAmountMinor: from,
      toAmountMinor: amount.minor,
      fromStatus: "active",
      toStatus: "active",
      contributionDate: contribution.contributionDate,
      weekStart: contribution.weekStart,
      idempotencyKey: null,
      detail: "Self-reported contribution amended; original date and week preserved",
      at,
    });

    return {
      ok: true as const,
      contribution,
      unchanged: false,
      totals: computeTotals(
        db,
        challenge.id,
        userId,
        challenge.startDate,
        challenge.endDate,
        challenge.currency,
      ),
    };
  });
}

export async function mockReverseContribution(
  userId: string,
  contributionId: string,
  now: Date = new Date(),
): Promise<ReverseContributionResult> {
  return withChallengeDb((db) => {
    const contribution = db.contributions.find((c) => c.id === contributionId);
    if (!contribution) {
      return { ok: false as const, error: "Contribution not found." };
    }
    if (contribution.userId !== userId) {
      return { ok: false as const, error: "You can only correct your own contributions." };
    }
    if (contribution.status !== "active") {
      return {
        ok: false as const,
        error: "Only active contributions can be amended or reversed.",
      };
    }
    const challenge = db.challenges.find((c) => c.id === contribution.challengeId);
    if (!challenge) {
      return { ok: false as const, error: "Challenge not found." };
    }
    if (
      challenge.lifecycleStatus === "Completed" ||
      challenge.lifecycleStatus === "Cancelled"
    ) {
      return {
        ok: false as const,
        error: "Completed or cancelled challenges do not accept contribution changes.",
      };
    }

    const at = nowIso(now);
    const from = contribution.amountMinor;
    contribution.status = "reversed";
    contribution.reversedAt = at;
    contribution.updatedAt = at;
    db.contributionRevisions.push({
      id: id(),
      contributionId: contribution.id,
      challengeId: challenge.id,
      actorUserId: userId,
      action: "reverse",
      fromAmountMinor: from,
      toAmountMinor: from,
      fromStatus: "active",
      toStatus: "reversed",
      contributionDate: contribution.contributionDate,
      weekStart: contribution.weekStart,
      idempotencyKey: null,
      detail: "Self-reported contribution reversed; original date and week preserved",
      at,
    });

    return {
      ok: true as const,
      contribution,
      totals: computeTotals(
        db,
        challenge.id,
        userId,
        challenge.startDate,
        challenge.endDate,
        challenge.currency,
      ),
    };
  });
}

export async function mockListOwnContributions(
  userId: string,
  challengeId: string,
): Promise<OwnContributionsView | null> {
  const db = await readChallengeDb();
  const mem = findMembership(db, challengeId, userId);
  if (!mem || mem.status !== "approved") return null;
  const contributions = db.contributions
    .filter((c) => c.challengeId === challengeId && c.userId === userId)
    .sort((a, b) => {
      const d = b.contributionDate.localeCompare(a.contributionDate);
      return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt);
    });
  const ids = new Set(contributions.map((c) => c.id));
  const revisions = db.contributionRevisions
    .filter((r) => r.challengeId === challengeId && ids.has(r.contributionId))
    .sort((a, b) => a.at.localeCompare(b.at));
  return { contributions, revisions };
}

export async function mockOwnEligibleTotals(
  userId: string,
  challengeId: string,
  now: Date = new Date(),
): Promise<EligibleTotals | null> {
  const row = await getChallengeForUser(challengeId, userId, now);
  if (!row) return null;
  const db = await readChallengeDb();
  return computeTotals(
    db,
    challengeId,
    userId,
    row.challenge.startDate,
    row.challenge.endDate,
    row.challenge.currency,
  );
}

export async function resetMockContributionState(): Promise<void> {
  await withChallengeDb((db) => {
    db.contributions = [];
    db.contributionRevisions = [];
  });
}
