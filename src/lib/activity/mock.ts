import { recomputeMemberAssessments } from "@/lib/assessment/engine";
import { compareYmd, zonedYmd } from "@/lib/challenge/time";
import { readChallengeDb } from "@/lib/challenge/store";
import type { Challenge, Membership } from "@/lib/challenge/types";
import {
  milestoneRecognitionLabel,
  milestonesReached,
  progressPercent,
} from "@/lib/dashboard/progress";
import {
  mockRosterProjection,
  mockSharingMemberTotals,
} from "@/lib/dashboard/mock";
import type {
  ActivityFeed,
  ActivityFeedEvent,
  ChallengeCompletionSummary,
} from "./types";

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

function findChallenge(challenges: Challenge[], id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}

function displayName(userId: string): string {
  return userId;
}

/** Build full feed with membership + privacy before sort/limit. */
export async function mockActivityFeed(
  userId: string,
  challengeId: string,
  limit = 50,
  before: string | null = null,
): Promise<ActivityFeed | null> {
  const db = await readChallengeDb();
  const challenge = findChallenge(db.challenges, challengeId);
  if (!challenge) return null;
  if (!approvedMembership(db.memberships, challengeId, userId)) return null;

  const events: ActivityFeedEvent[] = [];

  for (const m of db.memberships) {
    if (m.challengeId !== challengeId || m.status !== "approved") continue;
    const at = m.updatedAt || m.createdAt;
    events.push({
      id: `join:${m.id}`,
      kind: "member_joined",
      userId: m.userId,
      displayName: displayName(m.userId),
      title: `${displayName(m.userId)} joined the challenge`,
      meta: "Approved member",
      at,
    });
  }

  // Privacy filter BEFORE collecting contribution/commitment/milestone events.
  for (const c of db.contributions) {
    if (c.challengeId !== challengeId || c.status !== "active") continue;
    const mem = approvedMembership(db.memberships, challengeId, c.userId);
    if (!mem) continue;
    if (c.userId !== userId && !mem.shareMonetaryInfo) continue;
    events.push({
      id: `contrib:${c.id}`,
      kind: "contribution",
      userId: c.userId,
      displayName: displayName(c.userId),
      title: `${displayName(c.userId)} recorded a self-reported contribution`,
      meta: `Self-reported · ${c.contributionDate}`,
      amountMinor: c.amountMinor,
      currency: challenge.currency,
      at: c.updatedAt,
    });
  }

  // Commitment completions: recompute personal assessments; privacy before emit.
  for (const mem of db.memberships) {
    if (mem.challengeId !== challengeId || mem.status !== "approved") continue;
    if (mem.userId !== userId && !mem.shareMonetaryInfo) continue;
    const setup = db.savingsSetups.find(
      (s) => s.challengeId === challengeId && s.userId === mem.userId,
    );
    const eligibleByWeekStart = new Map<string, number>();
    for (const c of db.contributions) {
      if (
        c.challengeId !== challengeId ||
        c.userId !== mem.userId ||
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
      eligibleByWeekStart.set(
        c.weekStart,
        (eligibleByWeekStart.get(c.weekStart) ?? 0) + c.amountMinor,
      );
    }
    const assessment = recomputeMemberAssessments({
      savingsParticipationActive: mem.savingsParticipationActive,
      firstAssessedWeekStart: setup?.firstAssessedWeekStart ?? null,
      weeklyCommitmentMinor: setup?.weeklyCommitmentMinor ?? null,
      challengeStartDate: challenge.startDate,
      challengeEndDate: challenge.endDate,
      currentLocalYmd: zonedYmd(new Date(), challenge.timeZone),
      eligibleByWeekStart,
    });
    for (const w of assessment.history) {
      if (w.status !== "completed") continue;
      events.push({
        id: `commit:${challengeId}:${mem.userId}:${w.weekStart}`,
        kind: "commitment_completed",
        userId: mem.userId,
        displayName: displayName(mem.userId),
        title: `${displayName(mem.userId)} completed weekly commitment`,
        meta: `Week of ${w.weekStart}`,
        // No commitment figures in shared feed — personal history stays own-view.
        at: `${w.weekStart}T23:59:59.000Z`,
      });
    }
  }

  // Milestone crossings from eligible contribution running totals (G1.1-08).
  const byUser = new Map<string, typeof db.contributions>();
  for (const c of db.contributions) {
    if (c.challengeId !== challengeId || c.status !== "active") continue;
    const mem = approvedMembership(db.memberships, challengeId, c.userId);
    if (!mem) continue;
    if (c.userId !== userId && !mem.shareMonetaryInfo) continue;
    if (
      compareYmd(c.contributionDate, challenge.startDate) < 0 ||
      compareYmd(c.contributionDate, challenge.endDate) > 0
    ) {
      continue;
    }
    const list = byUser.get(c.userId) ?? [];
    list.push(c);
    byUser.set(c.userId, list);
  }
  for (const [uid, list] of byUser) {
    const setup = db.savingsSetups.find(
      (s) => s.challengeId === challengeId && s.userId === uid,
    );
    if (!setup || setup.targetMinor <= 0) continue;
    const ordered = [...list].sort((a, b) => {
      const d = a.contributionDate.localeCompare(b.contributionDate);
      if (d !== 0) return d;
      return a.updatedAt.localeCompare(b.updatedAt);
    });
    let running = 0;
    for (const c of ordered) {
      const prev = running;
      running += c.amountMinor;
      for (const thr of [25, 50, 75, 100] as const) {
        const prevPct = progressPercent(prev, setup.targetMinor) ?? 0;
        const nextPct = progressPercent(running, setup.targetMinor) ?? 0;
        if (prevPct < thr && nextPct >= thr) {
          const label =
            thr === 25
              ? "25% Quarter milestone"
              : thr === 50
                ? "50% Halfway milestone"
                : thr === 75
                  ? "75% Three-quarters milestone"
                  : "100% Target milestone";
          events.push({
            id: `mile:${c.id}:${thr}`,
            kind: "milestone_reached",
            userId: uid,
            displayName: displayName(uid),
            title: `${displayName(uid)} reached ${label}`,
            meta: "Personal progress milestone · G1.1-08",
            milestonePercent: thr,
            at: c.updatedAt,
          });
        }
      }
    }
  }

  for (const a of db.audit) {
    if (a.challengeId !== challengeId || a.toStatus !== "Completed") continue;
    events.push({
      id: `done:${a.id}`,
      kind: "challenge_completed",
      userId: a.actorUserId ?? challenge.ownerUserId,
      displayName: "Challenge",
      title: "Challenge completed",
      meta: a.reason || "End date reached",
      at: a.at,
    });
  }

  const capped = Math.max(1, Math.min(limit, 100));
  const filtered = events
    .filter((e) => (before ? e.at < before : true))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : -1))
    .slice(0, capped);

  return {
    events: filtered,
    limit: capped,
    before,
    generatedAt: new Date().toISOString(),
    readOnly:
      challenge.lifecycleStatus === "Completed" ||
      challenge.lifecycleStatus === "Cancelled",
  };
}

