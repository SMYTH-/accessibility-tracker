"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UpdatePasswordForm } from "@/components/AuthForms";
import { isBrowserSupabaseConfigured } from "@/lib/auth/browser";
import { createClient } from "@/lib/auth/supabase/client";

/**
 * Client gate for /update-password after Auth email recovery.
 * Waits for the browser session (set by /auth/callback or hash handoff)
 * so we do not flash “no recovery session” / bounce before cookies settle.
 */
export function RecoveryPasswordPanel({ mockToken }: { mockToken?: string }) {
  const [phase, setPhase] = useState<"checking" | "ready" | "missing">(
    mockToken || !isBrowserSupabaseConfigured() ? "ready" : "checking",
  );

  useEffect(() => {
    if (mockToken || !isBrowserSupabaseConfigured()) return;

    let cancelled = false;
    const supabase = createClient();

    async function check() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        setPhase("ready");
        return;
      }
      // Brief retry — callback cookies / setSession may land just after paint.
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      const again = await supabase.auth.getSession();
      if (cancelled) return;
      setPhase(again.data.session?.user ? "ready" : "missing");
    }

    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) setPhase("ready");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [mockToken]);

  if (phase === "checking") {
    return (
      <p className="text-sm text-[var(--mute)]" role="status">
        Opening recovery session…
      </p>
    );
  }

  if (phase === "missing") {
    return (
      <p className="text-sm text-[var(--mute)]" role="status">
        No recovery session yet. Open the newest password-reset link from your email (it should land
        on{" "}
        <code className="text-[var(--ink)]">/auth/callback?next=/update-password</code>
        ), or{" "}
        <Link href="/reset-password" className="font-semibold text-[var(--accent)] underline">
          request a new reset
        </Link>
        .
      </p>
    );
  }

  return <UpdatePasswordForm token={mockToken} />;
}
