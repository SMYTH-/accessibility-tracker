"use client";

import { useActionState } from "react";
import {
  activateSavingsAction,
  type SavingsActionState,
} from "@/lib/savings/actions";
import { formatMinorAsMajor } from "@/lib/savings/money";
import type { SavingsSetup } from "@/lib/savings/types";

const initial: SavingsActionState = {};

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
      : "border-[var(--line)] bg-[var(--accent-soft)] text-[var(--ink)]";
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${styles}`} role="status">
      {children}
    </div>
  );
}

export function SavingsSetupForm({
  challengeId,
  currency,
  timeZone,
  setup,
  savingsParticipationActive,
}: {
  challengeId: string;
  currency: string;
  timeZone: string;
  setup: SavingsSetup | null;
  savingsParticipationActive: boolean;
}) {
  const [activateState, activateAction, activatePending] = useActionState(
    activateSavingsAction,
    initial,
  );

  if (savingsParticipationActive && setup) {
    return (
      <section className="at-surface p-5">
        <h2 className="text-lg font-semibold">
          Your savings setup
        </h2>
        <p className="mt-1 text-sm text-[var(--mute)]">
          Participation is active · assessed in {timeZone}
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--mute)]">Personal target</dt>
            <dd className="font-medium">{formatMinorAsMajor(setup.targetMinor, currency)}</dd>
          </div>
          <div>
            <dt className="text-[var(--mute)]">Weekly commitment</dt>
            <dd className="font-medium">
              {formatMinorAsMajor(setup.weeklyCommitmentMinor, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--mute)]">First assessed week</dt>
            <dd className="font-medium">Monday {setup.firstAssessedWeekStart}</dd>
          </div>
          <div>
            <dt className="text-[var(--mute)]">Target effective from</dt>
            <dd className="font-medium">{setup.targetEffectiveFrom}</dd>
          </div>
        </dl>

        <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-[var(--mute)]">
          Changing your personal target after activation is not available yet. Weekly commitment
          changes are also not edited here.
        </p>
      </section>
    );
  }

  return (
    <section className="at-surface p-5">
      <h2 className="text-lg font-semibold">
        Activate savings participation
      </h2>
      <p className="mt-2 text-sm text-[var(--mute)]">
        Set a positive personal target and weekly commitment in {currency}. Until both are set,
        savings stay inactive — no missed weeks, and you cannot record contributions yet.
      </p>
      <form action={activateAction} className="mt-4 space-y-3">
        <input type="hidden" name="challengeId" value={challengeId} />
        <div>
          <label className="block text-sm font-medium text-[var(--ink)]" htmlFor="targetMajor">
            Personal savings target ({currency})
          </label>
          <input
            id="targetMajor"
            name="targetMajor"
            type="text"
            inputMode="decimal"
            placeholder="2000.00"
            required
            className="at-input text-sm"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-[var(--ink)]"
            htmlFor="weeklyCommitmentMajor"
          >
            Weekly commitment ({currency})
          </label>
          <input
            id="weeklyCommitmentMajor"
            name="weeklyCommitmentMajor"
            type="text"
            inputMode="decimal"
            placeholder="50.00"
            required
            className="at-input text-sm"
          />
        </div>
        <p className="text-xs text-[var(--mute)]">
          First assessed week uses challenge time zone {timeZone}: Monday activation assesses the
          current week; Tuesday–Sunday starts the following Monday.
        </p>
        {activateState.error ? <Alert tone="error">{activateState.error}</Alert> : null}
        {activateState.message ? <Alert tone="ok">{activateState.message}</Alert> : null}
        <button
          type="submit"
          disabled={activatePending}
          className="at-btn-primary disabled:opacity-60"
        >
          {activatePending ? "Activating…" : "Activate savings"}
        </button>
      </form>
    </section>
  );
}
