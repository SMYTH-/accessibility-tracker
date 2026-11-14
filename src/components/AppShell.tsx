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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip px-4 pb-28 pt-6">
      <header className="mb-6 min-w-0 px-0.5">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--deep-sea)]">
          Accountability Tracker
        </p>
        <h1 className="mt-1.5 break-words text-[1.75rem] font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 break-words text-sm text-[var(--mute)]">{subtitle}</p>
        ) : null}
      </header>
      <main className="min-w-0 flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
