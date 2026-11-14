import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { ChallengeActivityView } from "@/components/ChallengeActivityView";
import { ChallengeDashboardView } from "@/components/ChallengeDashboard";
import { formatMinorAsMajor } from "@/lib/savings/money";
import {
  wisePreviewConfirmation,
  wisePreviewContributions,
  wisePreviewDashboard,
  wisePreviewTotals,
} from "@/lib/design/wisePreviewFixtures";

export const dynamic = "force-dynamic";

/**
 * Auth-free mobile design preview — MD3 / Dom Wise-ref direction.
 * Portugal 2027 fixture; does not mutate live savings behaviour.
 */
export default async function WisePreviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const raw = typeof sp.view === "string" ? sp.view : "dashboard";
  const view =
    raw === "record" || raw === "confirm" || raw === "activity" ? raw : "dashboard";

  const tabs = [
    { id: "dashboard", label: "Dashboard", href: "/wise-preview?view=dashboard" },
    { id: "record", label: "Record", href: "/wise-preview?view=record" },
    { id: "confirm", label: "Confirm", href: "/wise-preview?view=confirm" },
    { id: "activity", label: "Activity", href: "/wise-preview?view=activity" },
  ] as const;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip px-4 pb-28 pt-5">
      <header className="mb-5 min-w-0">
        <p className="text-xs font-semibold text-[var(--deep-sea)]">Accountability Tracker</p>
        <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight text-[var(--ink)]">
          Wise preview
        </h1>
        <p className="mt-1 text-sm text-[var(--mute)]">
          Design review v2 · MD3 / Dom refs · Portugal 2027 ·{" "}
          <code className="text-xs">design/wise-inspired-preview</code>
        </p>
      </header>

      <nav
        className="mb-6 flex gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--elevated)] p-1"
        aria-label="Preview screens"
      >
        {tabs.map((tab) => {
          const active = view === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                active
                  ? "bg-[var(--deep-sea)] text-[var(--lime)]"
                  : "text-[var(--mute)] hover:text-[var(--ink)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <main className="min-w-0 flex-1">
        {view === "dashboard" ? (
          <div data-preview-screen="dashboard">
            <ChallengeDashboardView
              data={wisePreviewDashboard}
              recordHref="/wise-preview?view=record"
            />
          </div>
        ) : null}

        {view === "record" ? (
          <div className="space-y-6" data-preview-screen="record">
            <section>
              <p className="at-section-label">Self-reported</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Record savings</h2>
              <p className="mt-2 text-sm text-[var(--mute)]">
                Active challenge · savings setup complete · today in Europe/London.
              </p>
              <div className="at-surface-soft mt-5 px-4 py-4">
                <p className="text-xs font-medium text-[var(--mute)]">Eligible total now</p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                  {formatMinorAsMajor(
                    wisePreviewTotals.eligibleTotalMinor,
                    wisePreviewTotals.currency,
                  )}
                </p>
                <p className="mt-0.5 text-sm tabular-nums text-[var(--mute)]">
                  of{" "}
                  {formatMinorAsMajor(
                    wisePreviewTotals.targetMinor!,
                    wisePreviewTotals.currency,
                  )}{" "}
                  · 41%
                </p>
              </div>
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium">
                  Amount (GBP)
                  <input
                    name="amountMajor"
                    type="text"
                    inputMode="decimal"
                    defaultValue="50.00"
                    readOnly
                    className="at-input"
                    aria-describedby="preview-amount-hint"
                  />
                </label>
                <p id="preview-amount-hint" className="text-xs text-[var(--mute)]">
                  Preview form — date fixed to today in Europe/London. Self-reported. Not a live
                  write.
                </p>
                <Link href="/wise-preview?view=confirm" className="at-btn-primary">
                  Record contribution
                </Link>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold">Your contributions</h2>
              <p className="mt-1 text-sm text-[var(--mute)]">Self-reported · own entries only</p>
              <ul className="mt-2 border-t border-[var(--line)]">
                {wisePreviewContributions.map((c) => (
                  <li
                    key={c.id}
                    className="border-b border-[var(--line)] py-4 text-sm"
                  >
                    <p className="font-bold tabular-nums">
                      {formatMinorAsMajor(c.amountMinor, c.currency)}
                      <span className="ml-2 text-xs font-medium text-[var(--mute)]">
                        {c.sourceLabel}
                      </span>
                    </p>
                    <p className="mt-1 text-[var(--mute)]">
                      Date {c.contributionDate} · week of {c.weekStart}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        {view === "confirm" ? (
          <div className="space-y-6" data-preview-screen="confirm">
            <section>
              <p className="at-section-label">Self-reported</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Record savings</h2>
              <div
                className="mt-5 space-y-3 rounded-[var(--radius-sheet)] border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
                role="status"
                data-testid="contribution-confirmation"
              >
                <p className="text-sm font-semibold">Contribution recorded</p>
                <p className="text-3xl font-bold tabular-nums tracking-tight">
                  +
                  {formatMinorAsMajor(
                    wisePreviewConfirmation.recordedMinor,
                    wisePreviewConfirmation.currency,
                  )}
                </p>
                <p className="text-sm text-[var(--mute)]">
                  Self-reported · {wisePreviewConfirmation.contributionDate}
                </p>
                <dl className="grid grid-cols-2 gap-4">
                  <div className="at-label-stack">
                    <dt className="label">Before</dt>
                    <dd className="value tabular-nums">
                      {formatMinorAsMajor(
                        wisePreviewConfirmation.previousEligibleMinor,
                        wisePreviewConfirmation.currency,
                      )}
                    </dd>
                  </div>
                  <div className="at-label-stack">
                    <dt className="label">After</dt>
                    <dd className="value tabular-nums">
                      {formatMinorAsMajor(
                        wisePreviewConfirmation.eligibleTotalMinor,
                        wisePreviewConfirmation.currency,
                      )}
                      <span className="ml-1 text-sm font-medium text-[var(--mute)]">· 43%</span>
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-[var(--mute)]">
                  Your contribution is included in the sharing-member total if you share monetary
                  information.
                </p>
              </div>
              <Link href="/wise-preview?view=dashboard" className="at-btn-secondary mt-5 w-full">
                Back to dashboard
              </Link>
            </section>
          </div>
        ) : null}

        {view === "activity" ? (
          <div data-preview-screen="activity">
            <ChallengeActivityView
              challengeName={wisePreviewDashboard.challengeName}
              lifecycleStatus={wisePreviewDashboard.lifecycleStatus}
              challengeId={wisePreviewDashboard.challengeId}
              roster={wisePreviewDashboard.roster}
              events={wisePreviewDashboard.activityPreview}
            />
          </div>
        ) : null}
      </main>

      {/* Floating pill nav preview (same component as live AppShell). */}
      <BottomNav />
    </div>
  );
}
