import { withChallengeDb } from "@/lib/challenge/store";
import type { OptOutResult, PrivacySettingsList } from "./types";

export async function mockListOwnPrivacySettings(
  userId: string,
): Promise<PrivacySettingsList> {
  return withChallengeDb((db) => {
    const items = db.memberships
      .filter((m) => m.userId === userId && m.status === "approved")
      .map((m) => {
        const challenge = db.challenges.find((c) => c.id === m.challengeId);
        if (!challenge) return null;
        return {
          challengeId: challenge.id,
          challengeName: challenge.name,
          lifecycleStatus: challenge.lifecycleStatus,
          currency: challenge.currency,
          membershipId: m.id,
          role: m.role,
          shareMonetaryInfo: m.shareMonetaryInfo,
          savingsParticipationActive: m.savingsParticipationActive,
          updatedAt: m.updatedAt,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
    return {
      items,
      defaultVisible: true as const,
      reoptInStatus: "open_deferred" as const,
      smallGroupSuppressionStatus: "open" as const,
    };
  });
}

export async function mockOptOutShareMonetaryInfo(
  userId: string,
  challengeId: string,
): Promise<OptOutResult> {
  return withChallengeDb((db) => {
    const m = db.memberships.find(
      (row) =>
        row.challengeId === challengeId &&
        row.userId === userId &&
        row.status === "approved",
    );
    if (!m) {
      return {
        ok: false as const,
        error: "You must be an approved member of this challenge.",
      };
    }
    if (!m.shareMonetaryInfo) {
      return {
        ok: true as const,
        membershipId: m.id,
        challengeId: m.challengeId,
        shareMonetaryInfo: false as const,
        changed: false,
        updatedAt: m.updatedAt,
      };
    }
    m.shareMonetaryInfo = false;
    m.updatedAt = new Date().toISOString();
    return {
      ok: true as const,
      membershipId: m.id,
      challengeId: m.challengeId,
      shareMonetaryInfo: false as const,
      changed: true,
      updatedAt: m.updatedAt,
    };
  });
}
