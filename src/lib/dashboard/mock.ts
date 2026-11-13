import { recomputeMemberAssessments } from "@/lib/assessment/engine";
import { compareYmd, zonedYmd } from "@/lib/challenge/time";
import { readChallengeDb } from "@/lib/challenge/store";
import type { Challenge, Membership } from "@/lib/challenge/types";
import {
  milestoneRecognitionLabel,
  milestonesReached,
  progressPercent,
} from "./progress";
import type {
  ActivityPreviewEvent,
  ChallengeDashboard,
  RosterMemberProjection,
  SharingMemberTotals,
} from "./types";

function findChallenge(challenges: Challenge[], id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}

function approvedMembership(
  memberships: Membership[],
  challengeId: string,
  userId: string,
): Membership | undefined {
  return memberships.find(
    (m) =>
      m.challengeId === challengeId &&
      m.userId === userId &&
      m.status === "approved",
  );
}

function eligibleSaved(
  challengeId: string,
  userId: string,
  startDate: string,
  endDate: string,
  contributions: { challengeId: string; userId: string; status: string; contributionDate: string; amountMinor: number }[],
): number {
  return contributions
    .filter(
      (c) =>
        c.challengeId === challengeId &&
        c.userId === userId &&
        c.status === "active" &&
        compareYmd(c.contributionDate, startDate) >= 0 &&
        compareYmd(c.contributionDate, endDate) <= 0,
    )
    .reduce((sum, c) => sum + c.amountMinor, 0);
}

export async function mockSharingMemberTotals(
  userId: string,
  challengeId: string,
): Promise<SharingMemberTotals | null> {
  const db = await readChallengeDb();
  const challenge = findChallenge(db.challenges, challengeId);
  if (!challenge) return null;
  if (!approvedMembership(db.memberships, challengeId, userId)) return null;

  const sharers = db.memberships.filter(
    (m) =>
      m.challengeId === challengeId &&
      m.status === "approved" &&
      m.shareMonetaryInfo,
  );

  let saved = 0;
  let target = 0;
  let count = 0;
  for (const m of sharers) {
    const setup = db.savingsSetups.find(
      (s) => s.challengeId === challengeId && s.userId === m.userId,
    );
    if (!setup) continue;
    count += 1;
    target += setup.targetMinor;
    saved += eligibleSaved(
      challengeId,
      m.userId,
      challenge.startDate,
      challenge.endDate,
      db.contributions,
    );
  }

  return {
    savedMinor: saved,
    targetMinor: target,
    progressPercent: progressPercent(saved, target > 0 ? target : null),
    sharerCount: count,
    currency: challenge.currency,
    label: "Sharing members only",
    scopeExplanation:
      "Excludes members who opted out of sharing monetary information. Not a full-group total.",
    sourceLabel: "self-reported",
    generatedAt: new Date().toISOString(),
  };
}

export async function mockRosterProjection(
  userId: string,
  challengeId: string,
): Promise<RosterMemberProjection[] | null> {
  const db = await readChallengeDb();
  const challenge = findChallenge(db.challenges, challengeId);
  if (!challenge) return null;
  if (!approvedMembership(db.memberships, challengeId, userId)) return null;

  return db.memberships
    .filter((m) => m.challengeId === challengeId && m.status === "approved")
    .map((m) => {
      const isSelf = m.userId === userId;
      const showMoney = isSelf || m.shareMonetaryInfo;
      const base: RosterMemberProjection = {
        membershipId: m.id,
        userId: m.userId,
        displayName: m.userId,
        role: m.role,
        status: m.status,
        shareMonetaryInfo: m.shareMonetaryInfo,
        savingsParticipationActive: m.savingsParticipationActive,
        isSelf,
        privacyChip: showMoney ? null : "Private",
      };
      if (!showMoney) return base;
      const setup = db.savingsSetups.find(
        (s) => s.challengeId === challengeId && s.userId === m.userId,
      );
      const saved = eligibleSaved(
        challengeId,
        m.userId,
        challenge.startDate,
        challenge.endDate,
        db.contributions,
      );
      return {
        ...base,
        eligibleTotalMinor: saved,
        targetMinor: setup?.targetMinor ?? null,
        progressPercent: progressPercent(saved, setup?.targetMinor ?? null),
        weeklyCommitmentMinor: setup?.weeklyCommitmentMinor ?? null,
        currency: challenge.currency,
        sourceLabel: "self-reported" as const,
      };
    });
}

