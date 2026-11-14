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
  label,
}: {
  percent: number | null;
  tone?: "primary" | "secondary";
  label?: string;
}) {
  const width = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  const bar = tone === "secondary" ? "bg-[var(--honey)]" : "bg-[var(--accent)]";
  return (
    <div className="mt-3">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent == null ? undefined : Math.round(width)}
        aria-label={label ?? "Progress"}
      >
        <div
          className={`h-full rounded-full ${bar} transition-[width] duration-500 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function Chevron() {
  return (
    <svg className="at-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const remaining =
    hasSetup && personal.targetMinor != null
      ? Math.max(0, personal.targetMinor - personal.eligibleTotalMinor)
      : null;

  return (
    <div className="space-y-6" data-testid="challenge-path-b">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 break-words text-xl font-bold tracking-tight text-[var(--ink)]">
            {data.challengeName}
          </h2>
          <ChallengeStatusBadge status={data.lifecycleStatus as LifecycleStatus} />
          {readOnly ? (
            <span
              className="at-chip"
              data-testid="read-only-badge"
            >
              Read-only
            </span>
          ) : null}
        </div>
        <p className="text-sm text-[var(--mute)]">
          {data.startDate} → {data.endDate} · {data.currency} · {data.timeZone}
        </p>
        {isCompleted ? (
          <p className="text-sm text-[var(--ink)]">
            Ordinary contributions, target changes and commitment changes are disabled
            (G1.1-12).
          </p>
        ) : null}
      </header>

      {!hasSetup ? (
        <section className="at-surface p-5">
          <p className="text-lg font-bold">Personal savings</p>
          <p className="mt-2 text-sm text-[var(--mute)]">
            Activate your savings target and weekly commitment to see personal progress here.
          </p>
          <Link href={`/challenge/${data.challengeId}`} className="at-btn-primary mt-5">
            Open challenge setup
          </Link>
        </section>
      ) : (
        <section aria-labelledby="personal-label">
          <div className="flex items-start justify-between gap-3">
            <p className="at-section-label" id="personal-label">
              Your savings · self-reported
            </p>
            {personal.currentProgressPercent != null ? (
              <p className="text-sm font-semibold tabular-nums text-[var(--accent)]">
                {personal.currentProgressPercent}%
              </p>
            ) : null}
          </div>

          <p className="at-hero-figure mt-3">
            {formatMinorAsMajor(personal.eligibleTotalMinor, personal.currency)}
          </p>
          <p className="mt-2 text-sm text-[var(--mute)]">
            of {formatMinorAsMajor(personal.targetMinor!, personal.currency)} personal target
            {remaining != null && remaining > 0
              ? ` · ${formatMinorAsMajor(remaining, personal.currency)} to go`
              : remaining === 0
                ? " · target reached"
                : ""}
          </p>

          <ProgressBar
            percent={personal.currentProgressPercent}
            label="Personal target progress"
          />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="at-surface-soft px-4 py-3">
              <p className="label text-xs font-medium text-[var(--mute)]">This week</p>
              <p
                className="mt-1 text-base font-bold tabular-nums text-[var(--ink)]"
                data-testid="this-week-chip"
              >
                {formatMinorAsMajor(personal.currentWeekEligibleMinor, personal.currency)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--mute)]">
                of{" "}
                {formatMinorAsMajor(personal.weeklyCommitmentMinor ?? 0, personal.currency)} ·{" "}
                {weekStatusLabel(personal.weeklyAssessmentStatus)}
              </p>
            </div>
            <div className="at-surface-soft px-4 py-3">
              <p className="text-xs font-medium text-[var(--mute)]">Your streak</p>
              <p
                className="mt-1 text-base font-bold text-[var(--ink)]"
                data-testid="your-streak-chip"
              >
                {personal.streakWeeks > 0
                  ? `${personal.streakWeeks} week${personal.streakWeeks === 1 ? "" : "s"}`
                  : personal.streakStatus === "recovering"
                    ? "Ready to restart"
                    : "0 weeks"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--mute)]">{personal.streakLabel}</p>
            </div>
          </div>

          {personal.milestoneRecognitionLabel ? (
            <div
              className="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--honey-soft)] px-3.5 py-3 text-sm text-[var(--ink)]"
              role="status"
            >
              <span className="at-chip-selected" aria-hidden>
                Milestone
              </span>
              <span className="min-w-0">
                <span className="font-semibold">{personal.milestoneRecognitionLabel}</span>
                {personal.currentProgressPercent != null ? (
                  <span className="text-[var(--mute)]">
                    {" "}
                    · current {personal.currentProgressPercent}% is separate
                  </span>
                ) : null}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--mute)]">
              Progress milestones (25 / 50 / 75 / 100%) appear when earned — separate from live
              current %.
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
        <section className="space-y-3" aria-label="Weekly commitment detail">
          {personal.weeklyAssessmentStatus === "pre_assessment" ? (
            <p className="text-sm text-[var(--mute)]">
              Savings before Monday {personal.firstAssessedWeekStart} count toward your personal
              target and milestones only — not weekly Completed / Missed.
            </p>
          ) : null}

          {personal.assessmentHistory.some((w) => w.status === "missed") &&
          personal.streakStatus === "recovering" ? (
            <p
              className="rounded-[var(--radius-md)] bg-[var(--honey-soft)] px-3.5 py-3 text-sm text-[var(--ink)]"
              role="status"
              data-testid="miss-recovery-message"
            >
              {supportiveMissMessage()}
            </p>
          ) : null}

          {personal.assessmentHistory.length > 0 ? (
            <div data-testid="assessment-history">
              <p className="at-section-label">Your weekly assessments</p>
              <div className="mt-2 border-t border-[var(--line)]">
                <ul>
                  {[...personal.assessmentHistory]
                    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
                    .slice(0, 8)
                    .map((w) => (
                      <li
                        key={w.weekStart}
                        className="at-list-row justify-between border-b border-[var(--line)] text-sm"
                        data-week-start={w.weekStart}
                        data-week-status={w.status}
                      >
                        <div className="at-label-stack">
                          <span className="label">Week of {w.weekStart}</span>
                          <span className="value text-sm">
                            {formatMinorAsMajor(w.eligibleSumMinor, personal.currency)} /{" "}
                            {formatMinorAsMajor(w.commitmentMinor, personal.currency)}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[var(--mute)]">
                          {weekStatusLabel(w.status)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
              <p className="mt-2 text-xs text-[var(--mute)]">
                Visible only to you. Pause scheduling remains open.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="share-label">
        <p className="at-section-label" id="share-label">
          {sharing.label}
        </p>
        <p className="mt-2 text-[1.75rem] font-bold tracking-tight tabular-nums text-[var(--ink)]">
          {formatMinorAsMajor(sharing.savedMinor, sharing.currency)}
        </p>
        <p className="mt-1 text-sm text-[var(--mute)]">
          of {formatMinorAsMajor(sharing.targetMinor, sharing.currency)} · distinct from your
          personal total
        </p>
        <p className="mt-2 text-sm text-[var(--mute)]">{sharing.scopeExplanation}</p>
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
        <ProgressBar
          percent={sharing.progressPercent}
          tone="secondary"
          label="Sharing members progress"
        />
        {!personal.shareMonetaryInfo ? (
          <p className="mt-3 text-xs text-[var(--mute)]">
            You opted out of sharing monetary information. Your own figures stay visible to you
            above; they are excluded from this total for other members.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="roster-label" data-testid="challenge-roster">
        <div className="flex items-baseline justify-between gap-2">
          <p className="at-section-label" id="roster-label">
            Members
          </p>
          <Link href="/activity" className="text-sm font-semibold text-[var(--accent)] underline">
            Activity
          </Link>
        </div>
        <ul className="mt-1 border-t border-[var(--line)]">
          {data.roster.map((m) => (
            <li
              key={m.membershipId}
              className="at-list-row border-b border-[var(--line)]"
              data-user-id={m.userId}
              data-privacy-chip={m.privacyChip ?? ""}
              data-share-monetary={m.shareMonetaryInfo ? "true" : "false"}
            >
              <span
                className={`at-avatar ${
                  m.privacyChip ? "bg-[var(--surface-soft)] text-[var(--mute)]" : ""
                }`}
                aria-hidden="true"
              >
                {initials(m.displayName)}
              </span>
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
              <Chevron />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[var(--mute)]">
          Commitment figures stay in each member&apos;s own view.{" "}
          <Link href="/profile#privacy" className="font-semibold text-[var(--accent)] underline">
            Financial privacy settings
          </Link>
        </p>
      </section>

      <section aria-labelledby="preview-label">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="at-section-label" id="preview-label">
            Recent activity
          </p>
          <Link href="/activity" className="text-sm font-semibold text-[var(--accent)] underline">
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
          className="rounded-[var(--radius-md)] bg-[var(--surface-soft)] px-4 py-3 text-center text-sm text-[var(--mute)]"
          data-testid="record-savings-disabled"
        >
          Recording savings is disabled while this challenge is{" "}
          {data.lifecycleStatus.toLowerCase()}.
        </p>
      ) : (
        <Link href={recordHref} className="at-btn-primary">
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
    <section className="at-surface p-5">
      <h2 className="text-lg font-bold">No challenge yet</h2>
      <p className="mt-2 text-sm text-[var(--mute)]">
        Create a private challenge to track personal progress and sharing-member totals.
      </p>
      <Link href={createHref} className="at-btn-primary mt-5">
        Create challenge
      </Link>
    </section>
  );
}
