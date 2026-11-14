import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChallengeActivityView } from "@/components/ChallengeActivityView";
import { getActivityFeed, getCompletionSummary } from "@/lib/activity/service";
import { getCurrentUser } from "@/lib/auth/session";
import { listChallengesForUser } from "@/lib/challenge/service";
import { getChallengeDashboard } from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const rows = await listChallengesForUser(user.id);
  const primary = rows[0];

  if (!primary) {
    return (
      <AppShell title="Activity" subtitle="Challenge feed">
        <section className="at-surface border-dashed p-5">
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
  const dashboard = await getChallengeDashboard(user.id, challenge.id);
  const completion =
    challenge.lifecycleStatus === "Completed"
      ? await getCompletionSummary(user.id, challenge.id)
      : null;

  return (
    <AppShell title="Activity" subtitle={`${challenge.name} · privacy-filtered`}>
      <div className="space-y-5">
        {completion ? (
          <section
            className="at-surface p-5"
            data-testid="activity-completion-banner"
          >
            <p className="text-sm font-semibold text-[var(--ink)]">Challenge completed</p>
            <p className="mt-1 text-sm text-[var(--mute)]">
              See the authorised completion summary on the challenge page. Ordinary writes remain
              rejected (G1.1-12).
            </p>
          </section>
        ) : null}

        <ChallengeActivityView
          challengeName={challenge.name}
          lifecycleStatus={challenge.lifecycleStatus}
          challengeId={challenge.id}
          roster={dashboard?.roster ?? []}
          events={feed?.events ?? []}
          readOnly={feed?.readOnly}
        />
      </div>
    </AppShell>
  );
}