export async function mockActivityPreview(
  userId: string,
  challengeId: string,
): Promise<ActivityPreviewEvent[] | null> {
  const db = await readChallengeDb();
  const challenge = findChallenge(db.challenges, challengeId);
  if (!challenge) return null;
  if (!approvedMembership(db.memberships, challengeId, userId)) return null;

  const events: ActivityPreviewEvent[] = [];
  // Privacy filter BEFORE order/limit: self always; others only when sharing.
  const rows = [...db.contributions]
    .filter((c) => {
      if (c.challengeId !== challengeId || c.status !== "active") return false;
      const mem = db.memberships.find(
        (m) =>
          m.challengeId === challengeId &&
          m.userId === c.userId &&
          m.status === "approved",
      );
      if (!mem) return false;
      return c.userId === userId || mem.shareMonetaryInfo;
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 8);

  for (const c of rows) {
    events.push({
      id: c.id,
      kind: "contribution",
      userId: c.userId,
      displayName: c.userId,
      title: `${c.userId} recorded a self-reported contribution`,
      meta: `Self-reported · ${c.contributionDate}`,
      amountMinor: c.amountMinor,
      currency: challenge.currency,
      at: c.updatedAt,
    });
  }
  return events;
}

export async function mockChallengeDashboard(
  userId: string,
  challengeId: string,
): Promise<ChallengeDashboard | null> {
  const db = await readChallengeDb();
  const challenge = findChallenge(db.challenges, challengeId);
  if (!challenge) return null;
  const membership = approvedMembership(db.memberships, challengeId, userId);
  if (!membership) return null;

  const setup = db.savingsSetups.find(
    (s) => s.challengeId === challengeId && s.userId === userId,
  );
  const saved = eligibleSaved(
    challengeId,
    userId,
    challenge.startDate,
    challenge.endDate,
    db.contributions,
  );
  const target = setup?.targetMinor ?? null;
  const miles = milestonesReached(saved, target);
  const sharing = await mockSharingMemberTotals(userId, challengeId);
  const roster = await mockRosterProjection(userId, challengeId);
  const activity = await mockActivityPreview(userId, challengeId);
  if (!sharing || !roster || !activity) return null;

  let commitmentEligible = 0;
  let preAssessment = 0;
  const eligibleByWeekStart = new Map<string, number>();
  for (const c of db.contributions) {
    if (
      c.challengeId !== challengeId ||
      c.userId !== userId ||
      c.status !== "active"
    ) {
      continue;
    }
    if (
      compareYmd(c.contributionDate, challenge.startDate) < 0 ||
      compareYmd(c.contributionDate, challenge.endDate) > 0
    ) {
      continue;
    }
    if (setup?.firstAssessedWeekStart) {
      if (compareYmd(c.weekStart, setup.firstAssessedWeekStart) >= 0) {
        commitmentEligible += c.amountMinor;
      } else {
        preAssessment += c.amountMinor;
      }
    } else {
      commitmentEligible += c.amountMinor;
    }
    eligibleByWeekStart.set(
      c.weekStart,
      (eligibleByWeekStart.get(c.weekStart) ?? 0) + c.amountMinor,
    );
  }

  const assessment = recomputeMemberAssessments({
    savingsParticipationActive: membership.savingsParticipationActive,
    firstAssessedWeekStart: setup?.firstAssessedWeekStart ?? null,
    weeklyCommitmentMinor: setup?.weeklyCommitmentMinor ?? null,
    challengeStartDate: challenge.startDate,
    challengeEndDate: challenge.endDate,
    currentLocalYmd: zonedYmd(new Date(), challenge.timeZone),
    eligibleByWeekStart,
  });

  return {
    challengeId: challenge.id,
    challengeName: challenge.name,
    lifecycleStatus: challenge.lifecycleStatus,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    currency: challenge.currency,
    timeZone: challenge.timeZone,
    personal: {
      eligibleTotalMinor: saved,
      commitmentEligibleMinor: commitmentEligible,
      preAssessmentMinor: preAssessment,
      targetMinor: target,
      weeklyCommitmentMinor: setup?.weeklyCommitmentMinor ?? null,
      currentProgressPercent: progressPercent(saved, target),
      milestonesReached: miles,
      highestMilestoneReached: miles.length ? miles[miles.length - 1] : null,
      milestoneRecognitionLabel: milestoneRecognitionLabel(miles),
      sourceLabel: "self-reported",
      currency: challenge.currency,
      savingsParticipationActive: membership.savingsParticipationActive,
      shareMonetaryInfo: membership.shareMonetaryInfo,
      firstAssessedWeekStart: setup?.firstAssessedWeekStart ?? null,
      streakWeeks: assessment.streakWeeks,
      streakLabel: "Your streak",
      streakStatus: assessment.streakStatus,
      weeklyAssessmentStatus: assessment.weeklyAssessmentStatus,
      currentWeekStart: assessment.currentWeekStart,
      currentWeekEligibleMinor: assessment.currentWeekEligibleMinor,
      assessmentHistory: assessment.history,
    },
    sharing,
    roster,
    activityPreview: activity,
    generatedAt: new Date().toISOString(),
  };
}

/** Mock-only privacy fixture helper (M7 owns settings UX). */
export async function mockSetShareMonetaryInfo(
  challengeId: string,
  userId: string,
  share: boolean,
): Promise<boolean> {
  const { withChallengeDb } = await import("@/lib/challenge/store");
  return withChallengeDb((db) => {
    const m = db.memberships.find(
      (row) =>
        row.challengeId === challengeId &&
        row.userId === userId &&
        row.status === "approved",
    );
    if (!m) return false;
    m.shareMonetaryInfo = share;
    m.updatedAt = new Date().toISOString();
    return true;
  });
}
