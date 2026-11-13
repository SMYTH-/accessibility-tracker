import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";
import { createClient } from "@/lib/auth/supabase/server";
import {
  mockAmendContribution,
  mockListOwnContributions,
  mockOwnEligibleTotals,
  mockRecordContribution,
  mockReverseContribution,
} from "./mock";
import {
  pgAmendContribution,
  pgListOwnContributions,
  pgOwnEligibleTotals,
  pgRecordContribution,
  pgReverseContribution,
} from "./postgres";
import type {
  AmendContributionResult,
  EligibleTotals,
  OwnContributionsView,
  RecordContributionResult,
  ReverseContributionResult,
} from "./types";

function isPostgresMode(): boolean {
  return getAuthMode() === "supabase";
}

async function userClient(): Promise<SupabaseClient> {
  return createClient();
}

export async function recordContribution(
  userId: string,
  challengeId: string,
  amountMajor: string,
  idempotencyKey: string,
  now: Date = new Date(),
): Promise<RecordContributionResult> {
  if (isPostgresMode()) {
    void userId;
    void now;
    return pgRecordContribution(
      await userClient(),
      challengeId,
      amountMajor,
      idempotencyKey,
    );
  }
  return mockRecordContribution(
    userId,
    challengeId,
    amountMajor,
    idempotencyKey,
    now,
  );
}

export async function amendContribution(
  userId: string,
  contributionId: string,
  amountMajor: string,
  now: Date = new Date(),
): Promise<AmendContributionResult> {
  if (isPostgresMode()) {
    void userId;
    void now;
    return pgAmendContribution(await userClient(), contributionId, amountMajor);
  }
  return mockAmendContribution(userId, contributionId, amountMajor, now);
}

export async function reverseContribution(
  userId: string,
  contributionId: string,
  now: Date = new Date(),
): Promise<ReverseContributionResult> {
  if (isPostgresMode()) {
    void userId;
    void now;
    return pgReverseContribution(await userClient(), contributionId);
  }
  return mockReverseContribution(userId, contributionId, now);
}

export async function listOwnContributions(
  userId: string,
  challengeId: string,
): Promise<OwnContributionsView | null> {
  if (isPostgresMode()) {
    void userId;
    return pgListOwnContributions(await userClient(), challengeId);
  }
  return mockListOwnContributions(userId, challengeId);
}

export async function getOwnEligibleTotals(
  userId: string,
  challengeId: string,
  now: Date = new Date(),
): Promise<EligibleTotals | null> {
  if (isPostgresMode()) {
    void userId;
    void now;
    return pgOwnEligibleTotals(await userClient(), challengeId);
  }
  return mockOwnEligibleTotals(userId, challengeId, now);
}

export { resetMockContributionState } from "./mock";
