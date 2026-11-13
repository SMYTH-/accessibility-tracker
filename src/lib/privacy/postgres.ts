import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPrivacyRpcError } from "./errors";
import { mapPrivacySettingsList } from "./map";
import type { OptOutResult, PrivacySettingsList } from "./types";

type OptOutPayload = {
  membership_id: string;
  user_id: string;
  challenge_id: string;
  share_monetary_info: boolean;
  changed: boolean;
  updated_at: string;
};

export async function pgListOwnPrivacySettings(
  supabase: SupabaseClient,
): Promise<PrivacySettingsList> {
  const { data, error } = await supabase.rpc("list_own_privacy_settings");
  if (error) throw new Error(mapPrivacyRpcError(error));
  return mapPrivacySettingsList(
    data as Parameters<typeof mapPrivacySettingsList>[0],
  );
}

export async function pgOptOutShareMonetaryInfo(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<OptOutResult> {
  const { data, error } = await supabase.rpc("set_own_share_monetary_info", {
    p_challenge_id: challengeId,
    p_share: false,
  });
  if (error) return { ok: false, error: mapPrivacyRpcError(error) };
  const payload = data as OptOutPayload;
  if (payload.share_monetary_info !== false) {
    return { ok: false, error: "Privacy update did not opt out." };
  }
  return {
    ok: true,
    membershipId: payload.membership_id,
    challengeId: payload.challenge_id,
    shareMonetaryInfo: false,
    changed: Boolean(payload.changed),
    updatedAt: payload.updated_at,
  };
}
