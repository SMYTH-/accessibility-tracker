/**
 * Initial working currency set. Full catalogue remains OPEN (D8) beyond “currency required”.
 */
export const CHALLENGE_CURRENCIES = [
  { code: "GBP", label: "GBP — British pound" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "USD", label: "USD — US dollar" },
  { code: "AUD", label: "AUD — Australian dollar" },
  { code: "CAD", label: "CAD — Canadian dollar" },
  { code: "NZD", label: "NZD — New Zealand dollar" },
] as const;

export type ChallengeCurrencyCode = (typeof CHALLENGE_CURRENCIES)[number]["code"];

const CODES = new Set<string>(CHALLENGE_CURRENCIES.map((c) => c.code));

export function isSupportedCurrency(code: string): boolean {
  return CODES.has(code.trim().toUpperCase());
}
