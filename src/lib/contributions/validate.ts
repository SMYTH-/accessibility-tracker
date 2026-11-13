import { parsePositiveMajorToMinor } from "@/lib/savings/money";

export function validateContributionAmount(
  amountMajor: string,
): { ok: true; minor: number } | { ok: false; error: string } {
  return parsePositiveMajorToMinor(amountMajor, "Contribution amount");
}

export function validateIdempotencyKey(
  key: string,
): { ok: true; key: string } | { ok: false; error: string } {
  const trimmed = key.trim();
  if (!trimmed) {
    return { ok: false, error: "A retry key is required to record a contribution safely." };
  }
  if (trimmed.length > 128) {
    return { ok: false, error: "Retry key is invalid." };
  }
  return { ok: true, key: trimmed };
}
