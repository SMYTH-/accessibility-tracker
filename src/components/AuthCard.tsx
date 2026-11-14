export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold text-[var(--accent)]">
          Pactwell
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm text-[var(--mute)]">{subtitle}</p> : null}
      </div>
      <div className="at-surface p-5">
        {children}
      </div>
    </div>
  );
}