export async function mockCompletionSummary(
  userId: string,
  challengeId: string,
): Promise<ChallengeCompletionSummary | null> {
  const db = await readChallengeDb();
  const challenge = findChallenge(db.challenges, challengeId);
  if (!challenge) return null;
  const membership = approvedMembership(db.memberships, challengeId, userId);
  if (!membership) return null;
  if (challenge.lifecycleStatus !== "Completed") return null;

  const setup = db.savingsSetups.find(
    (s) => s.challengeId === challengeId && s.userId === userId,
  );
  const saved = db.contributions
    .filter(
      (c) =>
        c.challengeId === challengeId &&
        c.userId === userId &&
        c.status === "active" &&
        compareYmd(c.contributionDate, challenge.startDate) >= 0 &&
        compareYmd(c.contributionDate, challenge.endDate) <= 0,
    )
    .reduce((sum, c) => sum + c.amountMinor, 0);
  const target = setup?.targetMinor ?? null;
  const miles = milestonesReached(saved, target);
  const sharing = await mockSharingMemberTotals(userId, challengeId);
  const roster = await mockRosterProjection(userId, challengeId);
  const activity = await mockActivityFeed(userId, challengeId, 20, null);
  if (!sharing || !roster || !activity) return null;

  const approved = db.memberships.filter(
    (m) => m.challengeId === challengeId && m.status === "approved",
  );

  return {
    challengeId: challenge.id,
    challengeName: challenge.name,
    lifecycleStatus: "Completed",
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    currency: challenge.currency,
    timeZone: challenge.timeZone,
    readOnly: true,
    participantCount: approved.length,
    activeSaverCount: approved.filter((m) => m.savingsParticipationActive).length,
    personal: {
      eligibleTotalMinor: saved,
      targetMinor: target,
      currentProgressPercent: progressPercent(saved, target),
      milestonesReached: miles,
      highestMilestoneReached: miles.length ? miles[miles.length - 1] : null,
      milestoneRecognitionLabel: milestoneRecognitionLabel(miles),
      weeklyCommitmentMinor: setup?.weeklyCommitmentMinor ?? null,
      savingsParticipationActive: membership.savingsParticipationActive,
      shareMonetaryInfo: membership.shareMonetaryInfo,
      sourceLabel: "self-reported",
      currency: challenge.currency,
    },
    sharing,
    roster,
    activity: activity.events,
    generatedAt: new Date().toISOString(),
  };
}

