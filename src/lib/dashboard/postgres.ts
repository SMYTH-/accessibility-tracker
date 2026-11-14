import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapActivity,
  mapDashboard,
  mapRosterMember,
  mapSharingTotals,
  type ActivityRow,
  type DashboardRow,
  type RosterRow,
  type SharingTotalsRow,
} from "./map";
import type {
  ActivityPreviewEvent,
  ChallengeDashboard,
  RosterMemberProjection,
  SharingMemberTotals,
} from "./types";

function mapDashError(error: { message?: string }): string {
  const msg = error.message ?? "Unknown error";
  if (msg.includes("UNAUTHENTICATED")) return "Sign in required.";
  if (msg.includes("MEMBERSHIP_REQUIRED")) {
    return "Approved membership required to view dashboard totals.";
  }
  if (msg.includes("CHALLENGE_NOT_FOUND")) return "Challenge not found.";
  return msg;
}

export async function pgChallengeDashboard(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<ChallengeDashboard | null> {
  const { data, error } = await supabase.rpc("challenge_dashboard", {
    p_challenge_id: challengeId,
  });
  if (error) {
    if (error.message?.includes("MEMBERSHIP_REQUIRED")) return null;
    throw new Error(mapDashError(error));
  }
  return mapDashboard(data as DashboardRow);
}

export async function pgSharingMemberTotals(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<SharingMemberTotals | null> {
  const { data, error } = await supabase.rpc("sharing_member_totals", {
    p_challenge_id: challengeId,
  });
  if (error) {
    if (error.message?.includes("MEMBERSHIP_REQUIRED")) return null;
    throw new Error(mapDashError(error));
  }
  return mapSharingTotals(data as SharingTotalsRow);
}

export async function pgRosterProjection(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<RosterMemberProjection[] | null> {
  const { data, error } = await supabase.rpc("challenge_roster_projection", {
    p_challenge_id: challengeId,
  });
  if (error) {
    if (error.message?.includes("MEMBERSHIP_REQUIRED")) return null;
    throw new Error(mapDashError(error));
  }
  const payload = data as { members: RosterRow[] };
  return (payload.members ?? []).map(mapRosterMember);
}

export async function pgActivityPreview(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<ActivityPreviewEvent[] | null> {
  const { data, error } = await supabase.rpc("challenge_activity_preview", {
    p_challenge_id: challengeId,
  });
  if (error) {
    if (error.message?.includes("MEMBERSHIP_REQUIRED")) return null;
    throw new Error(mapDashError(error));
  }
  const payload = data as { events: ActivityRow[] };
  return (payload.events ?? []).map(mapActivity);
}
