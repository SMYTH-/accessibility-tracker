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
      : "border-[var(--line)] bg-[var(--lime-soft)] text-[var(--ink)]";
  return (
    <div className={`rounded-[var(--radius-md)] border px-3.5 py-3 text-sm ${styles}`} role="status">
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

  const livePct =
    totals && totals.targetMinor != null
      ? progressPercent(totals.eligibleTotalMinor, totals.targetMinor)
      : null;

  const confirm = recordState.confirmation;
  const confirmPct = confirm
    ? progressPercent(confirm.eligibleTotalMinor, confirm.targetMinor)
    : null;

  return (
    <div className="space-y-6">
      <section>
        <p className="at-section-label">Self-reported</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight">Record savings</h2>
        <p className="mt-2 text-sm text-[var(--mute)]">{gateReason}</p>

        {totals ? (
          <div className="at-surface-soft mt-5 px-4 py-4">
            <p className="text-xs font-medium text-[var(--mute)]">Eligible total now</p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-[var(--ink)]">
              {formatMinorAsMajor(totals.eligibleTotalMinor, currency)}
            </p>
            {totals.targetMinor != null ? (
              <p className="mt-0.5 text-sm tabular-nums text-[var(--mute)]">
                of {formatMinorAsMajor(totals.targetMinor, currency)}
                {livePct != null ? ` · ${livePct}%` : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        {totals && totals.preAssessmentMinor > 0 ? (
          <p className="mt-2 text-xs text-[var(--mute)]">
            Of which {formatMinorAsMajor(totals.preAssessmentMinor, currency)} was before your
            first assessed week — counts toward personal target and progress milestones only.
          </p>
        ) : null}

        {allowed ? (
          <form action={recordAction} className="mt-5 space-y-4">
            <input type="hidden" name="challengeId" value={challengeId} />
            <input type="hidden" name="idempotencyKey" value={idemKey} />
            <label className="block text-sm font-medium text-[var(--ink)]">
              Amount ({currency})
              <input
                name="amountMajor"
                type="text"
                inputMode="decimal"
                placeholder="50.00"
                required
                aria-describedby="record-amount-hint"
                className="at-input"
              />
            </label>
            <p id="record-amount-hint" className="text-xs text-[var(--mute)]">
              Date is fixed to <strong className="font-medium">today in {timeZone}</strong>.
              Labelled self-reported. Safe to retry — the same submit will not count twice.
            </p>
            <button type="submit" disabled={recordPending} className="at-btn-primary">
              {recordPending ? "Recording…" : "Record contribution"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            disabled
            className="at-btn-primary mt-5 cursor-not-allowed opacity-55"
          >
            Record savings — gated
          </button>
        )}

        {recordState.error ? (
          <div className="mt-4">
            <Alert tone="error">{recordState.error}</Alert>
          </div>
        ) : null}

        {confirm ? (
          <div
            className="mt-5 space-y-3 rounded-[var(--radius-sheet)] border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]"
            role="status"
            data-testid="contribution-confirmation"
          >
            <p className="text-sm font-semibold text-[var(--ink)]">
              Contribution recorded
              {confirm.replayed ? " · same retry, counted once" : ""}
            </p>
            <p className="text-3xl font-bold tabular-nums tracking-tight text-[var(--ink)]">
              +{formatMinorAsMajor(confirm.recordedMinor, confirm.currency)}
            </p>
            <p className="text-sm text-[var(--mute)]">
              Self-reported · {confirm.contributionDate}
            </p>
            <dl className="grid grid-cols-2 gap-4">
              <div className="at-label-stack">
                <dt className="label">Before</dt>
                <dd className="value tabular-nums">
                  {confirm.previousEligibleMinor != null
                    ? formatMinorAsMajor(confirm.previousEligibleMinor, confirm.currency)
                    : "—"}
                </dd>
              </div>
              <div className="at-label-stack">
                <dt className="label">After</dt>
                <dd className="value tabular-nums">
                  {formatMinorAsMajor(confirm.eligibleTotalMinor, confirm.currency)}
                  {confirmPct != null ? (
                    <span className="ml-1 text-sm font-medium text-[var(--mute)]">
                      · {confirmPct}%
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
            {confirm.targetMinor != null ? (
              <p className="text-xs text-[var(--mute)]">
                Personal target {formatMinorAsMajor(confirm.targetMinor, confirm.currency)}
              </p>
            ) : null}
            <p className="text-xs text-[var(--mute)]">
              Your contribution is included in the sharing-member total if you share monetary
              information.
            </p>
          </div>
        ) : recordState.message ? (
          <div className="mt-4 space-y-2">
            <Alert tone="ok">{recordState.message}</Alert>
            <p className="text-xs text-[var(--mute)]">
              Your contribution is included in the sharing-member total if you share monetary
              information.
            </p>
          </div>
        ) : null}

        {amendState.error ? (
          <div className="mt-3">
            <Alert tone="error">{amendState.error}</Alert>
          </div>
        ) : null}
        {amendState.message ? (
          <div className="mt-3">
            <Alert tone="ok">{amendState.message}</Alert>
          </div>
        ) : null}
        {reverseState.error ? (
          <div className="mt-3">
            <Alert tone="error">{reverseState.error}</Alert>
          </div>
        ) : null}
        {reverseState.message ? (
          <div className="mt-3">
            <Alert tone="ok">{reverseState.message}</Alert>
          </div>
        ) : null}
      </section>

      {contributions.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold">Your contributions</h2>
          <p className="mt-1 text-sm text-[var(--mute)]">Self-reported · own entries only</p>
          <ul className="mt-2 border-t border-[var(--line)]">
            {contributions.map((c) => (
              <li
                key={c.id}
                className="border-b border-[var(--line)] py-4 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold tabular-nums text-[var(--ink)]">
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
                    <form
                      action={amendAction}
                      className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"
                    >
                      <input type="hidden" name="challengeId" value={challengeId} />
                      <input type="hidden" name="contributionId" value={c.id} />
                      <label className="block flex-1 text-xs font-medium">
                        Amend amount
                        <input
                          name="amountMajor"
                          type="text"
                          inputMode="decimal"
                          placeholder={(c.amountMinor / 100).toFixed(2)}
                          required
                          className="at-input py-2 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={amendPending}
                        className="at-btn-secondary disabled:opacity-60"
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
                        className="rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-900 disabled:opacity-60"
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
        <section>
          <h2 className="text-lg font-bold">Contribution audit</h2>
          <ul className="mt-2 border-t border-[var(--line)]">
            {revisions.map((r) => (
              <li key={r.id} className="border-b border-[var(--line)] py-3.5 text-sm">
                <p className="font-semibold text-[var(--ink)]">{r.action}</p>
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
