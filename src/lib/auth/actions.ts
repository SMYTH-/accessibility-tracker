"use server";

import { redirect } from "next/navigation";
import {
  RATE_LIMITED_MESSAGE,
  consumeRateLimit,
} from "@/lib/security/rate-limit";
import { getAuthMode } from "./config";
import {
  consumeToken,
  createUser,
  findUserByEmail,
  issueToken,
  markEmailVerified,
  peekLatestToken,
  updateDisplayName,
  updatePassword,
  verifyPassword,
} from "./mock/store";
import { clearMockSession, setMockSession } from "./mock/session";
import { createClient } from "./supabase/server";
import type { AuthResult } from "./types";

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email.";
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  const emailError = validateEmail(email);
  if (emailError) return { ok: false, error: emailError };
  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };
  if (!displayName) return { ok: false, error: "Display name is required." };

  const rate = await consumeRateLimit("auth.sign_up", email);
  if (!rate.allowed) return { ok: false, error: RATE_LIMITED_MESSAGE };

  if (getAuthMode() === "mock") {
    try {
      const user = await createUser({ email, password, displayName });
      const token = await issueToken(user.email, "verify");
      return {
        ok: true,
        message: `Account created. Open the verification link (mock token expires in 1 hour).`,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          emailVerified: false,
        },
        // Surface mock verify path for local walkthrough (not emailed).
        mockVerifyToken: token.token,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Sign-up failed." };
    }
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    message: "Check your email for a verification link, then sign in.",
  };
}

export async function signInAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const emailError = validateEmail(email);
  if (emailError) return { ok: false, error: emailError };
  if (!password) return { ok: false, error: "Password is required." };

  const rate = await consumeRateLimit("auth.sign_in", email);
  if (!rate.allowed) return { ok: false, error: RATE_LIMITED_MESSAGE };

  if (getAuthMode() === "mock") {
    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: "Invalid email or password." };
    }
    if (!user.emailVerified) {
      return {
        ok: false,
        error: "Email not verified. Use the verification link from sign-up first.",
      };
    }
    await setMockSession(user.id);
    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  if (getAuthMode() === "mock") {
    await clearMockSession();
  } else {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/sign-in");
}

export async function requestPasswordResetAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const emailError = validateEmail(email);
  if (emailError) return { ok: false, error: emailError };

  const rate = await consumeRateLimit("auth.recovery", email);
  if (!rate.allowed) return { ok: false, error: RATE_LIMITED_MESSAGE };

  if (getAuthMode() === "mock") {
    const user = await findUserByEmail(email);
    // Do not reveal whether the email exists.
    if (user) {
      const token = await issueToken(user.email, "recovery");
      return {
        ok: true,
        message:
          "If an account exists, a recovery link was issued (mock: token expires in 1 hour).",
        mockRecoveryToken: token.token,
      };
    }
    return {
      ok: true,
      message:
        "If an account exists, a recovery link was issued (mock: token expires in 1 hour).",
    };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // PKCE recovery must land on /auth/callback so the code is exchanged for a
  // session while the browser is still signed out, then continue to the form.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Do not encode `next` here — Supabase wraps redirect_to and would double-encode (%252F).
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    message: "If an account exists, a recovery email has been sent.",
  };
}

export async function verifyEmailAction(token: string): Promise<AuthResult> {
  if (getAuthMode() !== "mock") {
    return {
      ok: false,
      error: "Use the link from your email provider to verify (Supabase callback).",
    };
  }
  const found = await consumeToken(token, "verify");
  if (!found) return { ok: false, error: "Verification link is invalid or expired." };
  const user = await markEmailVerified(found.email);
  if (!user) return { ok: false, error: "Account not found." };
  return {
    ok: true,
    message: "Email verified. You can sign in.",
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: true,
    },
  };
}

export async function updatePasswordWithTokenAction(formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const token = String(formData.get("token") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };

  if (getAuthMode() === "mock") {
    if (!token) return { ok: false, error: "Recovery token is required." };
    const found = await consumeToken(token, "recovery");
    if (!found) return { ok: false, error: "Recovery link is invalid or expired." };
    await updatePassword(found.email, password);
    return { ok: true, message: "Password updated. Sign in with your new password." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Recovery session missing. Open the email link again (signed-out browser).",
    };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  // End recovery session so the next sign-in proves the new password.
  await supabase.auth.signOut();
  return { ok: true, message: "Password updated. Sign in with your new password." };
}

export async function updateProfileAction(formData: FormData): Promise<AuthResult> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) return { ok: false, error: "Display name is required." };

  if (getAuthMode() === "mock") {
    const { getMockSessionUser } = await import("./mock/session");
    const session = await getMockSessionUser();
    if (!session) return { ok: false, error: "Not signed in." };
    const user = await updateDisplayName(session.id, displayName);
    return {
      ok: true,
      message: "Profile updated.",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Profile updated." };
}

/** Dev-only helper for walkthrough: latest mock token for an email. */
export async function getMockTokenForWalkthrough(
  email: string,
  type: "verify" | "recovery",
): Promise<string | null> {
  if (getAuthMode() !== "mock") return null;
  const token = await peekLatestToken(email, type);
  return token?.token ?? null;
}
