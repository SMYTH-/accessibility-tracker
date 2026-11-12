# M3 Walkthrough — Invitations, membership, join disclosure

| Field | Value |
| --- | --- |
| Milestone | M3 only (stop before M4) |
| Base tip | `27404a6b` (signed-off M2 / PR #3) |
| Branch | `cursor/m3-invitations-membership-7ab9` |
| Persistence | Supabase Auth + Postgres `gdrkejobqlvtwnlaedpu` |
| Preview | `http://localhost:3000` |
| Specs | CHAL-02, CHAL-03, PRIV-01 (disclosure), NOTIF-01, G1.1-07, G1.1-13, G1.1-14 |

## What was built

| Capability | Mode |
| --- | --- |
| Owner invite links (default 7-day expiry, revocable) | **Real** (RPC + UI) |
| Invitee preview: name / description / start / end / participant count only | **Real** (anon + auth RPC) |
| Sign-in / sign-up preserve invite journey (`?next=`) | **Real** |
| PRIV-01 disclosure + ack (UI disabled until check; server rejects without ack) | **Real** |
| Request → owner approve / decline | **Real** |
| Pending / declined: no financial challenge access (RLS + wait preview) | **Real** |
| Approval leaves savings inactive | **Real** |
| No duplicate memberships; safe retries | **Real** (`unique(challenge_id,user_id)` + idempotent pending) |
| NOTIF-01 approve / reject emails | **Delivered** — outbox → Ethereal test inbox (Resend when `RESEND_API_KEY` set); see `media/m3/07`–`08` |
| Leave + owner remove; immediate access revoke | **Real** |
| Owner leave blocked on Scheduled/Active until ownership transfer | **Blocked** (transfer / deletion fallback remain **OPEN**) |
| Invalid / expired / revoked links rejected | **Real** |

## Out of M3

Savings setup, contributions, aggregates, cancel, ownership transfer UI, account-deletion ownership fallback.

## Click path (local preview)

1. Sign in as owner → Create challenge (M2) → overview → **Create invite link** (default 7 days).
2. Copy `/invite/<token>` → open signed-out → confirm preview fields only.
3. **Sign in to continue** (or create account) → lands on disclosure; Continue disabled until ack.
4. Ack → request → **Waiting for approval** (no amounts / currency / totals).
5. Owner: **Pending requests** → Approve or Decline → invitee notification row in outbox.
6. After approve: invitee opens challenge; savings still inactive.
7. Member **Leave** revokes access; owner **Remove** revokes immediately.
8. Owner leave on Scheduled/Active shows G1.1-13 transfer required (transfer still open).

## Evidence commands

```bash
npm run smoke:m3
npm run evidence:m3:pg
npm run evidence:m3:ui   # needs preview on :3000
```

Screenshots: `media/m3/` when UI evidence is run.

## Stop

M3 complete for PO review. **Do not start M4.**
