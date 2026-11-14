import Link from "next/link";

export const CHALLENGE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "savings", label: "Savings" },
  { id: "people", label: "People" },
] as const;

export type ChallengeTabId = (typeof CHALLENGE_TABS)[number]["id"];

export function parseChallengeTab(
  raw: string | string[] | undefined,
): ChallengeTabId {
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "savings" || value === "people") return value;
  return "overview";
}

export function challengeTabHref(challengeId: string, tab: ChallengeTabId): string {
  if (tab === "overview") return `/challenge/${challengeId}`;
  return `/challenge/${challengeId}?tab=${tab}`;
}

export function ChallengeTabs({
  challengeId,
  active,
}: {
  challengeId: string;
  active: ChallengeTabId;
}) {
  return (
    <nav
      className="mb-2 flex gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--elevated)] p-1"
      aria-label="Challenge sections"
    >
      {CHALLENGE_TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={challengeTabHref(challengeId, tab.id)}
            className={`min-h-11 min-w-0 flex-1 rounded-full px-3 py-2.5 text-center text-sm font-semibold transition-colors ${
              selected
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "text-[var(--mute)] hover:text-[var(--ink)]"
            }`}
            aria-current={selected ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
