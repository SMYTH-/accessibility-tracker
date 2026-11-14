import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/AuthForms";
import { signOutAction } from "@/lib/auth/actions";
import { getAuthMode } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <AppShell title="Profile" subtitle="Display name only for M1 (PROF-01). No financial fields.">
      <div className="space-y-4">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[var(--mute)]">Email</dt>
              <dd className="font-medium text-[var(--ink)]">{user.email}</dd>
            </div>
            <div>
              <dt className="text-[var(--mute)]">Email verified</dt>
              <dd className="font-medium text-[var(--ink)]">{user.emailVerified ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-[var(--mute)]">Auth mode</dt>
              <dd className="font-medium text-[var(--ink)]">{getAuthMode()}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <h2 className="mb-3 text-lg font-semibold">
            Display name
          </h2>
          <ProfileForm displayName={user.displayName} />
        </section>

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)]"
          >
            Sign out
          </button>
        </form>

        <p className="text-xs text-[var(--mute)]">
          Account export / deletion entry will deepen in M10 (ACC-01). Profile intentionally omits
          savings amounts and targets.
        </p>
      </div>
    </AppShell>
  );
}
