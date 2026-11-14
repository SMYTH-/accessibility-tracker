"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordWithTokenAction,
  updateProfileAction,
  verifyEmailAction,
} from "@/lib/auth/actions";
import {
  browserRequestPasswordReset,
  browserSignIn,
  browserSignUp,
  isBrowserSupabaseConfigured,
} from "@/lib/auth/browser";

function Field({
  label,
  id,
  type = "text",
  name,
  autoComplete,
  required,
  defaultValue,
}: {
  label: string;
  id: string;
  type?: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-[var(--ink)] outline-none ring-[var(--deep-sea)] transition focus:ring-2"
      />
    </label>
  );
}

function Alert({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-[color-mix(in_srgb,var(--deep-sea)_25%,white)] bg-[var(--deep-sea-soft)] text-[var(--ink)]";
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${styles}`} role="status">
      {children}
    </div>
  );
}

export function SignUpForm({ nextPath }: { nextPath?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verifyHref, setVerifyHref] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const signInHref = nextPath
    ? `/sign-in?next=${encodeURIComponent(nextPath)}`
    : "/sign-in";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setMessage(null);
        setVerifyHref(null);
        start(async () => {
          const email = String(fd.get("email") ?? "");
          const password = String(fd.get("password") ?? "");
          const displayName = String(fd.get("displayName") ?? "").trim();
          const result = isBrowserSupabaseConfigured()
            ? await browserSignUp({ email, password, displayName })
            : await signUpAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage(
            nextPath
              ? `${result.message ?? "Account created."} After verify, sign in to continue your invite.`
              : (result.message ?? "Account created."),
          );
          if (result.mockVerifyToken) {
            const verifyBase = `/verify-email?token=${result.mockVerifyToken}`;
            setVerifyHref(
              nextPath ? `${verifyBase}&next=${encodeURIComponent(nextPath)}` : verifyBase,
            );
          }
        });
      }}
    >
      <Field label="Display name" id="displayName" name="displayName" autoComplete="nickname" required />
      <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? (
        <Alert tone="ok">
          {message}
          {verifyHref ? (
            <p className="mt-2">
              <Link className="font-semibold text-[var(--deep-sea)] underline" href={verifyHref}>
                Verify email (mock link)
              </Link>
            </p>
          ) : null}
        </Alert>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
      <p className="text-center text-sm text-[var(--mute)]">
        Already have an account?{" "}
        <Link href={signInHref} className="font-semibold text-[var(--deep-sea)]">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function SignInForm({ nextPath = "/home" }: { nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const email = String(fd.get("email") ?? "");
          const password = String(fd.get("password") ?? "");
          const result = isBrowserSupabaseConfigured()
            ? await browserSignIn({ email, password })
            : await signInAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(nextPath);
          router.refresh();
        });
      }}
    >
      <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <div className="flex justify-between text-sm">
        <Link href="/sign-up" className="font-semibold text-[var(--deep-sea)]">
          Create account
        </Link>
        <Link href="/reset-password" className="text-[var(--mute)] hover:text-[var(--ink)]">
          Reset password
        </Link>
      </div>
    </form>
  );
}

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetHref, setResetHref] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setMessage(null);
        setResetHref(null);
        start(async () => {
          const email = String(fd.get("email") ?? "");
          const result = isBrowserSupabaseConfigured()
            ? await browserRequestPasswordReset(email)
            : await requestPasswordResetAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage(result.message ?? "Check your email.");
          if (result.mockRecoveryToken) {
            setResetHref(`/update-password?token=${result.mockRecoveryToken}`);
          }
        });
      }}
    >
      <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? (
        <Alert tone="ok">
          {message}
          {resetHref ? (
            <p className="mt-2">
              <Link className="font-semibold text-[var(--deep-sea)] underline" href={resetHref}>
                Open recovery link (mock)
              </Link>
            </p>
          ) : null}
        </Alert>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--honey)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send recovery link"}
      </button>
    </form>
  );
}

export function UpdatePasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setMessage(null);
        start(async () => {
          const result = await updatePasswordWithTokenAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage(result.message ?? "Password updated.");
          setTimeout(() => router.push("/sign-in"), 800);
        });
      }}
    >
      {token ? <input type="hidden" name="token" value={token} /> : null}
      <Field
        label="New password"
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="ok">{message}</Alert> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export function VerifyEmailPanel({ token }: { token?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!token) {
    return (
      <Alert tone="ok">
        Check your inbox for a verification email. In mock mode, use the link shown after sign-up.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="ok">{message}</Alert> : null}
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        onClick={() => {
          setError(null);
          start(async () => {
            const result = await verifyEmailAction(token);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setMessage(result.message ?? "Verified.");
          });
        }}
      >
        {pending ? "Verifying…" : "Confirm email verification"}
      </button>
      <p className="text-center text-sm">
        <Link href="/sign-in" className="font-semibold text-[var(--deep-sea)]">
          Continue to sign in
        </Link>
      </p>
    </div>
  );
}

export function ProfileForm({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setMessage(null);
        start(async () => {
          const result = await updateProfileAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage(result.message ?? "Saved.");
          router.refresh();
        });
      }}
    >
      <Field
        label="Display name"
        id="displayName"
        name="displayName"
        autoComplete="nickname"
        required
        defaultValue={displayName}
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="ok">{message}</Alert> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
