import Link from "next/link";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import type { LifecycleStatus } from "@/lib/challenge/types";
import { formatMinorAsMajor } from "@/lib/savings/money";
import type { ChallengeDashboard as DashboardData } from "@/lib/dashboard/types";

function ProgressBar({
  percent,
  tone = "primary",
}: {
  percent: number | null;
  tone?: "primary" | "secondary";
}) {
  const width = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  const bar =
    tone === "secondary"
      ? "bg-[color-mix(in_srgb,var(--honey)_85%,#8a5a12)]"
      : "bg-[var(--deep-sea)]";
  return (
    <div
      className="mt-3 h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--line)_70%,white)]"
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full ${bar} transition-[width] duration-500 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function ChallengeDashboardView({
  data,
  recordHref,
}: {
  data: DashboardData;
  recordHref: string;
}) {
  const { personal, sharing } = data;
  const hasSetup = personal.savingsParticipationActive && personal.targetMinor != null;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">
          Active challenge
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            {data.challengeName}
          </h2>
          <ChallengeStatusBadge status={data.lifecycleStatus as LifecycleStatus} />
        </div>
        <p className="mt-1 text-sm text-[var(--mute)]">
          {data.startDate} → {data.endDate} · {data.currency} · {data.timeZone}
        </p>
      </header>

      {!hasSetup ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <p className="text-lg font-semibold">
            Personal progress
          </p>
          <p className="mt-2 text-sm text-[var(--mute)]">
            Activate your savings target and weekly commitment to see personal progress here.
          </p>
          <Link
            href={`/challenge/${data.challengeId}`}
            className="mt-4 inline-flex rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white"
          >
            Open challenge setup
          </Link>
        </section>
      ) : (
        <section
          className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
          aria-labelledby="personal-label"
        >
          <p
            className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
            id="personal-label"
          >
            Personal progress
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)] tabular-nums">
            {formatMinorAsMajor(personal.eligibleTotalMinor, personal.currency)} of{" "}
            {formatMinorAsMajor(personal.targetMinor!, personal.currency)}
          </p>
          <p className="mt-1 text-sm tabular-nums text-[var(--mute)]">
            Self-reported
            {personal.currentProgressPercent != null
              ? ` · Current ${personal.currentProgressPercent}%`
              : ""}
          </p>
          <ProgressBar percent={personal.currentProgressPercent} />

          {personal.milestoneRecognitionLabel ? (
            <div
              className="mt-4 flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--honey)_35%,var(--line))] bg-[var(--honey-soft)] px-3 py-2 text-sm text-[var(--ink)]"
              role="status"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--honey)]"
                aria-hidden="true"
              />
              <span>{personal.milestoneRecognitionLabel}</span>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--mute)]">
              Progress milestones (25 / 50 / 75 / 100%) appear here when reached — kept separate
              from current %.
            </p>
          )}

          {personal.preAssessmentMinor > 0 ? (
            <p className="mt-2 text-xs text-[var(--mute)]">
              Of which {formatMinorAsMajor(personal.preAssessmentMinor, personal.currency)} was
              before your first assessed week — counts toward personal target and milestones only.
            </p>
          ) : null}
        </section>
      )}

      {hasSetup ? (
        <div
          className="flex flex-wrap gap-2"
          aria-label="Weekly commitment and streak"
        >
          <span className="rounded-xl border border-[var(--line)] bg-[var(--elevated)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] shadow-[var(--shadow)]">
            This week ·{" "}
            {formatMinorAsMajor(personal.weeklyCommitmentMinor ?? 0, personal.currency)} ·
            assessment in M8
          </span>
          <span className="rounded-xl border border-[color-mix(in_srgb,var(--deep-sea)_30%,var(--line))] bg-[var(--deep-sea-soft)] px-3 py-2 text-sm font-medium text-[var(--ink)] shadow-[var(--shadow)]">
            {personal.streakLabel} · calculated in M8
          </span>
        </div>
      ) : null}

      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
        aria-labelledby="share-label"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
          id="share-label"
        >
          {sharing.label}
        </p>
        <p className="mt-2 text-xl font-semibold tabular-nums text-[var(--ink)]">
          {formatMinorAsMajor(sharing.savedMinor, sharing.currency)} of{" "}
          {formatMinorAsMajor(sharing.targetMinor, sharing.currency)}
        </p>
        <p className="mt-1 text-sm text-[var(--mute)]">{sharing.scopeExplanation}</p>
        {sharing.progressPercent != null ? (
          <p className="mt-1 text-xs tabular-nums text-[var(--mute)]">
            {sharing.progressPercent}% · {sharing.sharerCount} sharing member
            {sharing.sharerCount === 1 ? "" : "s"} · {sharing.sourceLabel}
          </p>
        ) : (
          <p className="mt-1 text-xs text-[var(--mute)]">
            {sharing.sharerCount} sharing member{sharing.sharerCount === 1 ? "" : "s"} with an
            active target
          </p>
        )}
        <ProgressBar percent={sharing.progressPercent} tone="secondary" />
        {!personal.shareMonetaryInfo ? (
          <p className="mt-3 text-xs text-[var(--mute)]">
            You opted out of sharing monetary information. Your own figures stay visible to you
            above; they are excluded from this total for other members.
          </p>
        ) : null}
      </section>

      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
        aria-labelledby="roster-label"
        data-testid="challenge-roster"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
          id="roster-label"
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
              data-share-monetary={m.shareMonetaryInfo ? "true" : "false"}
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
                  {" · "}
                  self-reported
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
        <p className="mt-3 text-xs text-[var(--mute)]">
          <Link href="/profile#privacy" className="font-semibold text-[var(--deep-sea)] underline">
            Financial privacy settings
          </Link>
        </p>
      </section>

      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
        aria-labelledby="preview-label"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
          id="preview-label"
        >
          Activity preview
        </p>
        {data.activityPreview.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--mute)]">
            No recent activity yet. Full challenge feed expands in M9.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.activityPreview.map((ev) => (
              <li
                key={ev.id}
                className="flex gap-3 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-sm"
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    ev.kind === "private_contribution"
                      ? "bg-slate-200 text-[var(--mute)]"
                      : "bg-[var(--honey-soft)] text-[var(--honey)]"
                  }`}
                  aria-hidden="true"
                >
                  {ev.kind === "private_contribution" ? "P" : "£"}
                </span>
                <div>
                  <p className="font-medium text-[var(--ink)]">{ev.title}</p>
                  <p className="text-[var(--mute)]">{ev.meta}</p>
                  {ev.amountMinor != null && ev.currency ? (
                    <p className="mt-0.5 text-xs tabular-nums text-[var(--mute)]">
                      {formatMinorAsMajor(ev.amountMinor, ev.currency)} · self-reported
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={recordHref}
        className="flex w-full items-center justify-center rounded-xl bg-[var(--deep-sea)] px-4 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow)]"
      >
        Record savings
      </Link>

      <p className="text-center text-[10px] text-[var(--mute)]">
        Live at {new Date(data.generatedAt).toLocaleString()} · no historical sharing-total series
      </p>
    </div>
  );
}

export function DashboardEmptyState({
  createHref = "/challenge/new",
}: {
  createHref?: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
      <h2 className="text-lg font-semibold">
        No challenge yet
      </h2>
      <p className="mt-2 text-sm text-[var(--mute)]">
        Create a private challenge to track personal progress and sharing-member totals.
      </p>
      <Link
        href={createHref}
        className="mt-4 flex w-full items-center justify-center rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white"
      >
        Create challenge
      </Link>
    </section>
  );
}
