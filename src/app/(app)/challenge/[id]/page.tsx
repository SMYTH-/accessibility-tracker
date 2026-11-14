import { randomUUID } from "crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChallengeDashboardView } from "@/components/ChallengeDashboard";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import {
  ChallengeTabs,
  challengeTabHref,
  parseChallengeTab,
} from "@/components/ChallengeTabs";
import { CompletionSummaryView } from "@/components/CompletionSummaryView";
import { ContributionPanel } from "@/components/ContributionPanel";
import { FocusOnHash } from "@/components/FocusOnHash";
import { InviteOwnerPanel } from "@/components/InviteOwnerPanel";
import { SavingsSetupForm } from "@/components/SavingsSetupForm";
import { getCompletionSummary } from "@/lib/activity/service";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canRecordSavings,
  getChallengeForUser,
  isAssessedForWeeklyCommitments,
  listAuditForChallenge,
} from "@/lib/challenge/service";
import {
  getOwnEligibleTotals,
  listOwnContributions,
} from "@/lib/contributions/service";
import {
  getChallengeDashboard,
  getSharingMemberTotals,
} from "@/lib/dashboard/service";
import {
  getPendingAccessView,
  listInvitations,
  listMembershipAdmin,
} from "@/lib/membership/service";
import { getOwnSavingsSetup, listOwnSavingsAudit } from "@/lib/savings/service";
import { formatMinorAsMajor } from "@/lib/savings/money";

export const dynamic = "force-dynamic";

