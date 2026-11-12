import { isSupportedCurrency } from "./currencies";
import { compareYmd, initialLifecycleOnCreate, isYmd, zonedYmd } from "./time";
import { isValidTimeZone } from "./timezones";
import type { CreateChallengeInput, LifecycleStatus } from "./types";

export type ValidationResult =
  | { ok: true; value: Required<CreateChallengeInput> & { description: string | null } }
  | { ok: false; error: string };

export function validateCreateChallengeInput(
  raw: CreateChallengeInput,
  now: Date = new Date(),
): ValidationResult {
  const name = (raw.name ?? "").trim();
  if (!name) return { ok: false, error: "Challenge name is required." };
  if (name.length > 80) return { ok: false, error: "Challenge name must be 80 characters or fewer." };

  const descriptionRaw = (raw.description ?? "").trim();
  const description = descriptionRaw.length ? descriptionRaw : null;
  if (description && description.length > 500) {
    return { ok: false, error: "Description must be 500 characters or fewer." };
  }

  const startDate = (raw.startDate ?? "").trim();
  const endDate = (raw.endDate ?? "").trim();
  if (!isYmd(startDate)) return { ok: false, error: "Start date must be a valid calendar date." };
  if (!isYmd(endDate)) return { ok: false, error: "End date must be a valid calendar date." };

  if (compareYmd(endDate, startDate) <= 0) {
    return { ok: false, error: "End date must be after the start date." };
  }

  const currency = (raw.currency ?? "").trim().toUpperCase();
  if (!currency) return { ok: false, error: "Currency is required." };
  if (!isSupportedCurrency(currency)) {
    return { ok: false, error: "Choose a supported currency." };
  }

  const timeZone = (raw.timeZone ?? "").trim();
  if (!timeZone) return { ok: false, error: "Time zone is required." };
  if (!isValidTimeZone(timeZone)) {
    return { ok: false, error: "Choose a valid IANA time zone." };
  }

  const initial = initialLifecycleOnCreate(startDate, timeZone, now);
  if (initial === "reject_past") {
    const today = zonedYmd(now, timeZone);
    return {
      ok: false,
      error: `Start date cannot be in the past (today in ${timeZone} is ${today}).`,
    };
  }

  return {
    ok: true,
    value: { name, description, startDate, endDate, currency, timeZone },
  };
}

/** Allowed automatic transitions under M2 activation lock. Cancel out of M2. */
export function isAllowedAutoTransition(
  from: LifecycleStatus,
  to: LifecycleStatus,
): boolean {
  if (from === to) return true;
  if (from === "Scheduled" && to === "Active") return true;
  if (from === "Active" && to === "Completed") return true;
  return false;
}

export function rejectTransitionMessage(from: LifecycleStatus, to: LifecycleStatus): string {
  return `Invalid lifecycle transition: ${from} → ${to}.`;
}
