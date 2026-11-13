const RPC_MESSAGES: Array<{ re: RegExp; message: string }> = [
  { re: /UNAUTHENTICATED/, message: "You must be signed in." },
  { re: /OWNER_REQUIRED/, message: "Only the challenge owner can do that." },
  { re: /INVITE_INVALID/, message: "This invitation link is invalid." },
  { re: /INVITE_REVOKED/, message: "This invitation has been revoked." },
  { re: /INVITE_EXPIRED/, message: "This invitation has expired." },
  { re: /INVITE_NOT_FOUND/, message: "Invitation not found." },
  { re: /INVITE_EXPIRY_INVALID/, message: "Invite expiry must be between 1 and 30 days." },
  {
    re: /PRIVACY_ACK_REQUIRED/,
    message: "You must acknowledge the financial visibility disclosure before requesting to join.",
  },
  { re: /ALREADY_MEMBER/, message: "You are already an approved member of this challenge." },
  { re: /CHALLENGE_CLOSED/, message: "This challenge is no longer open for join requests." },
  { re: /MEMBERSHIP_NOT_FOUND/, message: "Membership not found." },
  { re: /MEMBERSHIP_NOT_PENDING/, message: "This membership request is not pending." },
  { re: /DECISION_INVALID/, message: "Decision must be approve or decline." },
  {
    re: /OWNER_LEAVE_REQUIRES_TRANSFER/,
    message:
      "Owners of Scheduled or Active challenges must transfer ownership before leaving. Use Profile → Account controls to transfer to an eligible approved member.",
  },
  { re: /NOT_A_MEMBER/, message: "You are not an active member of this challenge." },
  { re: /CANNOT_REMOVE_SELF/, message: "Use Leave to exit the challenge yourself." },
  { re: /CANNOT_REMOVE_OWNER/, message: "Cannot remove the challenge owner." },
];

export function mapMembershipRpcError(
  error: { message?: string; details?: string; hint?: string } | null | undefined,
): string {
  const raw = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  for (const { re, message } of RPC_MESSAGES) {
    if (re.test(raw)) return message;
  }
  return raw || "Membership request failed.";
}

export function isKnownMembershipError(message: string): boolean {
  return RPC_MESSAGES.some(({ message: m }) => m === message) || RPC_MESSAGES.some(({ re }) => re.test(message));
}
