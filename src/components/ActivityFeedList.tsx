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
      return "✓";
    case "private_contribution":
      return "P";
    default:
      return "£";
  }
}

function tone(kind: FeedItem["kind"]): string {
  switch (kind) {
    case "member_joined":
      return "bg-[var(--deep-sea-soft)] text-[var(--deep-sea)]";
    case "commitment_completed":
      return "bg-[var(--honey-soft)] text-[var(--honey)]";
    case "milestone_reached":
      return "bg-[color-mix(in_srgb,var(--honey)_40%,white)] text-[var(--ink)]";
    case "challenge_completed":
      return "bg-slate-200 text-slate-700";
    case "private_contribution":
      return "bg-slate-200 text-[var(--mute)]";
    default:
      return "bg-[var(--honey-soft)] text-[var(--honey)]";
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
    <ul className="mt-3 space-y-3" data-testid={testId}>
      {events.map((ev) => (
        <li
          key={ev.id}
          className="flex gap-3 rounded-xl bg-[var(--paper)] px-3 py-2.5 text-sm"
          data-event-kind={ev.kind}
          data-event-user={ev.userId}
        >
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tone(ev.kind)}`}
            aria-hidden="true"
          >
            {glyph(ev.kind)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words font-medium text-[var(--ink)]">{ev.title}</p>
            <p className="break-words text-[var(--mute)]">{ev.meta}</p>
            {ev.amountMinor != null && ev.currency ? (
              <p className="mt-0.5 text-xs tabular-nums text-[var(--mute)]">
                {formatMinorAsMajor(ev.amountMinor, ev.currency)} · self-reported
              </p>
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
