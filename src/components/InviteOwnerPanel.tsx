"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createInviteAction,
  decideMembershipAction,
  leaveChallengeAction,
  removeMemberAction,
  revokeInviteAction,
  type MembershipActionState,
} from "@/lib/membership/actions";
import type { ChallengeInvitation, MembershipAdminRow } from "@/lib/membership/types";

const initial: MembershipActionState = {};

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

export function InviteOwnerPanel({
  challengeId,
  invitations,
  members,
  siteOrigin,
  isOwner,
  canLeave,
  leaveBlockedReason,
}: {
  challengeId: string;
  invitations: ChallengeInvitation[];
  members: MembershipAdminRow[];
  siteOrigin: string;
  isOwner: boolean;
  canLeave: boolean;
  leaveBlockedReason?: string;
}) {
  const [createState, createAction, createPending] = useActionState(createInviteAction, initial);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeInviteAction, initial);
  const [decideState, decideAction, decidePending] = useActionState(decideMembershipAction, initial);
  const [removeState, removeAction, removePending] = useActionState(removeMemberAction, initial);
  const [leaveState, leaveAction, leavePending] = useActionState(leaveChallengeAction, initial);
  const [copied, setCopied] = useState(false);

  const flash = createState.message || revokeState.message || decideState.message || removeState.message;
  const error =
    createState.error ||
    revokeState.error ||
    decideState.error ||
    removeState.error ||
    leaveState.error;

  useEffect(() => {
    if (!createState.invitePath) return;
    const url = `${siteOrigin}${createState.invitePath}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [createState.invitePath, siteOrigin]);

  const pending = members.filter((m) => m.status === "pending");
  const roster = members.filter((m) => m.status === "approved");

  return (
    <div className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {flash ? <Alert tone="ok">{flash}</Alert> : null}
      {createState.invitePath ? (
        <Alert tone="ok">
          <p className="font-medium">Share this invite link (shown once):</p>
          <p className="mt-1 break-all text-xs">
            {siteOrigin}
            {createState.invitePath}
          </p>
          {copied ? <p className="mt-1 text-xs">Copied to clipboard.</p> : null}
        </Alert>
      ) : null}

      {isOwner ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <h2 className="text-lg font-semibold">
            Invite links
          </h2>
          <p className="mt-1 text-sm text-[var(--mute)]">
            Default expiry is 7 days. Links are revocable. Invitees only see name, description,
            dates, and participant count.
          </p>
          <form action={createAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="challengeId" value={challengeId} />
            <label className="text-sm">
              <span className="mb-1 block text-[var(--mute)]">Expires (days)</span>
              <input
                type="number"
                name="expiresInDays"
                min={1}
                max={30}
                defaultValue={7}
                className="w-24 rounded-xl border border-[var(--line)] px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={createPending}
              className="rounded-xl bg-[var(--deep-sea)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createPending ? "Creating…" : "Create invite link"}
            </button>
          </form>

          <ul className="mt-4 space-y-2 text-sm">
            {invitations.length === 0 ? (
              <li className="text-[var(--mute)]">No invites yet.</li>
            ) : (
              invitations.map((inv) => {
                const revoked = Boolean(inv.revokedAt);
                const expired = new Date(inv.expiresAt).getTime() <= Date.now();
                return (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--paper)] px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">
                        {revoked ? "Revoked" : expired ? "Expired" : "Active"} · expires{" "}
                        {new Date(inv.expiresAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-[var(--mute)]">id {inv.id.slice(0, 8)}…</p>
                    </div>
                    {!revoked && !expired ? (
                      <form action={revokeAction}>
                        <input type="hidden" name="challengeId" value={challengeId} />
                        <input type="hidden" name="invitationId" value={inv.id} />
                        <button
                          type="submit"
                          disabled={revokePending}
                          className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
                        >
                          Revoke
                        </button>
                      </form>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </section>
      ) : null}

      {isOwner ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
          <h2 className="text-lg font-semibold">
            Pending requests
          </h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--mute)]">No pending requests.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pending.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--paper)] px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{m.displayName}</p>
                    <p className="text-xs text-[var(--mute)]">{m.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <form action={decideAction}>
                      <input type="hidden" name="challengeId" value={challengeId} />
                      <input type="hidden" name="membershipId" value={m.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button
                        type="submit"
                        disabled={decidePending}
                        className="rounded-lg bg-[var(--deep-sea)] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={decideAction}>
                      <input type="hidden" name="challengeId" value={challengeId} />
                      <input type="hidden" name="membershipId" value={m.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <button
                        type="submit"
                        disabled={decidePending}
                        className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
        <h2 className="text-lg font-semibold">
          Members
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {roster.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--paper)] px-3 py-2"
            >
              <div>
                <p className="font-medium">
                  {m.displayName}{" "}
                  <span className="text-xs font-semibold text-[var(--mute)]">· {m.role}</span>
                </p>
                <p className="text-xs text-[var(--mute)]">
                  Savings {m.savingsParticipationActive ? "active" : "inactive"}
                </p>
              </div>
              {isOwner && m.role !== "owner" ? (
                <form action={removeAction}>
                  <input type="hidden" name="challengeId" value={challengeId} />
                  <input type="hidden" name="membershipId" value={m.id} />
                  <button
                    type="submit"
                    disabled={removePending}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900"
                  >
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--elevated)] p-5 shadow-[var(--shadow)]">
        <h2 className="text-lg font-semibold">Leave</h2>
        {canLeave ? (
          <form action={leaveAction} className="mt-3">
            <input type="hidden" name="challengeId" value={challengeId} />
            <button
              type="submit"
              disabled={leavePending}
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {leavePending ? "Leaving…" : "Leave challenge"}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-[var(--mute)]">
            {leaveBlockedReason ||
              "Owners of Scheduled or Active challenges must transfer ownership before leaving (G1.1-13). Transfer remains open."}
          </p>
        )}
      </section>
    </div>
  );
}
