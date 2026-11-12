# M3 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M3 |
| M2 base tip | `27404a6b` (PR #3) |
| Implementation branch | `cursor/m3-invitations-membership-7ab9` |
| Tip SHA | _(fill at handoff)_ |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod) |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m3` · `npm run evidence:m3:pg` · `npm run evidence:m3:ui` · `media/m3/` |

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
| Approval email recorded | **Pass** | `notification_outbox` kind `membership_approved` |
| Rejection email recorded | **Pass** | `notification_outbox` kind `membership_rejected` |

## Evidence runs (12 Nov 2026)

| Suite | Result |
| --- | --- |
| `m3-service-smoke.ts` | **ALL PASS** (mock file store) |
| `m3-postgres-evidence.mjs` | **42/42 Pass** |
| `m3-supabase-ui-evidence.mjs` | _(fill after UI run)_ |
| `npm run build` | **Pass** |

Artifacts (gitignored under `.data/`): `m3-postgres-evidence.json`, `m3-supabase-ui-evidence.json`.

Screenshots: `media/m3/`.

## Architecture notes

- Tables: `challenge_invitations`, extended `challenge_memberships`, `membership_audit`, `notification_outbox`
- Live RPCs: create/revoke invite, preview, request (+ack), decide, leave, remove, admin lists, wait preview
- Token stored as SHA-256 hash; plaintext returned once at create
- RLS: approved members read challenges; pending use wait-preview RPC only

## Unverified / remaining limitations

| Item | Notes |
| --- | --- |
| External SMTP / Resend delivery | Outbox **recorded** with subject/body; provider wiring optional |
| Ownership transfer UI | **OPEN** — leave blocked until transfer exists |
| Owner account deletion fallback | **OPEN** |
| Cancel / savings / contributions | Out of M3 |

## Sign-off posture

M3 invitations + membership complete on test project `gdrkejobqlvtwnlaedpu`. **Keep open for PO review. Stop before M4.**
