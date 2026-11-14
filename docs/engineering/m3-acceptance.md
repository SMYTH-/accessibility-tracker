# M3 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M3 |
| M2 base tip | `27404a6b` (PR #3) |
| Implementation branch | `cursor/m3-invitations-membership-7ab9` |
| Tip SHA | `7c0b7eec6a3415cecd3ca56363b11d3a5bf936e5` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod) |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m3` · `npm run evidence:m3:pg` · `npm run evidence:m3:ui` · `npm run evidence:m3:email` · `media/m3/` |

## Checklist

### Invitations (CHAL-02, G1.1-14, G1.1-07)

| Check | Result | Evidence |
| --- | --- | --- |
| Owner can create private invite links | **Pass** | RPC `create_challenge_invitation` + UI panel |
| Default expiry **7 days** | **Pass** | Postgres evidence `expiry ~7 days` |
| Owner can revoke before expiry | **Pass** | `revoke_challenge_invitation` + UI |
| Expired / revoked / invalid cannot create requests | **Pass** | PG evidence expired/revoked/invalid |
| Invite never bypasses approval | **Pass** | Request → pending until owner decide |
| Preview fields only: name, description, start, end, participant count | **Pass** | `get_invitation_preview` key allow-list |
| Preview leaks no financials | **Pass** | No currency/amount/target/total/TZ/owner keys |
| Invitee must authenticate before request | **Pass** | `/invite/.../join` redirects to sign-in with `next` |

### Disclosure (PRIV-01 / mid-fi Path D)

| Check | Result | Evidence |
| --- | --- | --- |
| Disclosure before request-join | **Pass** | `/invite/[token]/join` |
| Continue disabled until acknowledgement (UI) | **Pass** | `JoinDisclosureForm` |
| Server rejects without ack | **Pass** | `PRIVACY_ACK_REQUIRED` |
| Cannot-undo warning shown | **Pass** | Disclosure copy |

### Membership (CHAL-03)

| Check | Result | Evidence |
| --- | --- | --- |
| Pending cannot read private financial challenge data | **Pass** | RLS null + wait preview only |
| Declined does not gain access | **Pass** | Status declined; RLS denies challenge select |
| Approve grants approved membership | **Pass** | `decide_membership_request` approve |
| Approval leaves savings **inactive** | **Pass** | `savings_participation_active = false` |
| Duplicate memberships prevented | **Pass** | Unique `(challenge_id, user_id)`; count=1 |
| Safe retries on pending | **Pass** | Idempotent `created=false` |
| Members can leave; access revoked immediately | **Pass** | `leave_challenge` + RLS |
| Owners can remove; access revoked immediately | **Pass** | `remove_challenge_member` |
| Unrelated session cannot approve / read | **Pass** | PG evidence |

### Ownership departure (G1.1-13 MVP-safe)

| Check | Result | Evidence |
| --- | --- | --- |
| Owner leave blocked while Scheduled/Active | **Pass** | `OWNER_LEAVE_REQUIRES_TRANSFER` |
| Ownership transfer / deletion fallback | **OPEN** | Not implemented; does not block M3 |

### Notifications (NOTIF-01)

| Check | Result | Evidence |
| --- | --- | --- |
| Approval email recorded in outbox | **Pass** | `notification_outbox` kind `membership_approved` |
| Rejection email recorded in outbox | **Pass** | `notification_outbox` kind `membership_rejected` |
| Outbox connected to test email provider | **Pass** | `src/lib/notifications/deliver.ts` — Resend if `RESEND_API_KEY`, else Ethereal |
| Rejection email **arrived** in test inbox | **Pass** | Ethereal message preview · `media/m3/07-reject-email-inbox.png` · subject `Membership declined — …` |
| Approval email **arrived** in test inbox | **Pass** | Ethereal message preview · `media/m3/08-approve-email-inbox.png` · subject `Membership approved — …` |
| Outbox rows marked `sent` after delivery | **Pass** | `evidence:m3:email` status assertions |

## Evidence runs (12 Nov 2026)

| Suite | Result |
| --- | --- |
| `m3-service-smoke.ts` | **ALL PASS** (mock file store) |
| `m3-postgres-evidence.mjs` | **42/42 Pass** |
| `m3-supabase-ui-evidence.mjs` | **Pass** (6 screenshots) |
| `m3-email-delivery-evidence.mjs` | **17/17 Pass** (Ethereal test inbox; reject + approve delivered) |
| `npm run build` | **Pass** |

Artifacts (gitignored under `.data/`): `m3-postgres-evidence.json`, `m3-supabase-ui-evidence.json`, `m3-email-delivery-evidence.json`, `ethereal-account.json` (local-only).

Screenshots: `media/m3/` (01–06 journey · **07 reject inbox · 08 approve inbox**).

### Email delivery notes

- Provider used for verified inbox arrival: **Ethereal** (Nodemailer test account), because no `RESEND_API_KEY` was present in local env.
- App path also flushes outbox after approve/decline via `deliverOutboxById`.
- Resend remains supported: set `RESEND_API_KEY` + `M3_TEST_INBOX` (+ optional `EMAIL_FROM`) in `.env.local` only — never commit values.
- Coordinator was asked once for Resend vs Ethereal; Ethereal used as the no-secret test-inbox path to complete delivery evidence without blocking sign-off.

## Architecture notes

- Tables: `challenge_invitations`, extended `challenge_memberships`, `membership_audit`, `notification_outbox`
- Live RPCs: create/revoke invite, preview, request (+ack), decide, leave, remove, admin lists, wait preview
- Token stored as SHA-256 hash; plaintext returned once at create
- RLS: approved members read challenges; pending use wait-preview RPC only
- NOTIF delivery: outbox → Resend API or Ethereal SMTP; status `recorded` → `sent`/`failed`

## Unverified / remaining limitations

| Item | Notes |
| --- | --- |
| Production Resend / custom domain | Optional; Ethereal proves test delivery. Add `RESEND_API_KEY` locally when ready |
| Ownership transfer UI | **OPEN** — leave blocked until transfer exists |
| Owner account deletion fallback | **OPEN** |
| Cancel / savings / contributions | Out of M3 |

## Sign-off posture

M3 invitations + membership + **live NOTIF-01 test-inbox delivery** complete on test project `gdrkejobqlvtwnlaedpu`. Flows accepted at `1095d459`; delivery evidence added for full sign-off. **Stop before M4.**
