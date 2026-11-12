import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <AppShell title="Activity" subtitle="Feed lands in M9. Shell tab only for M1.">
      <section className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--elevated)] p-5">
        <p className="text-sm text-[var(--mute)]">
          No activity events yet. This tab keeps the provisional IA (Home · Challenge · Activity ·
          Profile).
        </p>
      </section>
    </AppShell>
  );
}
