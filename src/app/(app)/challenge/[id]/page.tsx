import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canRecordSavings,
  getChallengeForUser,
  isAssessedForWeeklyCommitments,
  listAuditForChallenge,
} from "@/lib/challenge/service";

export default async function ChallengeOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const row = await getChallengeForUser(id, user.id);
  if (!row) notFound();

  const { challenge, membership } = row;
  const recordGate = canRecordSavings(challenge, membership);
  const assessed = isAssessedForWeeklyCommitments(membership);
  const audit = await listAuditForChallenge(challenge.id);

  return (
    <AppShell title={challenge.name} subtitle="Challenge overview">
      <div className="space-y-4">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-center gap-2">
            <ChallengeStatusBadge status={challenge.lifecycleStatus} />
            <span className="rounded-lg border border-[var(--line)] bg-white px-2 py-0.5 text-xs font-semibold text-[var(--mute)]">
              Private
            </span>
            <span className="rounded-lg border border-[var(--line)] bg-white px-2 py-0.5 text-xs font-semibold text-[var(--mute)]">
              Owner
            </span>
          </div>
          {challenge.description ? (
            <p className="mt-3 text-sm text-[var(--ink)]">{challenge.description}</p>
          ) : (
            <p className="mt-3 text-sm text-[var(--mute)]">No description.</p>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--mute)]">Start</dt>
              <dd className="font-medium">{challenge.startDate}</dd>
            </div>
            <div>
              <dt className="text-[var(--mute)]">End</dt>
              <dd className="font-medium">{challenge.endDate}</dd>
            </div>
            <div>
              <dt className="text-[var(--mute)]">Currency</dt>
              <dd className="font-medium">{challenge.currency}</dd>
            </div>
            <div>
              <dt className="text-[var(--mute)]">Time zone</dt>
              <dd className="font-medium">{challenge.timeZone}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Membership</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              Status: <strong className="font-semibold">{membership.status}</strong> · Role:{" "}
              <strong className="font-semibold">{membership.role}</strong>
            </li>
            <li>
              Savings participation:{" "}
              <strong className="font-semibold">
                {membership.savingsParticipationActive ? "Active" : "Inactive (deferred)"}
              </strong>
            </li>
            <li className="text-[var(--mute)]">
              Weekly commitment assessment:{" "}
              {assessed ? "In scope when weeks run (M8)" : "Not assessed while savings inactive (G1.1-01)"}
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Record savings
          </h2>
          <p className="mt-2 text-sm text-[var(--mute)]">{recordGate.reason}</p>
          <button
            type="button"
            disabled
            className="mt-3 w-full rounded-xl border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm font-semibold text-[var(--mute)]"
          >
            Record savings (M5) — gated
          </button>
        </section>

        <section className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--elevated)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Not in M2</h2>
          <p className="mt-2 text-sm text-[var(--mute)]">
            Invites (M3), savings setup (M4), cancel action (rules OPEN), and contributions are out of
            scope here.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Lifecycle audit
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {audit.map((e) => (
              <li key={e.id} className="rounded-xl bg-[var(--paper)] px-3 py-2">
                <p className="font-medium text-[var(--ink)]">
                  {e.action}
                  {e.fromStatus || e.toStatus
                    ? `: ${e.fromStatus ?? "∅"} → ${e.toStatus ?? "∅"}`
                    : ""}
                </p>
                <p className="text-[var(--mute)]">{e.reason}</p>
                <p className="text-xs text-[var(--mute)]">{e.at}</p>
              </li>
            ))}
          </ul>
        </section>

        <Link
          href="/challenge"
          className="inline-flex text-sm font-semibold text-[var(--deep-sea)] underline"
        >
          All challenges
        </Link>
      </div>
    </AppShell>
  );
}
