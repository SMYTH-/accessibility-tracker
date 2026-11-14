import { AccountControlsPanel } from "@/components/AccountControlsPanel";
import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "@/components/AuthForms";
import { PrivacySettingsPanel } from "@/components/PrivacySettingsPanel";
import {
  getOwnDeletionStatus,
  listTransferCandidates,
} from "@/lib/account/service";
import { signOutAction } from "@/lib/auth/actions";
import { getAuthMode } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/session";
import { listOwnPrivacySettings } from "@/lib/privacy/service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const privacy = await listOwnPrivacySettings(user.id);
  const deletion = await getOwnDeletionStatus(user.id);

  const transferOptions: {
    challengeId: string;
    challengeName: string;
    candidates: Awaited<ReturnType<typeof listTransferCandidates>>;
  }[] = [];

  const openTransferHolds = deletion.holds.filter(
    (h) =>
      !h.resolvedAt &&
      (h.holdKind === "needs_transfer" || deletion.status === "pending_transfer"),
  );

  // Also offer transfer for any pending_transfer holds from detail names on privacy list.
  const challengeIds = new Set(
    openTransferHolds.map((h) => h.challengeId).filter(Boolean),
  );
  if (deletion.status === "pending_transfer" || challengeIds.size > 0) {
    for (const item of privacy.items) {
      if (challengeIds.size > 0 && !challengeIds.has(item.challengeId)) continue;
      if (item.role !== "owner") continue;
      try {
        const candidates = await listTransferCandidates(user.id, item.challengeId);
        if (candidates.length === 0 && !challengeIds.has(item.challengeId)) continue;
        transferOptions.push({
          challengeId: item.challengeId,
          challengeName: item.challengeName,
          candidates,
        });
      } catch {
        // Not owner or unavailable — skip.
      }
    }
  }

  return (
    <AppShell
      title="Profile"
      subtitle="Display name, privacy, and account controls (ACC-01)."
    >
      <div className="space-y-4">
        <section className="at-surface p-5">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[var(--mute)]">Email</dt>
              <dd className="font-medium text-[var(--ink)]">{user.email}</dd>
            </div>
            <div>
              <dt className="text-[var(--mute)]">Email verified</dt>
              <dd className="font-medium text-[var(--ink)]">
                {user.emailVerified ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--mute)]">Auth mode</dt>
              <dd className="font-medium text-[var(--ink)]">{getAuthMode()}</dd>
            </div>
          </dl>
        </section>

        <section className="at-surface p-5">
          <h2 className="mb-3 text-lg font-semibold">Display name</h2>
          <ProfileForm displayName={user.displayName} />
        </section>

        <PrivacySettingsPanel items={privacy.items} />

        <AccountControlsPanel
          deletion={deletion}
          transferOptions={transferOptions}
        />

        <form action={signOutAction}>
          <button
            type="submit"
            className="at-btn-secondary w-full"
          >
            Sign out
          </button>
        </form>
      </div>
    </AppShell>
  );
}
