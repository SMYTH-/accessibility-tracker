import Link from "next/link";
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
 * Auth-free mobile design preview for Wise-inspired direction review.
 * Uses Portugal 2027 fixture data; does not mutate live savings behaviour.
 */
export default function WisePreviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <WisePreviewBody searchParams={searchParams} />
  );
}

async function WisePreviewBody({
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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-x-clip px-4 pb-10 pt-6">
      <header className="mb-5 min-w-0 px-0.5">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--deep-sea)]">
          Accountability Tracker
        </p>
        <h1 className="mt-1.5 text-[1.75rem] font-semibold tracking-tight text-[var(--ink)]">
          Wise preview
        </h1>
        <p className="mt-1.5 text-sm text-[var(--mute)]">
          Design review only · Portugal 2027 fixture · branch{" "}
          <code className="text-xs">design/wise-inspired-preview</code>
        </p>
      </header>

      <nav
        className="mb-5 flex gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--elevated)] p-1 shadow-[var(--shadow)]"
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
                  ? "bg-[var(--deep-sea)] text-white"
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
          <div className="space-y-5" data-preview-screen="record">
            <section className="at-surface p-5">
              <p className="at-eyebrow">Self-reported</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Record savings</h2>
              <p className="mt-2 text-sm text-[var(--mute)]">
                Active challenge · savings setup complete · today in Europe/London.
              </p>
              <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--deep-sea-soft)] px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">
                  Eligible total now
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
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
              <form className="mt-5 space-y-4" action="/wise-preview?view=confirm">
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
              </form>
            </section>

            <section className="at-surface p-5">
              <h2 className="text-lg font-semibold">Your contributions</h2>
              <p className="mt-1 text-sm text-[var(--mute)]">Self-reported · own entries only</p>
              <ul className="mt-2">
                {wisePreviewContributions.map((c) => (
                  <li
                    key={c.id}
                    className="border-b border-[var(--line)] py-3.5 text-sm last:border-b-0"
                  >
                    <p className="font-semibold tabular-nums">
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
          <div className="space-y-5" data-preview-screen="confirm">
            <section className="at-surface p-5">
              <p className="at-eyebrow">Self-reported</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Record savings</h2>
              <div
                className="mt-4 space-y-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--deep-sea)_28%,var(--line))] bg-[var(--deep-sea-soft)] p-4"
                role="status"
                data-testid="contribution-confirmation"
              >
                <p className="text-sm font-semibold">Contribution recorded</p>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  +
                  {formatMinorAsMajor(
                    wisePreviewConfirmation.recordedMinor,
                    wisePreviewConfirmation.currency,
                  )}
                </p>
                <p className="text-sm text-[var(--mute)]">
                  Self-reported · {wisePreviewConfirmation.contributionDate}
                </p>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">
                      Before
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {formatMinorAsMajor(
                        wisePreviewConfirmation.previousEligibleMinor,
                        wisePreviewConfirmation.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">
                      After
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {formatMinorAsMajor(
                        wisePreviewConfirmation.eligibleTotalMinor,
                        wisePreviewConfirmation.currency,
                      )}
                      <span className="ml-1 font-medium text-[var(--mute)]">· 43%</span>
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-[var(--mute)]">
                  Your contribution is included in the sharing-member total if you share monetary
                  information.
                </p>
              </div>
              <Link href="/wise-preview?view=dashboard" className="at-btn-secondary mt-4 w-full">
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
    </div>
  );
}
