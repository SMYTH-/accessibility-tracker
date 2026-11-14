"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  classifyAuthHash,
  clearAuthHash,
  readAuthHash,
} from "@/lib/auth/hash";
import { isBrowserSupabaseConfigured } from "@/lib/auth/browser";
import { createClient } from "@/lib/auth/supabase/client";

function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/home";
  return raw;
}

/**
 * Consumes a Supabase auth hash fragment left on /auth/confirm (or sign-in)
 * after the server callback could not see it.
 */
export function AuthHashHandler({
  nextPath = "/home",
  mode = "confirm",
}: {
  nextPath?: string;
  /** confirm = dedicated landing; sign-in = recover hash if still on sign-in */
  mode?: "confirm" | "sign-in";
}) {
  const [status, setStatus] = useState<"working" | "verified" | "error" | "idle">(
    mode === "confirm" ? "working" : "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const dest = safeNext(nextPath);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const outcome = classifyAuthHash();
      if (outcome.kind === "empty") {
        if (mode === "confirm") {
          // Arrived from callback with no usable hash → real failure.
          clearAuthHash();
          window.location.replace("/sign-in?error=auth_callback");
        }
        return;
      }

      if (outcome.kind === "error") {
        clearAuthHash();
        if (cancelled) return;
        if (mode === "confirm") {
          window.location.replace("/sign-in?error=auth_callback");
          return;
        }
        setStatus("error");
        setMessage(outcome.message);
        return;
      }

      if (outcome.kind === "signup_verified") {
        clearAuthHash();
        if (cancelled) return;
        if (mode === "confirm") {
          window.location.replace("/sign-in?verified=1");
          return;
        }
        setStatus("verified");
        setMessage("Email verified. Sign in to continue.");
        return;
      }

      // session tokens present
      if (!isBrowserSupabaseConfigured()) {
        clearAuthHash();
        if (cancelled) return;
        setStatus("error");
        setMessage("Supabase is not configured in this browser.");
        return;
      }

      const { accessToken, refreshToken, type } = readAuthHash();
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken!,
          refresh_token: refreshToken!,
        });
        if (cancelled) return;
        clearAuthHash();

        if (error || !data.session) {
          // Signup confirmation may still be valid even if session restore fails.
          if (type === "signup" || outcome.type === "signup") {
            if (mode === "confirm") {
              window.location.replace("/sign-in?verified=1");
              return;
            }
            setStatus("verified");
            setMessage("Email verified. Sign in to continue.");
            return;
          }
          if (mode === "confirm") {
            window.location.replace("/sign-in?error=auth_callback");
            return;
          }
          setStatus("error");
          setMessage(error?.message ?? "Could not establish a session from this link.");
          return;
        }

        const isRecovery = type === "recovery" || outcome.type === "recovery";
        const target = isRecovery
          ? "/update-password"
          : dest === "/update-password"
            ? "/update-password"
            : dest;
        // Full navigation after setSession so /update-password sees auth cookies.
        window.location.assign(target);
      } catch (err) {
        if (cancelled) return;
        clearAuthHash();
        const msg = err instanceof Error ? err.message : "Authentication failed.";
        if (type === "signup" || outcome.type === "signup") {
          window.location.replace("/sign-in?verified=1");
          return;
        }
        if (mode === "confirm") {
          window.location.replace("/sign-in?error=auth_callback");
          return;
        }
        setStatus("error");
        setMessage(msg);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [dest, mode]);

  if (status === "idle") return null;

  if (status === "verified") {
    return (
      <div
        className="rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--ink)]"
        role="status"
      >
        {message ?? "Email verified. Sign in to continue."}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="status">
        {message ?? "Authentication link failed."}{" "}
        <Link href="/sign-in" className="font-semibold underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <p className="text-sm text-[var(--mute)]" role="status">
      Completing sign-in…
    </p>
  );
}
