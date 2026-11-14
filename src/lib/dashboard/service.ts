import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";
import { createClient } from "@/lib/auth/supabase/server";
import {
  mockActivityPreview,
  mockChallengeDashboard,
  mockRosterProjection,
  mockSharingMemberTotals,
} from "./mock";
import {
  pgActivityPreview,
  pgChallengeDashboard,
  pgRosterProjection,
  pgSharingMemberTotals,
} from "./postgres";
import type {
  ActivityPreviewEvent,
  ChallengeDashboard,
  RosterMemberProjection,
  SharingMemberTotals,
} from "./types";

function isPostgresMode(): boolean {
  return getAuthMode() === "supabase";
}

async function userClient(): Promise<SupabaseClient> {
  return createClient();
}

export async function getChallengeDashboard(
  userId: string,
  challengeId: string,
): Promise<ChallengeDashboard | null> {
  if (isPostgresMode()) {
    void userId;
    return pgChallengeDashboard(await userClient(), challengeId);
  }
  return mockChallengeDashboard(userId, challengeId);
}

export async function getSharingMemberTotals(
  userId: string,
  challengeId: string,
): Promise<SharingMemberTotals | null> {
  if (isPostgresMode()) {
    void userId;
    return pgSharingMemberTotals(await userClient(), challengeId);
  }
  return mockSharingMemberTotals(userId, challengeId);
}

export async function getRosterProjection(
  userId: string,
  challengeId: string,
): Promise<RosterMemberProjection[] | null> {
  if (isPostgresMode()) {
    void userId;
    return pgRosterProjection(await userClient(), challengeId);
  }
  return mockRosterProjection(userId, challengeId);
}

export async function getActivityPreview(
  userId: string,
  challengeId: string,
): Promise<ActivityPreviewEvent[] | null> {
  if (isPostgresMode()) {
    void userId;
    return pgActivityPreview(await userClient(), challengeId);
  }
  return mockActivityPreview(userId, challengeId);
}

export { mockSetShareMonetaryInfo } from "./mock";
export {
  milestoneRecognitionLabel,
  milestonesReached,
  progressPercent,
} from "./progress";
