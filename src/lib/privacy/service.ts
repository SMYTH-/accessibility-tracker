import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";
import { createClient } from "@/lib/auth/supabase/server";
import { mockListOwnPrivacySettings, mockOptOutShareMonetaryInfo } from "./mock";
import { pgListOwnPrivacySettings, pgOptOutShareMonetaryInfo } from "./postgres";
import type { OptOutResult, PrivacySettingsList } from "./types";

function isPostgresMode(): boolean {
  return getAuthMode() === "supabase";
}

async function userClient(): Promise<SupabaseClient> {
  return createClient();
}

export async function listOwnPrivacySettings(
  userId: string,
): Promise<PrivacySettingsList> {
  if (isPostgresMode()) {
    void userId;
    return pgListOwnPrivacySettings(await userClient());
  }
  return mockListOwnPrivacySettings(userId);
}

/** Opt out only. Re-opt-in remains OPEN / deferred — not invented. */
export async function optOutShareMonetaryInfo(
  userId: string,
  challengeId: string,
): Promise<OptOutResult> {
  if (isPostgresMode()) {
    void userId;
    return pgOptOutShareMonetaryInfo(await userClient(), challengeId);
  }
  return mockOptOutShareMonetaryInfo(userId, challengeId);
}
