"use client";

import { useActionState, useEffect, useState } from "react";
import {
  amendContributionAction,
  recordContributionAction,
  reverseContributionAction,
  type ContributionActionState,
} from "@/lib/contributions/actions";
import { formatMinorAsMajor } from "@/lib/savings/money";
import type {
  Contribution,
  ContributionRevision,
  EligibleTotals,
} from "@/lib/contributions/types";

const initial: ContributionActionState = {};

function Alert({
  tone,
  children,
}: {
  tone: "error" | "ok";
  children: React.ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-[color-mix(in_srgb,var(--deep-sea)_25%,white)] bg-[var(--deep-sea-soft)] text-[var(--ink)]";
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${styles}`} role="status">
      {children}
    </div>
  );
}

function progressPercent(eligible: number, target: number | null): number | null {
  if (target == null || target <= 0) return null;
  return Math.min(100, Math.floor((eligible * 100) / target));
}

export function ContributionPanel({
  challengeId,
  currency,
  timeZone,
  allowed,
  gateReason,
  initialIdempotencyKey,
  contributions,
  revisions,
  totals,
}: {
  challengeId: string;
  currency: string;
  timeZone: string;
  allowed: boolean;
  gateReason: string;
  initialIdempotencyKey: string;
  contributions: Contribution[];
  revisions: ContributionRevision[];
  totals: EligibleTotals | null;
}) {
  const [idemKey, setIdemKey] = useState(initialIdempotencyKey);
  const [recordState, recordAction, recordPending] = useActionState(
    recordContributionAction,
    initial,
  );
  const [amendState, amendAction, amendPending] = useActionState(
    amendContributionAction,
    initial,
  );
  const [reverseState, reverseAction, reversePending] = useActionState(
    reverseContributionAction,
    initial,
  );

  useEffect(() => {
    if (recordState.nextIdempotencyKey) {
      setIdemKey(recordState.nextIdempotencyKey);
    }
  }, [recordState.nextIdempotencyKey]);

  const pct =
    totals && totals.targetMinor != null
      ? progressPercent(totals.eligibleTotalMinor, totals.targetMinor)
      : null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
        <h2 className="text-lg font-semibold">
          Record savings
        </h2>
        <p className="mt-2 text-sm text-[var(--mute)]">{gateReason}</p>
        {totals ? (
          <p className="mt-2 text-sm tabular-nums text-[var(--ink)]">
            Eligible total (self-reported):{" "}
            <strong className="font-semibold">
              {formatMinorAsMajor(totals.eligibleTotalMinor, currency)}
            </strong>
            {totals.targetMinor != null ? (
              <>
                {" "}
                of {formatMinorAsMajor(totals.targetMinor, currency)}
                {pct != null ? ` · ${pct}%` : ""}
              </>
            ) : null}
          </p>
        ) : null}
        {totals && totals.preAssessmentMinor > 0 ? (
          <p className="mt-1 text-xs text-[var(--mute)]">
            Of which {formatMinorAsMajor(totals.preAssessmentMinor, currency)} was before
            your first assessed week — counts toward personal target and progress milestones
            only.
          </p>
        ) : null}

        {allowed ? (
          <form action={recordAction} className="mt-4 space-y-3">
            <input type="hidden" name="challengeId" value={challengeId} />
            <input type="hidden" name="idempotencyKey" value={idemKey} />
            <label className="block text-sm">
              <span className="text-[var(--mute)]">Amount ({currency})</span>
              <input
                name="amountMajor"
                type="text"
                inputMode="decimal"
                placeholder="50.00"
                required
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 tabular-nums text-[var(--ink)]"
              />
            </label>
            <p className="text-xs text-[var(--mute)]">
              Date is fixed to <strong className="font-medium">today in {timeZone}</strong>.
              Labelled self-reported. Safe to retry — the same submit will not count twice.
            </p>
            <button
              type="submit"
              disabled={recordPending}
              className="w-full rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {recordPending ? "Recording…" : "Record contribution"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            disabled
            className="mt-3 w-full rounded-xl border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm font-semibold text-[var(--mute)]"
          >
            Record savings — gated
          </button>
        )}

        {recordState.error ? <div className="mt-3"><Alert tone="error">{recordState.error}</Alert></div> : null}
        {recordState.message ? (
          <div className="mt-3 space-y-2">
            <Alert tone="ok">{recordState.message}</Alert>
            <p className="text-xs text-[var(--mute)]">
              Your contribution is included in the sharing-member total if you share monetary
              information.
            </p>
          </div>
        ) : null}
        {amendState.error ? <div className="mt-3"><Alert tone="error">{amendState.error}</Alert></div> : null}
        {amendState.message ? <div className="mt-3"><Alert tone="ok">{amendState.message}</Alert></div> : null}
        {reverseState.error ? <div className="mt-3"><Alert tone="error">{reverseState.error}</Alert></div> : null}
        {reverseState.message ? <div className="mt-3"><Alert tone="ok">{reverseState.message}</Alert></div> : null}
      </section>

      {contributions.length > 0 ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <h2 className="text-lg font-semibold">
            Your contributions
          </h2>
          <p className="mt-1 text-sm text-[var(--mute)]">Self-reported · own entries only</p>
          <ul className="mt-3 space-y-3">
            {contributions.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold tabular-nums text-[var(--ink)]">
                    {formatMinorAsMajor(c.amountMinor, c.currency)}
                    <span className="ml-2 text-xs font-medium text-[var(--mute)]">
                      {c.sourceLabel}
                    </span>
                  </p>
                  <p className="text-xs capitalize text-[var(--mute)]">{c.status}</p>
                </div>
                <p className="mt-1 text-[var(--mute)]">
                  Date {c.contributionDate} · week of {c.weekStart}
                </p>
                {c.status === "active" ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <form action={amendAction} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
                      <input type="hidden" name="challengeId" value={challengeId} />
                      <input type="hidden" name="contributionId" value={c.id} />
                      <label className="block flex-1 text-xs">
                        <span className="text-[var(--mute)]">Amend amount</span>
                        <input
                          name="amountMajor"
                          type="text"
                          inputMode="decimal"
                          placeholder={(c.amountMinor / 100).toFixed(2)}
                          required
                          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={amendPending}
                        className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] disabled:opacity-60"
                      >
                        Amend
                      </button>
                    </form>
                    <form action={reverseAction}>
                      <input type="hidden" name="challengeId" value={challengeId} />
                      <input type="hidden" name="contributionId" value={c.id} />
                      <button
                        type="submit"
                        disabled={reversePending}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900 disabled:opacity-60"
                      >
                        Reverse
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {revisions.length > 0 ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <h2 className="text-lg font-semibold">
            Contribution audit
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="rounded-xl bg-[var(--paper)] px-3 py-2">
                <p className="font-medium text-[var(--ink)]">{r.action}</p>
                <p className="text-[var(--mute)]">{r.detail}</p>
                <p className="text-xs text-[var(--mute)]">
                  Date {r.contributionDate} · week {r.weekStart}
                  {r.fromAmountMinor != null || r.toAmountMinor != null
                    ? ` · ${r.fromAmountMinor ?? "∅"} → ${r.toAmountMinor ?? "∅"} minor`
                    : ""}
                </p>
                <p className="text-xs text-[var(--mute)]">{r.at}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
