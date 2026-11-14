import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRow } from "@/lib/challenge/map";
import { mapSavingsRpcError } from "./errors";
import { mapMembershipFromRpc, mapSavingsSetup, type SavingsSetupRow } from "./map";
import { validateSavingsAmounts } from "./validate";
import { parsePositiveMajorToMinor } from "./money";
import type {
  ActivateSavingsResult,
  OwnSavingsView,
  UpdateTargetResult,
} from "./types";

type ActivatePayload = {
  membership: MembershipRow;
  setup: SavingsSetupRow;
};

type OwnPayload = {
  membership: MembershipRow;
  setup: SavingsSetupRow | null;
  savings_participation_active: boolean;
};

export async function pgActivateSavings(
  supabase: SupabaseClient,
  challengeId: string,
  targetMajor: string,
  weeklyCommitmentMajor: string,
): Promise<ActivateSavingsResult> {
  const amounts = validateSavingsAmounts(targetMajor, weeklyCommitmentMajor);
  if (!amounts.ok) return amounts;

  const { data, error } = await supabase.rpc("activate_savings_setup", {
    p_challenge_id: challengeId,
    p_target_minor: amounts.value.targetMinor,
    p_weekly_commitment_minor: amounts.value.weeklyCommitmentMinor,
  });
  if (error) return { ok: false, error: mapSavingsRpcError(error) };
  const payload = data as ActivatePayload;
  return {
    ok: true,
    membership: mapMembershipFromRpc(payload.membership),
    setup: mapSavingsSetup(payload.setup),
  };
}

/** Signed-in path calls parked RPC; always maps TARGET_CHANGE_DEFERRED for members. */
export async function pgUpdateTarget(
  supabase: SupabaseClient,
  challengeId: string,
  targetMajor: string,
): Promise<UpdateTargetResult> {
  const target = parsePositiveMajorToMinor(targetMajor, "Personal savings target");
  if (!target.ok) return target;

  const { data, error } = await supabase.rpc("update_savings_target", {
    p_challenge_id: challengeId,
    p_target_minor: target.minor,
  });
  if (error) return { ok: false, error: mapSavingsRpcError(error) };
  // Parked RPC should never succeed for signed-in callers; treat unexpected success as deferred.
  void data;
  return {
    ok: false,
    error:
      "Changing your personal target after activation is not available yet.",
  };
}

export async function pgGetOwnSavings(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<OwnSavingsView | null> {
  const { data, error } = await supabase.rpc("get_own_savings_setup", {
    p_challenge_id: challengeId,
  });
  if (error) {
    if (error.message?.includes("MEMBERSHIP_REQUIRED")) return null;
    throw new Error(mapSavingsRpcError(error));
  }
  if (!data) return null;
  const payload = data as OwnPayload;
  return {
    membership: mapMembershipFromRpc(payload.membership),
    setup: payload.setup ? mapSavingsSetup(payload.setup) : null,
    savingsParticipationActive: Boolean(payload.savings_participation_active),
  };
}
