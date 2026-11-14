"use client";

import { useActionState, useMemo, useState } from "react";
import { CHALLENGE_CURRENCIES } from "@/lib/challenge/currencies";
import { CHALLENGE_TIME_ZONES } from "@/lib/challenge/timezones";
import {
  createChallengeAction,
  type CreateChallengeActionState,
} from "@/lib/challenge/actions";

const initial: CreateChallengeActionState = {};

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--ink)]">
        {children}
      </label>
      {hint ? <span className="text-xs text-[var(--mute)]">{hint}</span> : null}
    </div>
  );
}

export function ChallengeCreateForm({ defaultTimeZone }: { defaultTimeZone: string }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [state, formAction, pending] = useActionState(createChallengeAction, initial);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    currency: "GBP",
    timeZone: defaultTimeZone || "Europe/London",
  });

  const canStep1 = draft.name.trim().length > 0;
  const canStep2 = Boolean(draft.startDate && draft.endDate && draft.currency && draft.timeZone);

  const summary = useMemo(
    () => [
      { label: "Name", value: draft.name.trim() || "—" },
      { label: "Description", value: draft.description.trim() || "None" },
      { label: "Start", value: draft.startDate || "—" },
      { label: "End", value: draft.endDate || "—" },
      { label: "Currency", value: draft.currency },
      { label: "Time zone", value: draft.timeZone },
    ],
    [draft],
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="name" value={draft.name} />
      <input type="hidden" name="description" value={draft.description} />
      <input type="hidden" name="startDate" value={draft.startDate} />
      <input type="hidden" name="endDate" value={draft.endDate} />
      <input type="hidden" name="currency" value={draft.currency} />
      <input type="hidden" name="timeZone" value={draft.timeZone} />

      <ol className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--mute)]">
        {(["Details", "Schedule", "Review"] as const).map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const active = step === n;
          return (
            <li
              key={label}
              className={`rounded-lg px-2.5 py-1 ${active ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--surface-soft)] text-[var(--mute)]"}`}
            >
              {n}. {label}
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <section className="space-y-4 at-surface p-5">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="name">Challenge name</FieldLabel>
            <input
              id="name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              required
              maxLength={80}
              className="at-input"
              placeholder="Portugal 2027"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="description" hint="Optional">
              Description
            </FieldLabel>
            <textarea
              id="description"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              maxLength={500}
              rows={3}
              className="at-input"
              placeholder="Trip fund with friends"
            />
          </div>
          <p className="rounded-xl bg-[var(--deep-sea-soft)] px-3 py-2 text-sm text-[var(--ink)]">
            Personal savings target and weekly commitment are not required to create — you can
            set those later.
          </p>
          <button
            type="button"
            disabled={!canStep1}
            onClick={() => setStep(2)}
            className="at-btn-primary disabled:opacity-40"
          >
            Continue
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 at-surface p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="startDate">Start date</FieldLabel>
              <input
                id="startDate"
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                required
                className="at-input"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="endDate">End date</FieldLabel>
              <input
                id="endDate"
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                required
                className="at-input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <select
              id="currency"
              value={draft.currency}
              onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
              required
              className="at-input"
            >
              {CHALLENGE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="timeZone">Time zone</FieldLabel>
            <select
              id="timeZone"
              value={draft.timeZone}
              onChange={(e) => setDraft((d) => ({ ...d, timeZone: e.target.value }))}
              required
              className="at-input"
            >
              {CHALLENGE_TIME_ZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-[var(--mute)]">
            Start today (in this time zone) creates an Active challenge. A future start creates
            Scheduled. Past starts are rejected.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="at-btn-secondary flex-1"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canStep2}
              onClick={() => setStep(3)}
              className="at-btn-primary flex-1 disabled:opacity-40"
            >
              Review
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4 at-surface p-5">
          <ul className="space-y-3">
            {summary.map((row) => (
              <li key={row.label} className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--mute)]">{row.label}</span>
                <span className="text-right font-medium text-[var(--ink)]">{row.value}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-1 rounded-xl bg-[var(--honey-soft)] px-3 py-3 text-sm text-[var(--ink)]">
            <li>Private invitation-only challenge (no public listing).</li>
            <li>You become owner and approved member.</li>
            <li>You can invite members and set up savings after creating.</li>
            <li>Cancel is not available yet — contact support if you need help.</li>
          </ul>
          {state.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
              {state.error}
            </div>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="at-btn-secondary flex-1"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={pending}
              className="at-btn-primary flex-1 disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create challenge"}
            </button>
          </div>
        </section>
      ) : null}
    </form>
  );
}
