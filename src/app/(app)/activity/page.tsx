import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivityFeedList } from "@/components/ActivityFeedList";
import { AppShell } from "@/components/AppShell";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import { getActivityFeed, getCompletionSummary } from "@/lib/activity/service";
import { getCurrentUser } from "@/lib/auth/session";
import { listChallengesForUser } from "@/lib/challenge/service";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const rows = await listChallengesForUser(user.id);
  const primary = rows[0];

  if (!primary) {
    return (
      <AppShell title="Activity" subtitle="Challenge feed">
        <section className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--elevated)] p-5">
          <p className="text-sm text-[var(--mute)]">
            Join or create a challenge to see permitted activity (joins, contributions,
            commitments, milestones, completion).
          </p>
          <Link
            href="/challenge/new"
            className="mt-4 inline-flex text-sm font-semibold text-[var(--deep-sea)] underline"
          >
            Create challenge
          </Link>
        </section>
      </AppShell>
    );
  }

  const { challenge } = primary;
  const feed = await getActivityFeed(user.id, challenge.id, 50, null);
  const completion =
    challenge.lifecycleStatus === "Completed"
      ? await getCompletionSummary(user.id, challenge.id)
      : null;

  return (
    <AppShell
      title="Activity"
      subtitle={`${challenge.name} · privacy-filtered`}
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--ink)]">{challenge.name}</h2>
            <ChallengeStatusBadge status={challenge.lifecycleStatus} />
            {feed?.readOnly ? (
              <span className="rounded-lg border border-[var(--line)] bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                Read-only
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-[var(--mute)]">
            Membership and privacy are enforced on the server before sorting. Hidden amounts and
            private members&apos; monetary events do not appear. Commitment figures stay in each
            member&apos;s own view. Streak awards remain open.
          </p>
          <Link
            href={`/challenge/${challenge.id}`}
            className="mt-3 inline-flex text-sm font-semibold text-[var(--deep-sea)] underline"
          >
            Open challenge
          </Link>
        </section>

        {completion ? (
          <section
            className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
            data-testid="activity-completion-banner"
          >
            <p className="text-sm font-semibold text-[var(--ink)]">Challenge completed</p>
            <p className="mt-1 text-sm text-[var(--mute)]">
              See the authorised completion summary on the challenge page. Ordinary writes remain
              rejected (G1.1-12).
            </p>
          </section>
        ) : null}

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">
            Permitted activity
          </p>
          <ActivityFeedList
            events={feed?.events ?? []}
            emptyLabel="No permitted activity for this challenge yet."
          />
        </section>
      </div>
    </AppShell>
  );
}
