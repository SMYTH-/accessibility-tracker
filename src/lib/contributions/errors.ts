export function mapContributionRpcError(error: {
  message?: string;
  details?: string;
  code?: string;
} | null): string {
  const raw = error?.message || error?.details || "Contribution failed.";
  const map: Record<string, string> = {
    UNAUTHENTICATED: "You must be signed in.",
    AMOUNT_MUST_BE_POSITIVE: "Contribution amount must be a positive amount.",
    IDEMPOTENCY_KEY_REQUIRED: "A retry key is required to record a contribution safely.",
    IDEMPOTENCY_KEY_INVALID: "Retry key is invalid.",
    CHALLENGE_NOT_FOUND: "Challenge not found.",
    CHALLENGE_NOT_ACTIVE: "Recording savings requires an Active challenge.",
    CHALLENGE_READONLY:
      "Completed or cancelled challenges do not accept contribution changes.",
    MEMBERSHIP_REQUIRED: "Approved membership is required.",
    SAVINGS_NOT_ACTIVE:
      "Complete savings setup (target and weekly commitment) before recording.",
    OUT_OF_PERIOD: "Contribution date is outside the challenge savings period.",
    CONTRIBUTION_NOT_FOUND: "Contribution not found.",
    CONTRIBUTION_FORBIDDEN: "You can only correct your own contributions.",
    CONTRIBUTION_NOT_ACTIVE: "Only active contributions can be amended or reversed.",
  };
  for (const [code, msg] of Object.entries(map)) {
    if (raw.includes(code)) return msg;
  }
  return raw;
}
