import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import { InviteOwnerPanel } from "@/components/InviteOwnerPanel";
import { SavingsSetupForm } from "@/components/SavingsSetupForm";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canRecordSavings,
  getChallengeForUser,
  isAssessedForWeeklyCommitments,
  listAuditForChallenge,
} from "@/lib/challenge/service";
import {
  getPendingAccessView,
  listInvitations,
  listMembershipAdmin,
} from "@/lib/membership/service";
import { getOwnSavingsSetup, listOwnSavingsAudit } from "@/lib/savings/service";
import { formatMinorAsMajor } from "@/lib/savings/money";

export default async function ChallengeOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const row = await getChallengeForUser(id, user.id);

  if (!row) {
    const wait = await getPendingAccessView(id, user.id);
    if (wait) {
      return (
        <AppShell title={wait.preview.name} subtitle="Membership status">
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
            <p className="text-sm capitalize text-[var(--ink)]">
              Status: <strong className="font-semibold">{wait.status}</strong>
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[var(--mute)]">Start</dt>
                <dd className="font-medium">{wait.preview.startDate}</dd>
              </div>
              <div>
                <dt className="text-[var(--mute)]">End</dt>
                <dd className="font-medium">{wait.preview.endDate}</dd>
              </div>
              <div>
                <dt className="text-[var(--mute)]">Participants</dt>
                <dd className="font-medium">{wait.preview.participantCount}</dd>
              </div>
            </dl>
            {wait.preview.description ? (
              <p className="mt-3 text-sm">{wait.preview.description}</p>
            ) : null}
            <p className="mt-4 text-sm text-[var(--mute)]">
              Pending and declined members cannot access private financial information.
            </p>
            <Link href="/challenge" className="mt-4 inline-block text-sm font-semibold text-[var(--deep-sea)] underline">
              All challenges
            </Link>
          </section>
        </AppShell>
      );
    }
    notFound();
  }

  const { challenge, membership } = row;
  const savingsView = await getOwnSavingsSetup(user.id, challenge.id);
  const setup = savingsView?.setup ?? null;
  const participationActive =
    savingsView?.savingsParticipationActive ?? membership.savingsParticipationActive;
  const recordGate = canRecordSavings(
    challenge,
    { ...membership, savingsParticipationActive: participationActive },
  );
  const assessed = isAssessedForWeeklyCommitments({
    ...membership,
    savingsParticipationActive: participationActive,
  });
  const audit = await listAuditForChallenge(challenge.id);
  const savingsAudit = await listOwnSavingsAudit(user.id, challenge.id);
  const isOwner = membership.role === "owner";

  const invites = isOwner ? await listInvitations(challenge.id, user.id) : { ok: true as const, invitations: [] };
  const admin = isOwner
    ? await listMembershipAdmin(challenge.id, user.id)
    : {
        ok: true as const,
        members: [
          {
            ...membership,
            displayName: user.displayName,
            email: user.email,
          },
        ],
      };

  const leaveBlocked =
    isOwner &&
    (challenge.lifecycleStatus === "Scheduled" || challenge.lifecycleStatus === "Active");
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
              {membership.role === "owner" ? "Owner" : "Member"}
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
                {participationActive ? "Active" : "Inactive (setup required)"}
              </strong>
            </li>
            <li className="text-[var(--mute)]">
              Weekly commitment assessment:{" "}
              {assessed
                ? `In scope from Monday ${setup?.firstAssessedWeekStart ?? "—"} (M8 runs weeks)`
                : "Not assessed while savings inactive (G1.1-01/03/04)"}
            </li>
          </ul>
        </section>

        <SavingsSetupForm
          challengeId={challenge.id}
          currency={challenge.currency}
          timeZone={challenge.timeZone}
          setup={setup}
          savingsParticipationActive={participationActive}
        />

        <InviteOwnerPanel
          challengeId={challenge.id}
          invitations={invites.ok ? invites.invitations : []}
          members={admin.ok ? admin.members : []}
          siteOrigin={siteOrigin}
          isOwner={isOwner}
          canLeave={!leaveBlocked}
          leaveBlockedReason={
            leaveBlocked
              ? "Owners of Scheduled or Active challenges must transfer ownership before leaving (G1.1-13). Ownership transfer remains open."
              : undefined
          }
        />

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Record savings
          </h2>
          <p className="mt-2 text-sm text-[var(--mute)]">{recordGate.reason}</p>
          {setup ? (
            <p className="mt-1 text-xs text-[var(--mute)]">
              Your target {formatMinorAsMajor(setup.targetMinor, challenge.currency)} · weekly{" "}
              {formatMinorAsMajor(setup.weeklyCommitmentMinor, challenge.currency)}
            </p>
          ) : null}
          <button
            type="button"
            disabled
            className="mt-3 w-full rounded-xl border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm font-semibold text-[var(--mute)]"
          >
            Record savings (M5) — gated
          </button>
        </section>

        {savingsAudit.length > 0 ? (
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Savings setup audit
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {savingsAudit.map((e) => (
                <li key={e.id} className="rounded-xl bg-[var(--paper)] px-3 py-2">
                  <p className="font-medium text-[var(--ink)]">{e.action}</p>
                  <p className="text-[var(--mute)]">{e.detail}</p>
                  {e.effectiveFrom ? (
                    <p className="text-xs text-[var(--mute)]">Effective from {e.effectiveFrom}</p>
                  ) : null}
                  <p className="text-xs text-[var(--mute)]">{e.at}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--elevated)] p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Not in M4</h2>
          <p className="mt-2 text-sm text-[var(--mute)]">
            Contribution recording (M5), aggregates, streaks, and cancel are out of scope here.
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
