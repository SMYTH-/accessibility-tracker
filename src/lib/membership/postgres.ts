import type { SupabaseClient } from "@supabase/supabase-js";
import { mapMembership, type MembershipRow } from "@/lib/challenge/map";
import type { Membership } from "@/lib/challenge/types";
import { mapMembershipRpcError } from "./errors";
import type {
  ActionResult,
  ChallengeInvitation,
  CreateInviteResult,
  DecideResult,
  InvitePreview,
  MembershipAdminRow,
  NotificationRecord,
  RequestMembershipResult,
} from "./types";

type InviteRow = {
  id: string;
  challenge_id: string;
  created_by: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

function mapInvitation(row: InviteRow): ChallengeInvitation {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    createdBy: row.created_by,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

function mapPreview(data: Record<string, unknown>): InvitePreview {
  return {
    invitationId: String(data.invitation_id),
    challengeId: String(data.challenge_id),
    name: String(data.name),
    description: (data.description as string | null) ?? null,
    startDate: String(data.start_date),
    endDate: String(data.end_date),
    participantCount: Number(data.participant_count ?? 0),
    expiresAt: String(data.expires_at),
  };
}

export async function pgCreateInvitation(
  supabase: SupabaseClient,
  challengeId: string,
  expiresInDays = 7,
): Promise<CreateInviteResult> {
  const { data, error } = await supabase.rpc("create_challenge_invitation", {
    p_challenge_id: challengeId,
    p_expires_in_days: expiresInDays,
  });
  if (error) return { ok: false, error: mapMembershipRpcError(error) };
  const payload = data as { invitation: InviteRow; token: string; expires_in_days: number };
  const invitation = mapInvitation(payload.invitation);
  return {
    ok: true,
    invitation,
    token: payload.token,
    expiresInDays: payload.expires_in_days,
    path: `/invite/${payload.token}`,
  };
}

export async function pgRevokeInvitation(
  supabase: SupabaseClient,
  invitationId: string,
): Promise<{ ok: true; invitation: ChallengeInvitation; alreadyRevoked: boolean } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("revoke_challenge_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) return { ok: false, error: mapMembershipRpcError(error) };
  const payload = data as { invitation: InviteRow; already_revoked: boolean };
  return {
    ok: true,
    invitation: mapInvitation(payload.invitation),
    alreadyRevoked: Boolean(payload.already_revoked),
  };
}

export async function pgGetInvitationPreview(
  supabase: SupabaseClient,
  token: string,
): Promise<{ ok: true; preview: InvitePreview } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("get_invitation_preview", {
    p_token: token,
  });
  if (error) return { ok: false, error: mapMembershipRpcError(error) };
  return { ok: true, preview: mapPreview(data as Record<string, unknown>) };
}

export async function pgRequestMembership(
  supabase: SupabaseClient,
  token: string,
  privacyAck: boolean,
): Promise<RequestMembershipResult> {
  const { data, error } = await supabase.rpc("request_challenge_membership", {
    p_token: token,
    p_privacy_ack: privacyAck,
  });
  if (error) return { ok: false, error: mapMembershipRpcError(error) };
  const payload = data as {
    membership: MembershipRow;
    created: boolean;
    preview: Record<string, unknown>;
  };
  return {
    ok: true,
    membership: mapMembership(payload.membership),
    created: Boolean(payload.created),
    preview: {
      name: String(payload.preview.name),
      description: (payload.preview.description as string | null) ?? null,
      startDate: String(payload.preview.start_date),
      endDate: String(payload.preview.end_date),
      participantCount: Number(payload.preview.participant_count ?? 0),
    },
  };
}

export async function pgDecideMembership(
  supabase: SupabaseClient,
  membershipId: string,
  decision: "approve" | "decline",
): Promise<DecideResult> {
  const { data, error } = await supabase.rpc("decide_membership_request", {
    p_membership_id: membershipId,
    p_decision: decision,
  });
  if (error) return { ok: false, error: mapMembershipRpcError(error) };
  const payload = data as {
    membership: MembershipRow;
    already_decided: boolean;
    notification_id?: string;
    challenge_name: string;
  };
  return {
    ok: true,
    membership: mapMembership(payload.membership),
    alreadyDecided: Boolean(payload.already_decided),
    notificationId: payload.notification_id,
    challengeName: payload.challenge_name,
  };
}

export async function pgLeaveChallenge(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<ActionResult> {
  const { data, error } = await supabase.rpc("leave_challenge", {
    p_challenge_id: challengeId,
  });
  if (error) return { ok: false, error: mapMembershipRpcError(error) };
  const payload = data as { membership: MembershipRow };
  return { ok: true, membership: mapMembership(payload.membership) };
}

export async function pgRemoveMember(
  supabase: SupabaseClient,
  membershipId: string,
): Promise<ActionResult> {
  const { data, error } = await supabase.rpc("remove_challenge_member", {
    p_membership_id: membershipId,
  });
  if (error) return { ok: false, error: mapMembershipRpcError(error) };
  const payload = data as { membership: MembershipRow; already_removed?: boolean };
  return {
    ok: true,
    membership: mapMembership(payload.membership),
    already: Boolean(payload.already_removed),
  };
}

export async function pgListMembershipAdmin(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<{ ok: true; members: MembershipAdminRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("list_challenge_membership_admin", {
    p_challenge_id: challengeId,
  });
  if (error) return { ok: false, error: mapMembershipRpcError(error) };
  const rows = (data ?? []) as Array<
    MembershipRow & { display_name?: string; email?: string; privacy_disclosure_acked_at?: string | null }
  >;
  return {
    ok: true,
    members: rows.map((row) => ({
      ...mapMembership(row),
      displayName: row.display_name || row.email?.split("@")[0] || "Member",
      email: row.email || "",
    })),
  };
}

export async function pgListInvitations(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<{ ok: true; invitations: ChallengeInvitation[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("list_challenge_invitations", {
    p_challenge_id: challengeId,
  });
  if (error) return { ok: false, error: mapMembershipRpcError(error) };
  const rows = (data ?? []) as InviteRow[];
  return { ok: true, invitations: rows.map(mapInvitation) };
}

export async function pgGetOwnMembership(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<Membership | null> {
  const { data, error } = await supabase.rpc("get_own_challenge_membership", {
    p_challenge_id: challengeId,
  });
  if (error) throw new Error(mapMembershipRpcError(error));
  if (!data) return null;
  return mapMembership(data as MembershipRow);
}

export async function pgListNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from("notification_outbox")
    .select("*")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    kind: row.kind as NotificationRecord["kind"],
    challengeId: String(row.challenge_id),
    membershipId: (row.membership_id as string | null) ?? null,
    recipientUserId: String(row.recipient_user_id),
    recipientEmail: String(row.recipient_email),
    subject: String(row.subject),
    body: String(row.body),
    status: row.status as NotificationRecord["status"],
    createdAt: String(row.created_at),
    sentAt: (row.sent_at as string | null) ?? null,
    error: (row.error as string | null) ?? null,
  }));
}
