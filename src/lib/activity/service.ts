import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";
import { createClient } from "@/lib/auth/supabase/server";
import { mockActivityFeed, mockCompletionSummary } from "./mock";
import { pgActivityFeed, pgCompletionSummary } from "./postgres";
import type { ActivityFeed, ChallengeCompletionSummary } from "./types";

function isPostgresMode(): boolean {
  return getAuthMode() === "supabase";
}

async function userClient(): Promise<SupabaseClient> {
  return createClient();
}

export async function getActivityFeed(
  userId: string,
  challengeId: string,
  limit = 50,
  before: string | null = null,
): Promise<ActivityFeed | null> {
  if (isPostgresMode()) {
    void userId;
    return pgActivityFeed(await userClient(), challengeId, limit, before);
  }
  return mockActivityFeed(userId, challengeId, limit, before);
}

export async function getCompletionSummary(
  userId: string,
  challengeId: string,
): Promise<ChallengeCompletionSummary | null> {
  if (isPostgresMode()) {
    void userId;
    return pgCompletionSummary(await userClient(), challengeId);
  }
  return mockCompletionSummary(userId, challengeId);
}
