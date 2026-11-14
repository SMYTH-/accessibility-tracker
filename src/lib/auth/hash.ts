/**
 * Client-side helpers for Supabase auth redirects that place the session in the
 * URL hash (implicit flow). The server never sees `#…`, so /auth/callback must
 * hand off to a client page when `code` / `token_hash` are absent.
 */

export type AuthHashOutcome =
  | { kind: "session"; type: string | null }
  | { kind: "signup_verified" }
  | { kind: "error"; message: string }
  | { kind: "empty" };

function parseHashParams(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

export function readAuthHash(hash = typeof window !== "undefined" ? window.location.hash : ""): {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  emailVerified: boolean;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
} {
  const params = parseHashParams(hash);
  const emailVerifiedRaw = params.get("email_verified");
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    type: params.get("type"),
    emailVerified: emailVerifiedRaw === "true" || emailVerifiedRaw === "yes",
    error: params.get("error"),
    errorCode: params.get("error_code"),
    errorDescription: params.get("error_description"),
  };
}

export function clearAuthHash() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
}

export function describeAuthHashError(input: {
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}): string {
  const code = (input.errorCode || "").toLowerCase();
  const desc = (input.errorDescription || "").replace(/\+/g, " ").trim();
  if (code.includes("otp_expired") || desc.toLowerCase().includes("expired")) {
    return "This link is invalid or expired. Request a new email and try again.";
  }
  if (desc) return desc;
  if (input.error) return input.error.replace(/_/g, " ");
  return "Authentication link failed. Request a new email and try again.";
}

/**
 * Classify the current location hash before talking to Supabase.
 * Token presence alone is enough to attempt setSession; callers do that next.
 */
export function classifyAuthHash(hash?: string): AuthHashOutcome {
  const parsed = readAuthHash(hash);
  if (parsed.error || parsed.errorCode) {
    return {
      kind: "error",
      message: describeAuthHashError(parsed),
    };
  }
  if (parsed.accessToken && parsed.refreshToken) {
    return { kind: "session", type: parsed.type };
  }
  // Confirmed signup without usable tokens (or tokens already consumed).
  if (parsed.type === "signup" && parsed.emailVerified) {
    return { kind: "signup_verified" };
  }
  if (parsed.accessToken || parsed.type || parsed.emailVerified) {
    // Partial / unexpected fragment — treat as broken link.
    return {
      kind: "error",
      message: "This authentication link is incomplete or expired.",
    };
  }
  return { kind: "empty" };
}
