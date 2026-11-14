"use client";

import { useActionState, useState } from "react";
import { requestJoinAction, type MembershipActionState } from "@/lib/membership/actions";

const initial: MembershipActionState = {};

export function JoinDisclosureForm({
  token,
  challengeName,
}: {
  token: string;
  challengeName: string;
}) {
  const [acked, setAcked] = useState(false);
  const [state, action, pending] = useActionState(requestJoinAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <article className="at-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mute)]">
          How monetary visibility works
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--ink)]">
          <li>
            By default, amounts and your target are visible to{" "}
            <strong className="font-semibold">approved challenge members</strong> after you join.
          </li>
          <li>
            You can opt out with <strong className="font-semibold">Hide monetary information</strong>{" "}
            — this hides amounts <em>and</em> target, and excludes you from{" "}
            <strong className="font-semibold">Sharing members only</strong> totals.
          </li>
          <li>You always see your own figures.</li>
        </ul>
        <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--honey)_35%,white)] bg-[var(--honey-soft)] px-3 py-2 text-sm">
          <strong className="font-semibold">Warning:</strong> Opting out cannot undo what others
          already saw.
        </div>
      </article>

      <label className="flex items-start gap-3 at-surface p-4 text-sm">
        <input
          type="checkbox"
          name="privacyAck"
          className="mt-1 h-4 w-4 accent-[var(--deep-sea)]"
          checked={acked}
          onChange={(e) => setAcked(e.target.checked)}
        />
        <span>
          I understand how monetary visibility works in <strong>{challengeName}</strong>.
        </span>
      </label>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="status">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!acked || pending}
        aria-disabled={!acked || pending}
        className="at-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Continue to request join"}
      </button>
    </form>
  );
}
