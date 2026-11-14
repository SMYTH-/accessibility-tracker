"use client";

import { useActionState, useState } from "react";
import {
  optOutMonetaryInfoAction,
  type PrivacyActionState,
} from "@/lib/privacy/actions";
import type { PrivacySettingItem } from "@/lib/privacy/types";

const initial: PrivacyActionState = {};

function ChallengePrivacyCard({ item }: { item: PrivacySettingItem }) {
  const [hideOn, setHideOn] = useState(!item.shareMonetaryInfo);
  const [acked, setAcked] = useState(false);
  const [state, action, pending] = useActionState(optOutMonetaryInfoAction, initial);

  const alreadyPrivate = !item.shareMonetaryInfo;
  const showSuccess =
    state.message && (!state.challengeId || state.challengeId === item.challengeId);
  const showError =
    state.error && (!state.challengeId || state.challengeId === item.challengeId);

  return (
    <article
      className="at-surface p-5"
      data-challenge-id={item.challengeId}
      data-share-monetary={item.shareMonetaryInfo ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-[var(--ink)]">{item.challengeName}</h3>
          <p className="mt-0.5 text-xs text-[var(--mute)]">
            {item.lifecycleStatus} · {item.role} · {item.currency}
          </p>
        </div>
        {alreadyPrivate ? (
          <span className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 text-xs font-semibold text-[var(--mute)]">
            Private
          </span>
        ) : (
          <span className="rounded-lg border border-[color-mix(in_srgb,var(--deep-sea)_30%,var(--line))] bg-[var(--deep-sea-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--ink)]">
            Sharing
          </span>
        )}
      </div>

      {alreadyPrivate ? (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-[var(--ink)]">
            You opted out of sharing monetary information for this challenge. Other approved
            members no longer see your amounts, target, or progress %. You still see your own
            figures.
          </p>
          <p className="text-xs text-[var(--mute)]">
            Re-enabling sharing after opt-out is not available yet (product decision still open).
            Small-group suppression also remains open and is not invented here.
          </p>
        </div>
      ) : (
        <form action={action} className="mt-4 space-y-4">
          <input type="hidden" name="challengeId" value={item.challengeId} />

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="hideMonetary"
              className="mt-1 h-4 w-4 accent-[var(--deep-sea)]"
              checked={hideOn}
              onChange={(e) => setHideOn(e.target.checked)}
              data-testid="hide-monetary-toggle"
            />
            <span>
              <strong className="font-semibold">Hide monetary information (opt-out)</strong>
              <span className="mt-1 block text-[var(--mute)]">
                Hides both your reported savings amounts and your individual target from other
                approved members, and excludes you from Sharing members only totals. Default is
                off — you are visible until you opt out.
              </span>
            </span>
          </label>

          <div className="rounded-xl border border-[color-mix(in_srgb,var(--honey)_35%,white)] bg-[var(--honey-soft)] px-3 py-2 text-sm">
            <strong className="font-semibold">Warning:</strong> Opting out cannot undo what others
            already saw.
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="cannotUndoAck"
              className="mt-1 h-4 w-4 accent-[var(--deep-sea)]"
              checked={acked}
              onChange={(e) => setAcked(e.target.checked)}
              data-testid="cannot-undo-ack"
            />
            <span>I understand that opting out cannot undo what others already saw.</span>
          </label>

          {showError ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
              role="status"
            >
              {state.error}
            </div>
          ) : null}
          {showSuccess ? (
            <div
              className="rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--ink)]"
              role="status"
            >
              {state.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!hideOn || !acked || pending}
            aria-disabled={!hideOn || !acked || pending}
            className="at-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="save-privacy"
          >
            {pending ? "Saving…" : "Save privacy setting"}
          </button>
        </form>
      )}
    </article>
  );
}

export function PrivacySettingsPanel({ items }: { items: PrivacySettingItem[] }) {
  return (
    <section id="privacy" className="space-y-4" aria-labelledby="privacy-heading">
      <div className="at-surface p-5">
        <h2 id="privacy-heading" className="text-lg font-semibold text-[var(--ink)]">
          Financial privacy
        </h2>
        <p className="mt-2 text-sm text-[var(--ink)]">
          Monetary information is visible to{" "}
          <strong className="font-semibold">approved challenge members</strong> by default — not
          private by default.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[var(--mute)]">
          <li>
            One control per challenge: <strong className="font-medium text-[var(--ink)]">Hide monetary information (opt-out)</strong>{" "}
            hides amounts <em>and</em> target.
          </li>
          <li>You always see your own authorised figures.</li>
          <li>
            Visible totals are labelled <strong className="font-medium text-[var(--ink)]">Sharing members only</strong>{" "}
            — not a full-group total.
          </li>
        </ul>
        <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--honey)_35%,white)] bg-[var(--honey-soft)] px-3 py-2 text-sm">
          <strong className="font-semibold">Warning:</strong> Opting out cannot undo what others
          already saw.
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line-strong)] bg-[var(--elevated)] p-5 text-sm text-[var(--mute)]">
          Join or create an approved challenge to manage monetary visibility for that challenge.
        </p>
      ) : (
        items.map((item) => <ChallengePrivacyCard key={item.membershipId} item={item} />)
      )}
    </section>
  );
}
