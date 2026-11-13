export function mapAccountRpcError(error: { message?: string } | null | undefined): string {
  const raw = error?.message ?? "";
  if (raw.includes("UNAUTHENTICATED")) return "You must be signed in.";
  if (raw.includes("FORBIDDEN")) return "Not allowed.";
  if (raw.includes("RATE_LIMITED")) {
    return "Too many export requests. Try again later.";
  }
  if (raw.includes("DELETION_RULES_PENDING")) {
    return "Account deletion rules are not available.";
  }
  if (raw.includes("DELETION_TRANSFER_REQUIRED")) {
    return "Transfer ownership of Active or Scheduled challenges to an eligible approved member before deletion can finish.";
  }
  if (raw.includes("DELETION_GRACE_ACTIVE")) {
    return "Deletion grace period is still active. A valid ownership transfer during grace prevents cancellation.";
  }
  if (raw.includes("DELETION_REQUEST_REQUIRED")) {
    return "Request account deletion first.";
  }
  if (raw.includes("DELETION_REQUEST_CANCELLED")) {
    return "This deletion request was cancelled. Request deletion again.";
  }
  if (raw.includes("TRANSFEREE_NOT_ELIGIBLE")) {
    return "That member is not an eligible approved replacement owner.";
  }
  if (raw.includes("NOT_CHALLENGE_OWNER")) {
    return "Only the current challenge owner can transfer ownership.";
  }
  if (raw.includes("CANNOT_TRANSFER_TO_SELF")) {
    return "Choose a different approved member as the new owner.";
  }
  if (raw.includes("CHALLENGE_NOT_FOUND")) return "Challenge not found.";
  if (raw.includes("TRANSFER_ARGS_REQUIRED")) {
    return "Challenge and new owner are required.";
  }
  return raw || "Account request failed.";
}

export function mapAccountErrorCode(message: string | undefined): string | undefined {
  if (!message) return undefined;
  const codes = [
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "RATE_LIMITED",
    "DELETION_TRANSFER_REQUIRED",
    "DELETION_GRACE_ACTIVE",
    "DELETION_REQUEST_REQUIRED",
    "DELETION_REQUEST_CANCELLED",
    "TRANSFEREE_NOT_ELIGIBLE",
    "NOT_CHALLENGE_OWNER",
  ];
  return codes.find((c) => message.includes(c));
}
