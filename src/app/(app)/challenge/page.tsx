import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import { getCurrentUser } from "@/lib/auth/session";
import { listChallengesForUser } from "@/lib/challenge/service";
import { redirect } from "next/navigation";

export default async function ChallengeIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const rows = await listChallengesForUser(user.id);

  return (
    <AppShell
      title="Challenge"
      subtitle="Private challenges you own or belong to. Create without savings setup."
    >
      <div className="space-y-4">
        <Link
          href="/challenge/new"
          className="flex w-full items-center justify-center rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white"
        >
          Create challenge
        </Link>

        {rows.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--elevated)] p-5">
            <p className="text-sm text-[var(--mute)]">
              No challenges yet. Create a private challenge — you become owner and approved member
              without setting a savings target.
            </p>
          </section>
        ) : (
          <ul className="space-y-3">
            {rows.map(({ challenge, membership }) => (
              <li key={challenge.id}>
                <Link
                  href={`/challenge/${challenge.id}`}
                  className="block rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-4 shadow-[var(--shadow)] transition hover:border-[var(--deep-sea)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--ink)]">
                        {challenge.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--mute)]">
                        {challenge.startDate} → {challenge.endDate} · {challenge.currency} ·{" "}
                        {challenge.timeZone}
                      </p>
                      <p className="mt-1 text-xs text-[var(--mute)]">
                        {membership.role} · savings{" "}
                        {membership.savingsParticipationActive ? "active" : "inactive"}
                      </p>
                    </div>
                    <ChallengeStatusBadge status={challenge.lifecycleStatus} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
