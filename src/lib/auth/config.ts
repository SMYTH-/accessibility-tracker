/**
 * Auth mode: real Supabase when URL + anon key are set; otherwise local mock.
 * Mock demonstrates M1 flows without managed-provider secrets.
 */
export type AuthMode = "supabase" | "mock";

export function getAuthMode(): AuthMode {
  if (process.env.AUTH_MODE === "mock") return "mock";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) return "supabase";
  return "mock";
}

export function isAuthConfigured(): boolean {
  return getAuthMode() === "supabase";
}

export const WORKING_ACCENTS = {
  deepSea: "#1A6B7C",
  honeyAmber: "#C9842A",
} as const;
