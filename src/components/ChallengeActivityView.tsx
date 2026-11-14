import Link from "next/link";
import { ActivityFeedList } from "@/components/ActivityFeedList";
import { ChallengeStatusBadge } from "@/components/ChallengeStatusBadge";
import type { ActivityFeedEvent } from "@/lib/activity/types";
import type { LifecycleStatus } from "@/lib/challenge/types";
import type {
  ActivityPreviewEvent,
  RosterMemberProjection,
} from "@/lib/dashboard/types";
import { formatMinorAsMajor } from "@/lib/savings/money";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

type FeedItem = ActivityFeedEvent | ActivityPreviewEvent;

export function ChallengeActivityView({
  challengeName,
  lifecycleStatus,
  challengeId,
  roster,
  events,
  readOnly,
  emptyLabel = "No permitted activity for this challenge yet.",
}: {
  challengeName: string;
  lifecycleStatus: LifecycleStatus | string;
  challengeId: string;
  roster: RosterMemberProjection[];
  events: FeedItem[];
  readOnly?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="space-y-5" data-testid="challenge-activity">
      <section className="at-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--ink)]">
            {challengeName}
          </h2>
          <ChallengeStatusBadge status={lifecycleStatus as LifecycleStatus} />
          {readOnly ? (
            <span className="rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--mute)_12%,white)] px-2.5 py-0.5 text-xs font-semibold text-[var(--mute)]">
              Read-only
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-[var(--mute)]">
          Warm roster + feed. Membership and privacy are enforced on the server before sorting.
          Hidden amounts and private members&apos; monetary events do not appear.
        </p>
        <Link
          href={`/challenge/${challengeId}`}
          className="mt-3 inline-flex text-sm font-semibold text-[var(--deep-sea)] underline"
        >
          Open challenge
        </Link>
      </section>

      <section
        className="at-surface p-5"
        aria-labelledby="activity-roster-label"
        data-testid="activity-roster"
      >
        <p className="at-eyebrow" id="activity-roster-label">
          Roster
        </p>
        <ul className="mt-1">
          {roster.map((m) => (
            <li
              key={m.membershipId}
              className="at-list-row"
              data-user-id={m.userId}
              data-privacy-chip={m.privacyChip ?? ""}
              data-share-monetary={m.shareMonetaryInfo ? "true" : "false"}
            >
              <span
                className={`at-avatar ${
                  m.privacyChip
                    ? "bg-[color-mix(in_srgb,var(--mute)_18%,white)] text-[var(--mute)]"
                    : "bg-[var(--deep-sea-soft)] text-[var(--deep-sea)]"
                }`}
                aria-hidden="true"
              >
                {initials(m.displayName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--ink)]">
                    {m.displayName}
                    {m.isSelf ? " (you)" : ""}
                  </span>
                  {m.privacyChip ? (
                    <span className="rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--mute)]">
                      {m.privacyChip}
                    </span>
                  ) : null}
                </div>
                {m.eligibleTotalMinor != null && m.targetMinor != null && m.currency ? (
                  <p className="mt-0.5 text-sm tabular-nums text-[var(--mute)]">
                    {formatMinorAsMajor(m.eligibleTotalMinor, m.currency)} of{" "}
                    {formatMinorAsMajor(m.targetMinor, m.currency)}
                    {m.progressPercent != null ? ` · ${m.progressPercent}%` : ""}
                    {" · "}
                    self-reported
                  </p>
                ) : m.privacyChip ? (
                  <p className="mt-0.5 text-sm text-[var(--mute)]">
                    Monetary amounts and target hidden
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-[var(--mute)]">Savings setup not active</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="at-surface p-5" aria-labelledby="feed-label">
        <p className="at-eyebrow" id="feed-label">
          Feed
        </p>
        <ActivityFeedList events={events} emptyLabel={emptyLabel} />
      </section>
    </div>
  );
}
