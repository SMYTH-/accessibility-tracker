import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-24 pt-6">
      <header className="mb-5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--deep-sea)]">
          Accountability Tracker
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--mute)]">{subtitle}</p> : null}
      </header>
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
