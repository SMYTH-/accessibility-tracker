"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { formatMinorAsMajor } from "@/lib/savings/money";
import {
  RATE_LIMITED_MESSAGE,
  consumeRateLimit,
} from "@/lib/security/rate-limit";
import {
  amendContribution,
  recordContribution,
  reverseContribution,
} from "./service";

export type ContributionActionState = {
  error?: string;
  message?: string;
  /** Fresh key for the next create attempt after a successful (or replayed) submit. */
  nextIdempotencyKey?: string;
  /** Structured confirmation for record UI (amounts in minor units). */
  confirmation?: {
    recordedMinor: number;
    currency: string;
    contributionDate: string;
    eligibleTotalMinor: number;
    targetMinor: number | null;
    previousEligibleMinor: number | null;
    replayed: boolean;
  };
};

export async function recordContributionAction(
  _prev: ContributionActionState,
  formData: FormData,
): Promise<ContributionActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const rate = await consumeRateLimit("contribution.record", user.id);
  if (!rate.allowed) {
    return { error: RATE_LIMITED_MESSAGE, nextIdempotencyKey: randomUUID() };
  }

  const challengeId = String(formData.get("challengeId") ?? "");
  const amountMajor = String(formData.get("amountMajor") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");

  const result = await recordContribution(
    user.id,
    challengeId,
    amountMajor,
    idempotencyKey,
  );
  if (!result.ok) {
    return { error: result.error, nextIdempotencyKey: idempotencyKey || randomUUID() };
  }

  revalidatePath(`/challenge/${challengeId}`);
  revalidatePath("/home");

  const amount = formatMinorAsMajor(
    result.contribution.amountMinor,
    result.contribution.currency,
  );
  const total = formatMinorAsMajor(
    result.totals.eligibleTotalMinor,
    result.totals.currency,
  );
  const replayNote = result.replayed ? " (same retry — counted once)." : "";
  const previousEligibleMinor = result.replayed
    ? result.totals.eligibleTotalMinor
    : Math.max(0, result.totals.eligibleTotalMinor - result.contribution.amountMinor);
  return {
    message: `Recorded ${amount} on ${result.contribution.contributionDate} (self-reported). Eligible total ${total}.${replayNote}`,
    nextIdempotencyKey: randomUUID(),
    confirmation: {
      recordedMinor: result.contribution.amountMinor,
      currency: result.contribution.currency,
      contributionDate: result.contribution.contributionDate,
      eligibleTotalMinor: result.totals.eligibleTotalMinor,
      targetMinor: result.totals.targetMinor,
      previousEligibleMinor,
      replayed: result.replayed,
    },
  };
}

export async function amendContributionAction(
  _prev: ContributionActionState,
  formData: FormData,
): Promise<ContributionActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const challengeId = String(formData.get("challengeId") ?? "");
  const contributionId = String(formData.get("contributionId") ?? "");
  const amountMajor = String(formData.get("amountMajor") ?? "");

  const result = await amendContribution(user.id, contributionId, amountMajor);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/challenge/${challengeId}`);
  revalidatePath("/home");

  const amount = formatMinorAsMajor(
    result.contribution.amountMinor,
    result.contribution.currency,
  );
  return {
    message: result.unchanged
      ? "Amount unchanged."
      : `Amended to ${amount}. Original date ${result.contribution.contributionDate} and week ${result.contribution.weekStart} kept.`,
  };
}

export async function reverseContributionAction(
  _prev: ContributionActionState,
  formData: FormData,
): Promise<ContributionActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const challengeId = String(formData.get("challengeId") ?? "");
  const contributionId = String(formData.get("contributionId") ?? "");

  const result = await reverseContribution(user.id, contributionId);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/challenge/${challengeId}`);
  revalidatePath("/home");

  return {
    message: `Reversed. Original date ${result.contribution.contributionDate} kept in audit; amount excluded from eligible totals.`,
  };
}
