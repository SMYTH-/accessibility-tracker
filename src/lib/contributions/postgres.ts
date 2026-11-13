import type { SupabaseClient } from "@supabase/supabase-js";
import { mapContributionRpcError } from "./errors";
import {
  mapContribution,
  mapRevision,
  mapTotals,
  type ContributionRevisionRow,
  type ContributionRow,
  type EligibleTotalsRow,
} from "./map";
import { validateContributionAmount, validateIdempotencyKey } from "./validate";
import type {
  AmendContributionResult,
  EligibleTotals,
  OwnContributionsView,
  RecordContributionResult,
  ReverseContributionResult,
} from "./types";

type RecordPayload = {
  contribution: ContributionRow;
  replayed: boolean;
  totals: EligibleTotalsRow;
};

type AmendPayload = {
  contribution: ContributionRow;
  unchanged: boolean;
  totals: EligibleTotalsRow;
};

type ReversePayload = {
  contribution: ContributionRow;
  totals: EligibleTotalsRow;
};

type ListPayload = {
  contributions: ContributionRow[];
  revisions: ContributionRevisionRow[];
};

export async function pgRecordContribution(
  supabase: SupabaseClient,
  challengeId: string,
  amountMajor: string,
  idempotencyKey: string,
): Promise<RecordContributionResult> {
  const amount = validateContributionAmount(amountMajor);
  if (!amount.ok) return amount;
  const key = validateIdempotencyKey(idempotencyKey);
  if (!key.ok) return key;

  const { data, error } = await supabase.rpc("record_contribution", {
    p_challenge_id: challengeId,
    p_amount_minor: amount.minor,
    p_idempotency_key: key.key,
  });
  if (error) return { ok: false, error: mapContributionRpcError(error) };
  const payload = data as RecordPayload;
  return {
    ok: true,
    contribution: mapContribution(payload.contribution),
    replayed: Boolean(payload.replayed),
    totals: mapTotals(payload.totals),
  };
}

export async function pgAmendContribution(
  supabase: SupabaseClient,
  contributionId: string,
  amountMajor: string,
): Promise<AmendContributionResult> {
  const amount = validateContributionAmount(amountMajor);
  if (!amount.ok) return amount;

  const { data, error } = await supabase.rpc("amend_contribution", {
    p_contribution_id: contributionId,
    p_amount_minor: amount.minor,
  });
  if (error) return { ok: false, error: mapContributionRpcError(error) };
  const payload = data as AmendPayload;
  return {
    ok: true,
    contribution: mapContribution(payload.contribution),
    unchanged: Boolean(payload.unchanged),
    totals: mapTotals(payload.totals),
  };
}

export async function pgReverseContribution(
  supabase: SupabaseClient,
  contributionId: string,
): Promise<ReverseContributionResult> {
  const { data, error } = await supabase.rpc("reverse_contribution", {
    p_contribution_id: contributionId,
  });
  if (error) return { ok: false, error: mapContributionRpcError(error) };
  const payload = data as ReversePayload;
  return {
    ok: true,
    contribution: mapContribution(payload.contribution),
    totals: mapTotals(payload.totals),
  };
}

export async function pgListOwnContributions(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<OwnContributionsView | null> {
  const { data, error } = await supabase.rpc("list_own_contributions", {
    p_challenge_id: challengeId,
  });
  if (error) {
    if (error.message?.includes("MEMBERSHIP_REQUIRED")) return null;
    throw new Error(mapContributionRpcError(error));
  }
  const payload = data as ListPayload;
  return {
    contributions: (payload.contributions ?? []).map(mapContribution),
    revisions: (payload.revisions ?? []).map(mapRevision),
  };
}

export async function pgOwnEligibleTotals(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<EligibleTotals | null> {
  const { data, error } = await supabase.rpc("own_eligible_totals", {
    p_challenge_id: challengeId,
  });
  if (error) {
    if (error.message?.includes("MEMBERSHIP_REQUIRED")) return null;
    throw new Error(mapContributionRpcError(error));
  }
  return mapTotals(data as EligibleTotalsRow);
}
