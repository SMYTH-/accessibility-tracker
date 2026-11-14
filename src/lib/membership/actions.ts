"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createInvitation,
  decideMembershipRequest,
  leaveChallenge,
  removeMember,
  requestMembership,
  revokeInvitation,
} from "./service";

export type MembershipActionState = {
  error?: string;
  message?: string;
  invitePath?: string;
  token?: string;
};

export async function createInviteAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const challengeId = String(formData.get("challengeId") ?? "");
  const daysRaw = Number(formData.get("expiresInDays") ?? 7);
  const expiresInDays = Number.isFinite(daysRaw) ? daysRaw : 7;
  const result = await createInvitation(challengeId, user.id, expiresInDays);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/challenge/${challengeId}`);
  return {
    message: `Invite link created (expires in ${result.expiresInDays} days).`,
    invitePath: result.path,
    token: result.token,
  };
}

export async function revokeInviteAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const invitationId = String(formData.get("invitationId") ?? "");
  const challengeId = String(formData.get("challengeId") ?? "");
  const result = await revokeInvitation(invitationId, user.id);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/challenge/${challengeId}`);
  return {
    message: result.alreadyRevoked ? "Invite was already revoked." : "Invite revoked.",
  };
}

export async function requestJoinAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const token = String(formData.get("token") ?? "");
  const ack = String(formData.get("privacyAck") ?? "") === "on";
  const result = await requestMembership(token, user.id, ack);
  if (!result.ok) return { error: result.error };
  redirect(`/invite/${token}/status`);
}

export async function decideMembershipAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const membershipId = String(formData.get("membershipId") ?? "");
  const challengeId = String(formData.get("challengeId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "approve" && decision !== "decline") {
    return { error: "Decision must be approve or decline." };
  }
  const result = await decideMembershipRequest(
    membershipId,
    user.id,
    decision,
    "unknown@example.com",
  );
  if (!result.ok) return { error: result.error };
  revalidatePath(`/challenge/${challengeId}`);
  return {
    message: result.alreadyDecided
      ? `Already ${decision === "approve" ? "approved" : "declined"}.`
      : `Request ${decision === "approve" ? "approved" : "declined"}; notification recorded.`,
  };
}

export async function leaveChallengeAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const challengeId = String(formData.get("challengeId") ?? "");
  const result = await leaveChallenge(challengeId, user.id);
  if (!result.ok) return { error: result.error };
  redirect("/challenge");
}

export async function removeMemberAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  const membershipId = String(formData.get("membershipId") ?? "");
  const challengeId = String(formData.get("challengeId") ?? "");
  const result = await removeMember(membershipId, user.id);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/challenge/${challengeId}`);
  return {
    message: result.already ? "Member already removed." : "Member removed; access revoked.",
  };
}
