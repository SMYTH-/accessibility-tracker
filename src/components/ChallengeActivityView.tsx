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

function Chevron() {
  return (
    <svg className="at-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
    <div className="space-y-6" data-testid="challenge-activity">
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">{challengeName}</h2>
          <ChallengeStatusBadge status={lifecycleStatus as LifecycleStatus} />
          {readOnly ? <span className="at-chip">Read-only</span> : null}
        </div>
        <p className="mt-2 text-sm text-[var(--mute)]">
          Roster + feed. Membership and privacy are enforced on the server before sorting. Hidden
          amounts and private members&apos; monetary events do not appear.
        </p>
        <Link
          href={`/challenge/${challengeId}`}
          className="mt-3 inline-flex text-sm font-semibold text-[var(--deep-sea)] underline"
        >
          Open challenge
        </Link>
      </section>

      <section aria-labelledby="activity-roster-label" data-testid="activity-roster">
        <p className="at-section-label" id="activity-roster-label">
          Roster
        </p>
        <ul className="mt-1 border-t border-[var(--line)]">
          {roster.map((m) => (
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
      </section>

      <section aria-labelledby="feed-label">
        <p className="at-section-label" id="feed-label">
          Feed
        </p>
        <ActivityFeedList events={events} emptyLabel={emptyLabel} />
      </section>
    </div>
  );
}
