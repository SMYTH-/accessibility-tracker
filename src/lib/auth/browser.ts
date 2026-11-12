"use client";

import { createClient } from "@/lib/auth/supabase/client";
import type { AuthResult } from "@/lib/auth/types";

function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

export function isBrowserSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

/**
 * Browser-side auth starts PKCE so the code_verifier cookie exists when the
 * user returns from an email link to /auth/callback.
 */
export async function browserSignUp(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { display_name: input.displayName },
      emailRedirectTo: `${siteOrigin()}/auth/callback`,
    },
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    message: "Check your email for a verification link, then sign in.",
  };
}

export async function browserSignIn(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function browserRequestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent("/update-password")}`,
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    message: "If an account exists, a recovery email has been sent.",
  };
}
