import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  ChallengeDashboardView,
  DashboardEmptyState,
} from "@/components/ChallengeDashboard";
import { getCurrentUser } from "@/lib/auth/session";
import { listChallengesForUser } from "@/lib/challenge/service";
import { getChallengeDashboard } from "@/lib/dashboard/service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const rows = await listChallengesForUser(user.id);
  const primary = rows[0];
  const dashboard = primary
    ? await getChallengeDashboard(user.id, primary.challenge.id)
    : null;

  return (
    <AppShell title="Home" subtitle={`Signed in as ${user.displayName}`}>
      {!primary || !dashboard ? (
        <div className="space-y-4">
          <DashboardEmptyState />
          <p className="text-center text-xs text-[var(--mute)]">
            Personal progress and Sharing members only totals load from live eligible
            contributions once you join an approved challenge.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ChallengeDashboardView
            data={dashboard}
            recordHref={`/challenge/${dashboard.challengeId}`}
          />
          {rows.length > 1 ? (
            <p className="text-center text-xs text-[var(--mute)]">
              Showing your latest challenge.{" "}
              <Link href="/challenge" className="font-semibold text-[var(--deep-sea)] underline">
                All challenges
              </Link>
            </p>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
