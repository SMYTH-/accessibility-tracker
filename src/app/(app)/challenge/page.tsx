import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ChallengePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <AppShell
      title="Challenge"
      subtitle="Provisional nav label. Create / lifecycle is M2 — not authorised here."
    >
      <section className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--elevated)] p-5">
        <p className="text-sm text-[var(--mute)]">
          Protected route placeholder. Unauthenticated users are redirected to sign-in (AUTH-01).
          No challenge creation UI in M1.
        </p>
      </section>
    </AppShell>
  );
}
