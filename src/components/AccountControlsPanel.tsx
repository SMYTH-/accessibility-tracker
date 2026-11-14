"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  exportPersonalDataAction,
  finalizeDeletionAction,
  requestDeletionAction,
  transferOwnershipAction,
  type DeletionActionState,
  type ExportActionState,
  type TransferActionState,
} from "@/lib/account/actions";
import type { DeletionStatusView, TransferCandidate } from "@/lib/account/types";

const exportInitial: ExportActionState = {};
const deletionInitial: DeletionActionState = {};
const transferInitial: TransferActionState = {};

function downloadJson(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AccountControlsPanel({
  deletion,
  transferOptions,
}: {
  deletion: DeletionStatusView;
  transferOptions: { challengeId: string; challengeName: string; candidates: TransferCandidate[] }[];
}) {
  const [exportState, exportAction, exportPending] = useActionState(
    exportPersonalDataAction,
    exportInitial,
  );
  const [deletionState, deletionAction, deletionPending] = useActionState(
    requestDeletionAction,
    deletionInitial,
  );
  const [finalizeState, finalizeAction, finalizePending] = useActionState(
    finalizeDeletionAction,
    deletionInitial,
  );
  const [transferState, transferAction, transferPending] = useActionState(
    transferOwnershipAction,
    transferInitial,
  );
  const [ackDelete, setAckDelete] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (exportState.exportJson) {
      downloadJson(
        `accountability-tracker-export-${Date.now()}.json`,
        exportState.exportJson,
      );
    }
  }, [exportState.exportJson]);

  useEffect(() => {
    if (
      deletionState.pendingTransfer ||
      deletionState.gracePending ||
      transferState.message
    ) {
      router.refresh();
    }
  }, [
    deletionState.pendingTransfer,
    deletionState.gracePending,
    transferState.message,
    router,
  ]);

  const status = deletionState.status || deletion.status;
  const graceEndsAt = deletionState.graceEndsAt ?? deletion.graceEndsAt;

  return (
    <section className="space-y-4 at-surface p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--ink)]">Account controls</h2>
        <p className="mt-1 text-sm text-[var(--mute)]">
          Export your authorised personal data (ACC-01). Request deletion under the approved
          transfer / 7-day grace rules.
        </p>
      </div>

      <div className="space-y-3 border-t border-[var(--line)] pt-4">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Personal data export</h3>
        <p className="text-xs text-[var(--mute)]">
          Includes only your profile, memberships, savings, contributions, and challenge
          descriptors you belong to. Other members&apos; private monetary information is
          excluded.
        </p>
        <form action={exportAction}>
          <button
            type="submit"
            disabled={exportPending}
            className="at-btn-primary w-auto disabled:opacity-60"
          >
            {exportPending ? "Preparing export…" : "Export my data"}
          </button>
        </form>
        {exportState.error ? (
          <p className="text-sm text-red-800" role="alert">
            {exportState.error}
          </p>
        ) : null}
        {exportState.message ? (
          <p className="text-sm text-[var(--ink)]" role="status">
            {exportState.message}
          </p>
        ) : null}
        {exportState.exportMeta?.privacyNote ? (
          <p className="text-xs text-[var(--mute)]">{exportState.exportMeta.privacyNote}</p>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-[var(--line)] pt-4">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Account deletion</h3>
        <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--mute)]">
          <li>
            Active/Scheduled ownership requires an audited transfer to an eligible approved
            member when one exists.
          </li>
          <li>
            If none exist, remaining members are notified and a 7-day grace starts; at expiry
            the challenge is cancelled before your access is removed.
          </li>
          <li>A valid transfer during grace prevents cancellation.</li>
        </ul>

        {status && status !== "none" ? (
          <p className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]">
            Deletion status: <strong>{status}</strong>
            {graceEndsAt ? ` · grace ends ${graceEndsAt}` : ""}
          </p>
        ) : null}

        {transferOptions.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--ink)]">
              Transfer ownership before deletion can finalise:
            </p>
            {transferOptions.map((opt) => (
              <form
                key={opt.challengeId}
                action={transferAction}
                className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3"
              >
                <input type="hidden" name="challengeId" value={opt.challengeId} />
                <p className="text-sm font-medium text-[var(--ink)]">{opt.challengeName}</p>
                <label className="block text-xs text-[var(--mute)]">
                  New owner
                  <select
                    name="newOwnerUserId"
                    required
                    className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-2 py-2 text-sm text-[var(--ink)]"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select eligible approved member
                    </option>
                    {opt.candidates.map((c) => (
                      <option key={c.userId} value={c.userId}>
                        {c.displayName} ({c.email})
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={transferPending || opt.candidates.length === 0}
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-60"
                >
                  {transferPending ? "Transferring…" : "Transfer ownership"}
                </button>
              </form>
            ))}
            {transferState.error ? (
              <p className="text-sm text-red-800" role="alert">
                {transferState.error}
              </p>
            ) : null}
            {transferState.message ? (
              <p className="text-sm text-[var(--ink)]" role="status">
                {transferState.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <label className="flex items-start gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={ackDelete}
            onChange={(e) => setAckDelete(e.target.checked)}
            className="mt-1"
          />
          <span>
            I understand deletion revokes access, removes identity data, and may cancel
            Active/Scheduled challenges I own if no eligible replacement exists after the
            grace period.
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <form action={deletionAction}>
            <button
              type="submit"
              disabled={!ackDelete || deletionPending}
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-900 transition hover:bg-red-100 disabled:opacity-60"
            >
              {deletionPending ? "Requesting…" : "Request account deletion"}
            </button>
          </form>
          {status === "pending_transfer" ||
          status === "grace_pending" ||
          status === "ready" ? (
            <form action={finalizeAction}>
              <button
                type="submit"
                disabled={finalizePending}
                className="at-btn-secondary disabled:opacity-60"
              >
                {finalizePending ? "Finalising…" : "Finalise deletion now"}
              </button>
            </form>
          ) : null}
        </div>

        {deletionState.error ? (
          <p className="text-sm text-red-800" role="alert">
            {deletionState.error}
          </p>
        ) : null}
        {finalizeState.error ? (
          <p className="text-sm text-red-800" role="alert">
            {finalizeState.error}
          </p>
        ) : null}
        {deletionState.message ? (
          <p className="text-sm text-[var(--ink)]" role="status">
            {deletionState.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
