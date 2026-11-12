import type { SupabaseClient } from "@supabase/supabase-js";
import { initialLifecycleOnCreate } from "./time";
import {
  mapAudit,
  mapChallenge,
  mapMembership,
  type AuditRow,
  type ChallengeRow,
  type MembershipRow,
} from "./map";
import { validateCreateChallengeInput } from "./validate";
import type {
  Challenge,
  ChallengeWithMembership,
  CreateChallengeInput,
  LifecycleAuditEvent,
  LifecycleStatus,
  Membership,
} from "./types";

type RpcCreateResult = {
  challenge: ChallengeRow;
  membership: MembershipRow;
};

function rpcErrorMessage(error: { message?: string; details?: string } | null): string {
  const raw = error?.message || error?.details || "Challenge request failed.";
  const patterns = [
    /Challenge name is required\./,
    /End date must be after the start date\./,
    /Start date cannot be in the past[^.]*\./,
    /Currency is required\./,
    /Time zone is required\./,
    /Choose a valid IANA time zone\./,
    /Description must be 500 characters or fewer\./,
    /Challenge name must be 80 characters or fewer\./,
    /UNAUTHENTICATED/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) {
      return m[0] === "UNAUTHENTICATED"
        ? "You must be signed in to create a challenge."
        : m[0];
    }
  }
  return raw;
}

export async function pgCreateChallenge(
  supabase: SupabaseClient,
  input: CreateChallengeInput,
  now: Date = new Date(),
): Promise<{ ok: true; challenge: Challenge; membership: Membership } | { ok: false; error: string }> {
  const validated = validateCreateChallengeInput(input, now);
  if (!validated.ok) return { ok: false, error: validated.error };
  const initial = initialLifecycleOnCreate(
    validated.value.startDate,
    validated.value.timeZone,
    now,
  );
  if (initial === "reject_past") {
    return { ok: false, error: "Start date cannot be in the past." };
  }

  const { data, error } = await supabase.rpc("create_private_challenge", {
    p_name: validated.value.name,
    p_description: validated.value.description,
    p_start_date: validated.value.startDate,
    p_end_date: validated.value.endDate,
    p_currency: validated.value.currency,
    p_time_zone: validated.value.timeZone,
    p_now: now.toISOString(),
  });

  if (error) return { ok: false, error: rpcErrorMessage(error) };
  const payload = data as RpcCreateResult;
  return {
    ok: true,
    challenge: mapChallenge(payload.challenge),
    membership: mapMembership(payload.membership),
  };
}

export async function pgReconcile(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<{ transitioned: number }> {
  const { data, error } = await supabase.rpc("reconcile_challenge_lifecycles", {
    p_now: now.toISOString(),
  });
  if (error) throw new Error(error.message);
  return { transitioned: Number((data as { transitioned?: number })?.transitioned ?? 0) };
}

export async function pgListForUser(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<ChallengeWithMembership[]> {
  await pgReconcile(supabase, now);

  const { data: memberships, error: mErr } = await supabase
    .from("challenge_memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "approved");
  if (mErr) throw new Error(mErr.message);
  const mems = (memberships ?? []) as MembershipRow[];
  if (mems.length === 0) return [];

  const ids = mems.map((m) => m.challenge_id);
  const { data: challenges, error: cErr } = await supabase
    .from("challenges")
    .select("*")
    .in("id", ids);
  if (cErr) throw new Error(cErr.message);
  const byId = new Map(((challenges ?? []) as ChallengeRow[]).map((c) => [c.id, c]));

  return mems
    .map((m) => {
      const c = byId.get(m.challenge_id);
      if (!c) return null;
      return { challenge: mapChallenge(c), membership: mapMembership(m) };
    })
    .filter((x): x is ChallengeWithMembership => Boolean(x))
    .sort((a, b) => b.challenge.createdAt.localeCompare(a.challenge.createdAt));
}

export async function pgGetForUser(
  supabase: SupabaseClient,
  challengeId: string,
  userId: string,
  now: Date = new Date(),
): Promise<ChallengeWithMembership | null> {
  await pgReconcile(supabase, now);

  const { data: membership, error: mErr } = await supabase
    .from("challenge_memberships")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!membership) return null;

  const { data: challenge, error: cErr } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!challenge) return null;

  return {
    challenge: mapChallenge(challenge as ChallengeRow),
    membership: mapMembership(membership as MembershipRow),
  };
}

export async function pgListAudit(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<LifecycleAuditEvent[]> {
  const { data, error } = await supabase
    .from("challenge_lifecycle_audit")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as AuditRow[]).map(mapAudit);
}

export async function pgAttemptTransition(
  supabase: SupabaseClient,
  challengeId: string,
  to: LifecycleStatus,
  now: Date = new Date(),
): Promise<{ ok: true; challenge: Challenge } | { ok: false; error: string }> {
  await pgReconcile(supabase, now);
  const { data: challenge, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!challenge) return { ok: false, error: "Challenge not found." };
  const mapped = mapChallenge(challenge as ChallengeRow);
  if (mapped.lifecycleStatus === to) return { ok: true, challenge: mapped };
  return {
    ok: false,
    error: `Invalid lifecycle transition: ${mapped.lifecycleStatus} → ${to}.`,
  };
}
