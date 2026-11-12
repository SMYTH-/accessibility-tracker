import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import { getCurrentUser } from "@/lib/auth/session";
import { listChallengesForUser } from "@/lib/challenge/service";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const rows = await listChallengesForUser(user.id);
  const primary = rows[0];

  return (
    <AppShell title="Home" subtitle={`Signed in as ${user.displayName}`}>
      <div className="space-y-4">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <p className="text-sm text-[var(--mute)]">{user.email}</p>
          <p className="mt-3 text-sm text-[var(--ink)]">
            Personal dashboard totals arrive in M6. Create a private challenge now — savings setup
            can wait.
          </p>
          <Link
            href="/challenge/new"
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white"
          >
            Create challenge
          </Link>
        </section>

        {primary ? (
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Latest challenge
              </h2>
              <ChallengeStatusBadge status={primary.challenge.lifecycleStatus} />
            </div>
            <p className="mt-2 font-medium text-[var(--ink)]">{primary.challenge.name}</p>
            <p className="mt-1 text-sm text-[var(--mute)]">
              {primary.challenge.startDate} → {primary.challenge.endDate}
            </p>
            <Link
              href={`/challenge/${primary.challenge.id}`}
              className="mt-3 inline-flex text-sm font-semibold text-[var(--deep-sea)] underline"
            >
              Open overview
            </Link>
          </section>
        ) : null}

        <p className="text-center text-xs text-[var(--mute)]">
          Stop before M3 — no invites, savings activation, or contributions in this milestone.
        </p>
      </div>
    </AppShell>
  );
}
