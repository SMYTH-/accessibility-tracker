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
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--deep-sea)]">
          Accountability Tracker
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm text-[var(--mute)]">{subtitle}</p> : null}
        <p className="mt-3 inline-flex items-center rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--mute)]">
          Auth: {mode}
          {mode === "mock" ? " · local demo" : " · Supabase"}
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
        {children}
      </div>
      <p className="mt-4 text-center text-xs text-[var(--mute)]">
        Working accents only · logo / final palette / type remain open ·{" "}
        <Link href="/sign-in" className="text-[var(--deep-sea)] underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
