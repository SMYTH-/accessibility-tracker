# M10 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M10 · ACC-01 · §7.5–7.6 · §8.2 · §10.4–10.5 · G1.1-06 · G1.1-13 |
| M9 base tip | `e5c38070` (PR #10) |
| Implementation branch | `cursor/m10-account-controls-5ce0` · PR #11 |
| Tip SHA | _(set to branch HEAD on push)_ |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod linked) |
| Date | 13 November 2026 |
| Machine | Dom Mac · `~/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m10` · `npm run evidence:m10:pg` · `npm run evidence:m10:dual` · `npm run evidence:m10:ui` · `media/m10/` |
| Migrations | `20261113220000` + `20261113221000` + `20261113222000` + `20261113222100` + `20261113222200` (**applied**) |
| Deletion decision | **Approved Option A** — `docs/engineering/m10-deletion-decision.md` |

## Checklist

### Personal data export (ACC-01)

| Check | Result | Evidence |
| --- | --- | --- |
| Export limited to requester’s authorised personal data | **Pass** (live PG) | `evidence:m10:pg` alex/sam exports |
| Server-side authorisation (`auth.uid()`) | **Pass** | unauth export denied; stranger has no peer money |
| Other members’ private / peer monetary info excluded | **Pass** | alex excludes `7777`; sam excludes `8888`; emails excluded |
| Profile UI export | **Pass** (UI) | `media/m10/01-profile-account-controls.png`, `02-profile-export-ready.png` |

### Deletion journey (Option A)

| Check | Result | Evidence |
| --- | --- | --- |
| Eligible replacement → audited transfer required before finalise | **Pass** | alex `pending_transfer` → transfer to sam → completed |
| Transfer to non-eligible rejected | **Pass** | stranger transfer rejected |
| No eligible replacement → notify + 7-day grace | **Pass** | solo `grace_pending`; early finalise → `DELETION_GRACE_ACTIVE` |
| Transfer during grace prevents cancel | **Pass** | grace challenge remains **Active**, owned by sam |
| Grace expiry with no replacement → **Cancel** then remove access | **Pass** | tick finalised; challenge **Cancelled** |
| Safe retries (idempotent complete) | **Pass** | finalise idempotent after completed |
| Recheck ownership/lifecycle at finalisation | **Pass** | enforced in `finalize_account_deletion` |

### Dual-session revocation (required follow-up)

| Check | Result | Evidence |
| --- | --- | --- |
| Same disposable account on **two sessions**; finalise from one | **Pass** | `evidence:m10:dual` |
| Other session **immediately** loses export + challenge APIs while access token still in original lifetime | **Pass** | `ACCOUNT_ACCESS_REVOKED` on export / `challenge_dashboard` / create |
| Other session `getUser` / protected access fails | **Pass** | getUser error after revoke |
| **Refresh fails** on the other session | **Pass** | `Invalid Refresh Token: Refresh Token Not Found` |
| Old email/password sign-in fails | **Pass** | Invalid login credentials |
| Finalise **safe to retry** if session revocation fails | **Pass** (smoke) | forced failure → `revoking` + access denied → retry → `completed` |
| Report complete **only** after required revocation succeeds | **Pass** | status stays `revoking` with `revocation_error` until sessions wiped; then `completed` + `sessions_revoked_at` |
| Access denied while revocation pending | **Pass** | `account_access_is_denied` / pre-request + export assert; middleware/`getCurrentUser` |

### Data handling at finalisation (documented)

| Class | Handling |
| --- | --- |
| Sessions + refresh tokens | Deleted; ban applied only after successful revoke |
| Identity (email / password / metadata) | Tombstoned to `deleted-{uuid}@invalid.local` + **Deleted user** (preserves FK history) |
| Memberships | Ended (`left`); access revoked |
| Shared amounts others were authorised to see | Retained as minimum history; actor anonymised |
| Previously private figures | Remain absent from others’ views (G1.1-06) |
| Multi-year calendar retention purge | **Still OPEN** — not invented · **M11 carry-forward** |

### Hardening (§10.4–10.5)

| Check | Result | Evidence |
| --- | --- | --- |
| Rate limits on auth / invite / contribution / export | **Pass** (engineering defaults) | `consume_rate_limit` + action wrappers; export RPC limit 5/hour |
| Authz matrix review (account / invite / contribution) | **Pass** | session required; ownership/membership RPCs; export self-only; revoked-account gate |
| Dependency review | **Partial** | Next `15.5.29` (critical Next advisories addressed). Remaining transitive **postcss** + **sharp** · **M11 carry-forward** |
| Regression: money maths, streaks, membership, privacy, export/deletion | **Pass** | `smoke:m10`; live PG 50/50; dual-session 18/18 |

### Authz matrix (M10 surface)

| Action | Authn | Authz |
| --- | --- | --- |
| `export_own_personal_data` | required | self only + rate limit + not revoking/completed |
| `request_account_deletion` / `finalize_account_deletion` | required | self only; ownership/lifecycle recheck; finalize allowed while `revoking` for retry |
| `transfer_challenge_ownership` | required | current owner → eligible approved member |
| Invite create / membership request | required | owner / invitee + rate limit |
| Contribution record | required | approved + activated + rate limit |
| Data API generally | JWT | `enforce_account_access` pre-request denies `revoking`/`completed` |
| Auth sign-in/up/recovery (server actions) | n/a | per-email rate limit (+ Supabase Auth platform limits on browser path) |

## M11 carry-forward (explicit)

1. **Retention calendar** — multi-year purge schedule for anonymised residual history (still OPEN; not invented in M10).
2. **Remaining dependency advisories** — transitive `postcss` (via Next) and `sharp` highs after Next 15.5.29; evaluate Next 16 / force fixes under M11 security review.
3. **Full journey QA** — independent Playwright Journeys A–E, WCAG review, security reviewer sign-off (Gate 6).

## Explicitly not verified / out of scope

| Item | Note |
| --- | --- |
| Pause scheduling / streak awards / reopen | Still **OPEN** |
| Re-opt-in after monetary opt-out | Still **OPEN** |
| Manual cancel UX (non-deletion) | Still **OPEN** |

## Commands

```bash
npm run smoke:m10
npm run evidence:m10:pg
npm run evidence:m10:dual
npm run evidence:m10:ui   # requires localhost:3000
```

## Verdict

M10 account controls + hardening + dual-session revocation **live-verified** against linked Supabase `gdrkejobqlvtwnlaedpu`. **Stop before M11.**
