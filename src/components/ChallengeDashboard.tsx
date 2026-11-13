import Link from "next/link";
import { ActivityFeedList } from "@/components/ActivityFeedList";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import {
  supportiveMissMessage,
  type DashboardAssessmentStatus,
} from "@/lib/assessment/engine";
import type { LifecycleStatus } from "@/lib/challenge/types";
import { formatMinorAsMajor } from "@/lib/savings/money";
import type { ChallengeDashboard as DashboardData } from "@/lib/dashboard/types";

function weekStatusLabel(status: DashboardAssessmentStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "missed":
      return "Missed";
    case "in_progress":
      return "In progress";
    case "paused":
      return "Paused";
    case "pre_assessment":
      return "Before first assessed week";
    case "inactive":
      return "Not assessed";
    default:
      return status;
  }
}

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
  const isCompleted = data.lifecycleStatus === "Completed";
  const isCancelled = data.lifecycleStatus === "Cancelled";
  const readOnly = isCompleted || isCancelled;

  return (
    <div className="space-y-4" data-testid="challenge-path-b">
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">
          {isCompleted ? "Completed challenge" : "Challenge"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 break-words text-xl font-semibold text-[var(--ink)]">
            {data.challengeName}
          </h2>
          <ChallengeStatusBadge status={data.lifecycleStatus as LifecycleStatus} />
          {readOnly ? (
            <span
              className="rounded-lg border border-[var(--line)] bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
              data-testid="read-only-badge"
            >
              Read-only
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-[var(--mute)]">
          {data.startDate} → {data.endDate} · {data.currency} · {data.timeZone}
        </p>
        {isCompleted ? (
          <p className="mt-3 text-sm text-[var(--ink)]">
            Ordinary contributions, target changes and commitment changes are disabled
            (G1.1-12).
          </p>
        ) : null}
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
        <section
          className="space-y-3"
          aria-label="Weekly commitment and streak"
        >
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-xl border border-[var(--line)] bg-[var(--elevated)] px-3 py-2 text-sm tabular-nums text-[var(--ink)] shadow-[var(--shadow)]"
              data-testid="this-week-chip"
            >
              This week ·{" "}
              {formatMinorAsMajor(
                personal.currentWeekEligibleMinor,
                personal.currency,
              )}{" "}
              of{" "}
              {formatMinorAsMajor(
                personal.weeklyCommitmentMinor ?? 0,
                personal.currency,
              )}{" "}
              · {weekStatusLabel(personal.weeklyAssessmentStatus)}
            </span>
            <span
              className="rounded-xl border border-[color-mix(in_srgb,var(--deep-sea)_30%,var(--line))] bg-[var(--deep-sea-soft)] px-3 py-2 text-sm font-medium text-[var(--ink)] shadow-[var(--shadow)]"
              data-testid="your-streak-chip"
            >
              {personal.streakLabel}
              {personal.streakWeeks > 0
                ? ` · ${personal.streakWeeks} week${personal.streakWeeks === 1 ? "" : "s"}`
                : personal.streakStatus === "recovering"
                  ? " · ready to restart"
                  : " · 0 weeks"}
            </span>
          </div>

          {personal.weeklyAssessmentStatus === "pre_assessment" ? (
            <p className="text-sm text-[var(--mute)]">
              Savings before Monday {personal.firstAssessedWeekStart} count toward
              your personal target and milestones only — not weekly Completed /
              Missed.
            </p>
          ) : null}

          {personal.assessmentHistory.some((w) => w.status === "missed") &&
          personal.streakStatus === "recovering" ? (
            <p
              className="rounded-xl border border-[color-mix(in_srgb,var(--honey)_35%,var(--line))] bg-[var(--honey-soft)] px-3 py-2 text-sm text-[var(--ink)]"
              role="status"
              data-testid="miss-recovery-message"
            >
              {supportiveMissMessage()}
            </p>
          ) : null}

          {personal.assessmentHistory.length > 0 ? (
            <div
              className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-4 shadow-[var(--shadow)]"
              data-testid="assessment-history"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">
                Your weekly assessments
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {[...personal.assessmentHistory]
                  .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
                  .slice(0, 8)
                  .map((w) => (
                    <li
                      key={w.weekStart}
                      className="flex flex-wrap items-baseline justify-between gap-2 tabular-nums"
                      data-week-start={w.weekStart}
                      data-week-status={w.status}
                    >
                      <span className="text-[var(--ink)]">
                        Week of {w.weekStart}
                      </span>
                      <span className="text-[var(--mute)]">
                        {formatMinorAsMajor(w.eligibleSumMinor, personal.currency)} /{" "}
                        {formatMinorAsMajor(w.commitmentMinor, personal.currency)} ·{" "}
                        {weekStatusLabel(w.status)}
                      </span>
                    </li>
                  ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--mute)]">
                Visible only to you. Pause scheduling remains open — Paused is
                distinct from Completed and Missed when represented.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Path B order: Your streak / commitment (above) → roster → sharing → activity */}
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
          Commitment figures and assessment history stay in each member&apos;s own view.{" "}
          <Link href="/profile#privacy" className="font-semibold text-[var(--deep-sea)] underline">
            Financial privacy settings
          </Link>
        </p>
      </section>

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
        aria-labelledby="preview-label"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p
            className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
            id="preview-label"
          >
            Activity
          </p>
          <Link
            href="/activity"
            className="text-xs font-semibold text-[var(--deep-sea)] underline"
          >
            Full feed
          </Link>
        </div>
        <ActivityFeedList
          events={data.activityPreview}
          emptyLabel="No permitted activity yet."
          testId="activity-preview"
        />
      </section>

      {readOnly ? (
        <p
          className="rounded-xl border border-[var(--line)] bg-slate-50 px-4 py-3 text-center text-sm text-[var(--mute)]"
          data-testid="record-savings-disabled"
        >
          Recording savings is disabled while this challenge is{" "}
          {data.lifecycleStatus.toLowerCase()}.
        </p>
      ) : (
        <Link
          href={recordHref}
          className="flex w-full items-center justify-center rounded-xl bg-[var(--deep-sea)] px-4 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow)]"
        >
          Record savings
        </Link>
      )}

      <p className="text-center text-[10px] text-[var(--mute)]">
        Live at {new Date(data.generatedAt).toLocaleString()} · Path B: streak → roster → activity
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
