import { ActivityFeedList } from "@/components/ActivityFeedList";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import type { ChallengeCompletionSummary } from "@/lib/activity/types";
import { formatMinorAsMajor } from "@/lib/savings/money";

export function CompletionSummaryView({
  data,
}: {
  data: ChallengeCompletionSummary;
}) {
  const { personal, sharing } = data;

  return (
    <div className="space-y-4" data-testid="completion-summary">
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">
          Completed challenge
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            {data.challengeName}
          </h2>
          <ChallengeStatusBadge status="Completed" />
          <span
            className="rounded-lg border border-[var(--line)] bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
            data-testid="read-only-badge"
          >
            Read-only
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--mute)]">
          {data.startDate} → {data.endDate} · {data.currency} · {data.timeZone}
        </p>
        <p className="mt-3 text-sm text-[var(--ink)]">
          Ordinary contributions, target changes and commitment changes are disabled
          (G1.1-12). Reopening remains open.
        </p>
      </header>

      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
        aria-labelledby="completion-personal-label"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
          id="completion-personal-label"
        >
          Your summary
        </p>
        {personal.targetMinor != null ? (
          <>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)] tabular-nums">
              {formatMinorAsMajor(personal.eligibleTotalMinor, personal.currency)} of{" "}
              {formatMinorAsMajor(personal.targetMinor, personal.currency)}
            </p>
            <p className="mt-1 text-sm tabular-nums text-[var(--mute)]">
              Self-reported
              {personal.currentProgressPercent != null
                ? ` · Current ${personal.currentProgressPercent}%`
                : ""}
            </p>
            {personal.milestoneRecognitionLabel ? (
              <p className="mt-3 text-sm text-[var(--ink)]" role="status">
                {personal.milestoneRecognitionLabel}
              </p>
            ) : null}
            {personal.weeklyCommitmentMinor != null ? (
              <p className="mt-2 text-xs text-[var(--mute)]">
                Your weekly commitment{" "}
                {formatMinorAsMajor(personal.weeklyCommitmentMinor, personal.currency)}{" "}
                — visible only in your view.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--mute)]">
            Savings participation was not activated for this challenge.
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
        aria-labelledby="completion-participation-label"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
          id="completion-participation-label"
        >
          Participation
        </p>
        <p className="mt-2 text-sm tabular-nums text-[var(--ink)]">
          {data.participantCount} approved member
          {data.participantCount === 1 ? "" : "s"} · {data.activeSaverCount} with
          active savings setup
        </p>
      </section>

      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
        aria-labelledby="completion-share-label"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
          id="completion-share-label"
        >
          {sharing.label}
        </p>
        <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--ink)]">
          {formatMinorAsMajor(sharing.savedMinor, sharing.currency)} of{" "}
          {formatMinorAsMajor(sharing.targetMinor, sharing.currency)}
        </p>
        <p className="mt-1 text-sm text-[var(--mute)]">{sharing.scopeExplanation}</p>
      </section>

      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
        aria-labelledby="completion-roster-label"
        data-testid="completion-roster"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
          id="completion-roster-label"
        >
          Members
        </p>
        <ul className="mt-3 space-y-3">
          {data.roster.map((m) => (
            <li
              key={m.membershipId}
              className="rounded-xl bg-[var(--paper)] px-3 py-2.5 text-sm"
              data-user-id={m.userId}
              data-privacy-chip={m.privacyChip ?? ""}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[var(--ink)]">
                  {m.displayName}
                  {m.isSelf ? " (you)" : ""}
                </span>
                {m.privacyChip ? (
                  <span className="rounded-md border border-[var(--line)] bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--mute)]">
                    {m.privacyChip}
                  </span>
                ) : null}
              </div>
              {m.eligibleTotalMinor != null && m.targetMinor != null && m.currency ? (
                <p className="mt-1 tabular-nums text-[var(--mute)]">
                  {formatMinorAsMajor(m.eligibleTotalMinor, m.currency)} of{" "}
                  {formatMinorAsMajor(m.targetMinor, m.currency)}
                  {m.progressPercent != null ? ` · ${m.progressPercent}%` : ""}
                </p>
              ) : m.privacyChip ? (
                <p className="mt-1 text-[var(--mute)]">
                  Monetary amounts and target hidden
                </p>
              ) : (
                <p className="mt-1 text-[var(--mute)]">Savings setup not active</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
        aria-labelledby="completion-activity-label"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
          id="completion-activity-label"
        >
          Permitted activity
        </p>
        <ActivityFeedList events={data.activity} />
      </section>

      <p className="text-center text-[10px] text-[var(--mute)]">
        Privacy remains enforced after completion ·{" "}
        {new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
