import Link from "next/link";
import { getAuthMode } from "@/lib/auth/config";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const mode = getAuthMode();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold text-[var(--accent)]">
          Accountability Tracker
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm text-[var(--mute)]">{subtitle}</p> : null}
        <p className="mt-3 inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--elevated)] px-3 py-1 text-[0.68rem] font-semibold text-[var(--mute)]">
          Auth: {mode}
          {mode === "mock" ? " · local demo" : " · Supabase"}
        </p>
      </div>
      <div className="at-surface p-5">
        {children}
      </div>
      <p className="mt-4 text-center text-xs text-[var(--mute)]">
        Manrope · royal blue working accent ·{" "}
        <Link href="/sign-in" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
