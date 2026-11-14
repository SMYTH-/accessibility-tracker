/**
 * Working currencies (GBP/EUR/USD/AUD/CAD/NZD) use 2 decimal minor units.
 * Full catalogue / odd exponents remain OPEN (D8).
 */
export const MINOR_PER_MAJOR = 100;

export function parsePositiveMajorToMinor(
  raw: string,
  label: string,
): { ok: true; minor: number } | { ok: false; error: string } {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) {
    return { ok: false, error: `${label} is required.` };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return {
      ok: false,
      error: `${label} must be a positive amount with up to 2 decimal places.`,
    };
  }
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "00").slice(0, 2);
  const minor = Number(whole) * MINOR_PER_MAJOR + Number(fracPadded);
  if (!Number.isSafeInteger(minor) || minor <= 0) {
    return { ok: false, error: `${label} must be a positive amount.` };
  }
  return { ok: true, minor };
}

export function formatMinorAsMajor(minor: number, currency: string): string {
  const major = (minor / MINOR_PER_MAJOR).toFixed(2);
  return `${currency} ${major}`;
}
