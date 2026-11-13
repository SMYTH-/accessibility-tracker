import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapActivityFeed,
  mapCompletionSummary,
  type ActivityFeedRow,
  type CompletionSummaryRow,
} from "./map";
import type { ActivityFeed, ChallengeCompletionSummary } from "./types";

function mapError(error: { message?: string }): string {
  const msg = error.message ?? "Unknown error";
  if (msg.includes("UNAUTHENTICATED")) return "Sign in required.";
  if (msg.includes("MEMBERSHIP_REQUIRED")) {
    return "Approved membership required to view challenge activity.";
  }
  if (msg.includes("CHALLENGE_NOT_FOUND")) return "Challenge not found.";
  if (msg.includes("CHALLENGE_NOT_COMPLETED")) {
    return "Completion summary is only available for completed challenges.";
  }
  return msg;
}

export async function pgActivityFeed(
  supabase: SupabaseClient,
  challengeId: string,
  limit = 50,
  before: string | null = null,
): Promise<ActivityFeed | null> {
  const { data, error } = await supabase.rpc("challenge_activity_feed", {
    p_challenge_id: challengeId,
    p_limit: limit,
    p_before: before,
  });
  if (error) {
    if (error.message?.includes("MEMBERSHIP_REQUIRED")) return null;
    throw new Error(mapError(error));
  }
  return mapActivityFeed(data as ActivityFeedRow);
}

export async function pgCompletionSummary(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<ChallengeCompletionSummary | null> {
  const { data, error } = await supabase.rpc("challenge_completion_summary", {
    p_challenge_id: challengeId,
  });
  if (error) {
    if (error.message?.includes("MEMBERSHIP_REQUIRED")) return null;
    if (error.message?.includes("CHALLENGE_NOT_COMPLETED")) return null;
    throw new Error(mapError(error));
  }
  return mapCompletionSummary(data as CompletionSummaryRow);
}
