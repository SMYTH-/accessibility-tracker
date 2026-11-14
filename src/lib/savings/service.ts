import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";
import { createClient } from "@/lib/auth/supabase/server";
import {
  mockActivateSavings,
  mockGetOwnSavings,
  mockListSavingsAudit,
  mockUpdateTarget,
} from "./mock";
import { mapSavingsAudit, type SavingsAuditRow } from "./map";
import { pgActivateSavings, pgGetOwnSavings, pgUpdateTarget } from "./postgres";
import type {
  ActivateSavingsResult,
  OwnSavingsView,
  SavingsSetupAuditEvent,
  UpdateTargetResult,
} from "./types";

function isPostgresMode(): boolean {
  return getAuthMode() === "supabase";
}

async function userClient(): Promise<SupabaseClient> {
  return createClient();
}

export async function activateSavingsSetup(
  userId: string,
  challengeId: string,
  targetMajor: string,
  weeklyCommitmentMajor: string,
  now: Date = new Date(),
): Promise<ActivateSavingsResult> {
  if (isPostgresMode()) {
    void userId;
    void now;
    return pgActivateSavings(
      await userClient(),
      challengeId,
      targetMajor,
      weeklyCommitmentMajor,
    );
  }
  return mockActivateSavings(
    userId,
    challengeId,
    targetMajor,
    weeklyCommitmentMajor,
    now,
  );
}

export async function updateSavingsTarget(
  userId: string,
  challengeId: string,
  targetMajor: string,
  now: Date = new Date(),
): Promise<UpdateTargetResult> {
  if (isPostgresMode()) {
    void userId;
    void now;
    return pgUpdateTarget(await userClient(), challengeId, targetMajor);
  }
  return mockUpdateTarget(userId, challengeId, targetMajor, now);
}

export async function getOwnSavingsSetup(
  userId: string,
  challengeId: string,
  now: Date = new Date(),
): Promise<OwnSavingsView | null> {
  if (isPostgresMode()) {
    void userId;
    void now;
    return pgGetOwnSavings(await userClient(), challengeId);
  }
  return mockGetOwnSavings(userId, challengeId, now);
}

export async function listOwnSavingsAudit(
  userId: string,
  challengeId: string,
): Promise<SavingsSetupAuditEvent[]> {
  if (isPostgresMode()) {
    const supabase = await userClient();
    const { data, error } = await supabase
      .from("savings_setup_audit")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("actor_user_id", userId)
      .order("at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as SavingsAuditRow[]).map(mapSavingsAudit);
  }
  return mockListSavingsAudit(challengeId, userId);
}

export { resetMockSavingsState } from "./mock";
