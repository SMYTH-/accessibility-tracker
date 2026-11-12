import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <AppShell
      title="Home"
      subtitle="Personal dashboard arrives in M6. Shell only for M1."
    >
      <section className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
        <p className="text-sm text-[var(--mute)]">Signed in as</p>
        <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
          {user.displayName}
        </p>
        <p className="text-sm text-[var(--mute)]">{user.email}</p>
        <div className="rounded-xl bg-[var(--deep-sea-soft)] px-3 py-3 text-sm text-[var(--ink)]">
          Challenge creation, savings, and sharing totals are intentionally not built yet —
          <strong className="font-semibold"> stop before M2</strong>.
        </div>
      </section>
    </AppShell>
  );
}
