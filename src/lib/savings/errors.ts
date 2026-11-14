export function mapSavingsRpcError(error: {
  message?: string;
  details?: string;
  code?: string;
} | null): string {
  const raw = error?.message || error?.details || "Savings setup failed.";
  const map: Record<string, string> = {
    UNAUTHENTICATED: "You must be signed in.",
    TARGET_MUST_BE_POSITIVE: "Personal savings target must be a positive amount.",
    WEEKLY_COMMITMENT_MUST_BE_POSITIVE:
      "Weekly commitment must be a positive amount.",
    CHALLENGE_NOT_FOUND: "Challenge not found.",
    CHALLENGE_READONLY:
      "Completed or cancelled challenges do not accept savings setup changes.",
    MEMBERSHIP_REQUIRED: "Approved membership is required for savings setup.",
    SAVINGS_ALREADY_ACTIVE: "Savings participation is already active.",
    SAVINGS_NOT_ACTIVE: "Complete savings setup before changing your target.",
    TARGET_CHANGE_DEFERRED:
      "Changing your personal target after activation is not available yet.",
  };
  for (const [code, msg] of Object.entries(map)) {
    if (raw.includes(code)) return msg;
  }
  return raw;
}
