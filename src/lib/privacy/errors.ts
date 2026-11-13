const RPC_MESSAGES: Array<{ re: RegExp; message: string }> = [
  { re: /UNAUTHENTICATED/, message: "You must be signed in." },
  { re: /MEMBERSHIP_REQUIRED/, message: "You must be an approved member of this challenge." },
  { re: /CHALLENGE_REQUIRED/, message: "Challenge is required." },
  { re: /SHARE_FLAG_REQUIRED/, message: "Share flag is required." },
  { re: /SHARE_FLAG_INVALID/, message: "Only opting out of monetary sharing is supported." },
  {
    re: /REOPT_IN_DEFERRED/,
    message:
      "Re-enabling monetary sharing after opt-out is not available yet (product decision still open).",
  },
];

export function mapPrivacyRpcError(
  error: { message?: string; details?: string; hint?: string } | null | undefined,
): string {
  const raw = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  for (const { re, message } of RPC_MESSAGES) {
    if (re.test(raw)) return message;
  }
  return raw || "Privacy update failed.";
}
