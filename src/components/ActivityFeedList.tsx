import { formatMinorAsMajor } from "@/lib/savings/money";
import type { ActivityFeedEvent } from "@/lib/activity/types";
import type { ActivityPreviewEvent } from "@/lib/dashboard/types";

type FeedItem = ActivityFeedEvent | ActivityPreviewEvent;

function glyph(kind: FeedItem["kind"]): string {
  switch (kind) {
    case "member_joined":
      return "J";
    case "commitment_completed":
      return "W";
    case "milestone_reached":
      return "M";
    case "challenge_completed":
      return "C";
    case "private_contribution":
      return "P";
    default:
      return "+";
  }
}

function tone(kind: FeedItem["kind"]): string {
  switch (kind) {
    case "member_joined":
      return "bg-[var(--deep-sea-soft)] text-[var(--deep-sea)]";
    case "commitment_completed":
      return "bg-[var(--lime)] text-[var(--lime-ink)]";
    case "milestone_reached":
      return "bg-[var(--honey-soft)] text-[var(--honey)]";
    case "challenge_completed":
      return "bg-[var(--surface-soft)] text-[var(--ink)]";
    case "private_contribution":
      return "bg-[var(--surface-soft)] text-[var(--mute)]";
    default:
      return "bg-[var(--deep-sea)] text-white";
  }
}

export function ActivityFeedList({
  events,
  emptyLabel = "No permitted activity yet.",
  testId = "activity-feed",
}: {
  events: FeedItem[];
  emptyLabel?: string;
  testId?: string;
}) {
  if (events.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--mute)]" data-testid={`${testId}-empty`}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="mt-1 border-t border-[var(--line)]" data-testid={testId}>
      {events.map((ev) => (
        <li
          key={ev.id}
          className="at-list-row border-b border-[var(--line)]"
          data-event-kind={ev.kind}
          data-event-user={ev.userId}
        >
          <span
            className={`at-avatar border-0 ${tone(ev.kind)}`}
            aria-hidden="true"
          >
            {glyph(ev.kind)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="break-words font-semibold text-[var(--ink)]">{ev.title}</p>
              {ev.amountMinor != null && ev.currency ? (
                <p className="shrink-0 text-sm font-bold tabular-nums text-[var(--ink)]">
                  {formatMinorAsMajor(ev.amountMinor, ev.currency)}
                </p>
              ) : null}
            </div>
            <p className="break-words text-sm text-[var(--mute)]">{ev.meta}</p>
            {ev.amountMinor != null && ev.currency ? (
              <p className="mt-0.5 text-xs text-[var(--mute)]">Self-reported</p>
            ) : null}
            <p className="mt-0.5 text-[10px] text-[var(--mute)]">
              {new Date(ev.at).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
