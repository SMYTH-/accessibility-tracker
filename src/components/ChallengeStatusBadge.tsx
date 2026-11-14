import type { LifecycleStatus } from "@/lib/challenge/types";

const STYLES: Record<LifecycleStatus, string> = {
  Draft: "border-[var(--line-strong)] bg-[var(--elevated)] text-[var(--mute)]",
  Scheduled: "border-transparent bg-[var(--honey-soft)] text-[var(--ink)]",
  Active: "border-transparent bg-[var(--deep-sea)] text-[var(--lime)]",
  Completed: "border-[var(--line-strong)] bg-[var(--surface-soft)] text-[var(--mute)]",
  Cancelled: "border-red-200 bg-red-50 text-red-800",
};

export function ChallengeStatusBadge({ status }: { status: LifecycleStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