export default async function ChallengeOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const tab = parseChallengeTab(sp.tab);
  const row = await getChallengeForUser(id, user.id);

  if (!row) {
    const wait = await getPendingAccessView(id, user.id);
    if (wait) {
      return (
        <AppShell title={wait.preview.name} subtitle="Membership status">
          <section className="at-surface p-5">
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
            <Link href="/challenge" className="mt-4 inline-block text-sm font-semibold text-[var(--accent)] underline">
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
  const contributionView = await listOwnContributions(user.id, challenge.id);
  const eligibleTotals = await getOwnEligibleTotals(user.id, challenge.id);
  const sharingTotals = await getSharingMemberTotals(user.id, challenge.id);
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
  const isCompleted = challenge.lifecycleStatus === "Completed";
  const completion = isCompleted
    ? await getCompletionSummary(user.id, challenge.id)
    : null;
  const pathB = !isCompleted
    ? await getChallengeDashboard(user.id, challenge.id)
    : null;

  const savingsHref = `${challengeTabHref(challenge.id, "savings")}#setup`;
  const recordHref = `${challengeTabHref(challenge.id, "savings")}#contributions`;
  const peopleHref = challengeTabHref(challenge.id, "people");
  const tabSubtitle =
    tab === "savings" ? "Savings" : tab === "people" ? "People" : "Overview";

  return (
    <AppShell title={challenge.name} subtitle={tabSubtitle}>
      <FocusOnHash />
      <div className="space-y-4">
        <ChallengeTabs challengeId={challenge.id} active={tab} />

        {tab === "overview" ? (
          <>
            {completion ? <CompletionSummaryView data={completion} /> : null}

            {pathB ? (
              <ChallengeDashboardView
                data={pathB}
                compact
                recordHref={recordHref}
                setupHref={savingsHref}
                peopleHref={peopleHref}
              />
            ) : null}

            {!completion && !pathB ? (
              <section className="at-surface p-5">
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
            ) : null}

            {sharingTotals && !pathB ? (
              <section className="at-surface p-5">
                <h2 className="text-lg font-semibold">{sharingTotals.label}</h2>
                <p className="mt-2 text-lg font-semibold tabular-nums text-[var(--ink)]">
                  {formatMinorAsMajor(sharingTotals.savedMinor, sharingTotals.currency)} of{" "}
                  {formatMinorAsMajor(sharingTotals.targetMinor, sharingTotals.currency)}
                </p>
                <p className="mt-1 text-sm text-[var(--mute)]">{sharingTotals.scopeExplanation}</p>
              </section>
            ) : null}

            <section className="at-surface p-5">
              <h2 className="text-lg font-semibold">Financial privacy</h2>
              <p className="mt-2 text-sm text-[var(--mute)]">
                Monetary information is visible to approved members by default. Opt out per challenge
                from Profile — Hide monetary information hides amounts and target, and cannot undo what
                others already saw.
              </p>
              <p className="mt-1 text-sm tabular-nums text-[var(--ink)]">
                Your setting:{" "}
                <strong className="font-semibold">
                  {membership.shareMonetaryInfo ? "Sharing" : "Private (opted out)"}
                </strong>
              </p>
              <Link
                href="/profile#privacy"
                className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)] underline"
              >
                Open privacy settings
              </Link>
            </section>

            <section className="at-surface p-5">
              <h2 className="text-lg font-semibold">Lifecycle audit</h2>
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
          </>
        ) : null}

        {tab === "savings" ? (
          <>
            {isCompleted ? (
              <p
                className="rounded-[var(--radius-md)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--mute)]"
                data-testid="savings-read-only"
              >
                This challenge is completed and read-only. Savings setup and ordinary contribution
                changes are closed.
              </p>
            ) : (
              <SavingsSetupForm
                challengeId={challenge.id}
                currency={challenge.currency}
                timeZone={challenge.timeZone}
                setup={setup}
                savingsParticipationActive={participationActive}
              />
            )}

            {setup && !isCompleted ? (
              <p className="text-xs tabular-nums text-[var(--mute)]">
                Your target {formatMinorAsMajor(setup.targetMinor, challenge.currency)} · weekly{" "}
                {formatMinorAsMajor(setup.weeklyCommitmentMinor, challenge.currency)}
              </p>
            ) : null}

            <div id="contributions" className="scroll-mt-4" tabIndex={-1}>
              <ContributionPanel
                challengeId={challenge.id}
                currency={challenge.currency}
                timeZone={challenge.timeZone}
                allowed={recordGate.allowed && !isCompleted}
                gateReason={
                  isCompleted
                    ? "Completed challenges are read-only — ordinary contribution changes are disabled."
                    : recordGate.reason
                }
                initialIdempotencyKey={randomUUID()}
                contributions={contributionView?.contributions ?? []}
                revisions={contributionView?.revisions ?? []}
                totals={eligibleTotals}
              />
            </div>

            {savingsAudit.length > 0 ? (
              <section className="at-surface p-5">
                <h2 className="text-lg font-semibold">Savings setup history</h2>
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
          </>
        ) : null}

        {tab === "people" ? (
          <>
            <section className="at-surface p-5">
              <h2 className="text-lg font-semibold">Membership</h2>
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
                    ? `In scope from Monday ${setup?.firstAssessedWeekStart ?? "—"} (challenge TZ; your view only)`
                    : "Not assessed while savings inactive"}
                </li>
              </ul>
              {!participationActive && !isCompleted ? (
                <Link
                  href={savingsHref}
                  className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] underline"
                >
                  Set up savings.
                </Link>
              ) : null}
            </section>

            {pathB ? (
              <section aria-labelledby="people-roster-label" data-testid="challenge-roster">
                <p className="at-section-label" id="people-roster-label">
                  Sharing roster
                </p>
                <ul className="mt-1 border-t border-[var(--line)]">
                  {pathB.roster.map((m) => (
                    <li
                      key={m.membershipId}
                      className="at-list-row border-b border-[var(--line)]"
                      data-user-id={m.userId}
                      data-privacy-chip={m.privacyChip ?? ""}
                      data-share-monetary={m.shareMonetaryInfo ? "true" : "false"}
                    >
                      <div className="at-label-stack">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[var(--ink)]">
                            {m.displayName}
                            {m.isSelf ? " (you)" : ""}
                          </span>
                          {m.privacyChip ? (
                            <span className="at-chip text-[10px] uppercase tracking-wide">
                              {m.privacyChip}
                            </span>
                          ) : null}
                        </div>
                        {m.eligibleTotalMinor != null && m.targetMinor != null && m.currency ? (
                          <p className="text-sm tabular-nums text-[var(--mute)]">
                            {formatMinorAsMajor(m.eligibleTotalMinor, m.currency)} of{" "}
                            {formatMinorAsMajor(m.targetMinor, m.currency)}
                            {m.progressPercent != null ? ` · ${m.progressPercent}%` : ""}
                            {" · "}
                            self-reported
                          </p>
                        ) : m.privacyChip ? (
                          <p className="text-sm text-[var(--mute)]">
                            Monetary amounts and target hidden
                          </p>
                        ) : (
                          <p className="text-sm text-[var(--mute)]">Savings setup not active</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--mute)]">
                  Commitment figures stay in each member&apos;s own view.{" "}
                  <Link
                    href="/profile#privacy"
                    className="font-semibold text-[var(--accent)] underline"
                  >
                    Financial privacy settings
                  </Link>
                </p>
              </section>
            ) : null}

            <InviteOwnerPanel
              challengeId={challenge.id}
              invitations={invites.ok ? invites.invitations : []}
              members={admin.ok ? admin.members : []}
              siteOrigin={siteOrigin}
              isOwner={isOwner}
              canLeave={!leaveBlocked}
              leaveBlockedReason={
                leaveBlocked
                  ? "Owners of Scheduled or Active challenges must transfer ownership before leaving."
                  : undefined
              }
            />
          </>
        ) : null}

        <Link
          href="/challenge"
          className="inline-flex text-sm font-semibold text-[var(--accent)] underline"
        >
          All challenges
        </Link>
      </div>
    </AppShell>
  );
}
