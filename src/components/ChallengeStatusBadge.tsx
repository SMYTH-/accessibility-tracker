import type { LifecycleStatus } from "@/lib/challenge/types";

const STYLES: Record<LifecycleStatus, string> = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Scheduled: "bg-[var(--honey-soft)] text-[var(--ink)] border-[color-mix(in_srgb,var(--honey)_35%,white)]",
  Active: "bg-[var(--deep-sea-soft)] text-[var(--deep-sea)] border-[color-mix(in_srgb,var(--deep-sea)_30%,white)]",
  Completed: "bg-slate-100 text-slate-600 border-slate-200",
  Cancelled: "bg-red-50 text-red-800 border-red-100",
};

export function ChallengeStatusBadge({ status }: { status: LifecycleStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
