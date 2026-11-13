# M10 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M10 · ACC-01 · §7.5–7.6 · §8.2 · §10.4–10.5 · G1.1-06 · G1.1-13 |
| M9 base tip | `e5c38070` (PR #10) |
| Implementation branch | `cursor/m10-account-controls-5ce0` |
| Tip SHA | `5de41a0e86a12693e0b3ab5d721c02b1af98551f` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod linked) |
| Date | 13 November 2026 |
| Machine | Dom Mac · `~/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m10` · `npm run evidence:m10:pg` · `npm run evidence:m10:ui` · `media/m10/` |
| Migrations | `20261113220000_m10_account_export_hardening.sql` + `20261113221000_m10_account_deletion.sql` (**applied**) |
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
| Safe retries | **Pass** | finalise idempotent after completed |
| Access denial after finalisation | **Pass** | old email/password sign-in fails |
| Recheck ownership/lifecycle at finalisation | **Pass** | enforced in `finalize_account_deletion` |

### Data handling at finalisation (documented)

| Class | Handling |
| --- | --- |
| Sessions | Revoked |
| Identity (email / password / metadata) | Tombstoned to `deleted-{uuid}@invalid.local` + **Deleted user** (preserves FK history) |
| Memberships | Ended (`left`); access revoked |
| Shared amounts others were authorised to see | Retained as minimum history; actor anonymised |
| Previously private figures | Remain absent from others’ views (G1.1-06) |
| Multi-year calendar retention purge | **Still OPEN** — not invented |

### Hardening (§10.4–10.5)

| Check | Result | Evidence |
| --- | --- | --- |
| Rate limits on auth / invite / contribution / export | **Pass** (engineering defaults) | `consume_rate_limit` + action wrappers; export RPC limit 5/hour |
| Authz matrix review (account / invite / contribution) | **Pass** | session required; ownership/membership RPCs; export self-only |
| Dependency review | **Partial** | Next upgraded `15.5.7` → `15.5.29` (critical Next advisories addressed). Remaining transitive **postcss** (via Next) + **sharp** high — tracked; not force-bumped to Next 16 |
| Regression: money maths, streaks, membership, privacy, export/deletion | **Pass** | `smoke:m10` offline; live PG 50/50 |

### Authz matrix (M10 surface)

| Action | Authn | Authz |
| --- | --- | --- |
| `export_own_personal_data` | required | self only + rate limit |
| `request_account_deletion` / `finalize_account_deletion` | required | self only; ownership/lifecycle recheck |
| `transfer_challenge_ownership` | required | current owner → eligible approved member |
| Invite create / membership request | required | owner / invitee + rate limit |
| Contribution record | required | approved + activated + rate limit |
| Auth sign-in/up/recovery (server actions) | n/a | per-email rate limit (+ Supabase Auth platform limits on browser path) |

## Explicitly not verified / out of scope

| Item | Note |
| --- | --- |
| M11 independent QA / security reviewer sign-off | Stopped |
| Pause scheduling / streak awards / reopen | Still **OPEN** |
| Re-opt-in after monetary opt-out | Still **OPEN** |
| Multi-year retention schedule | Still **OPEN** |
| Manual cancel UX (non-deletion) | Still **OPEN** |
| Journeys A–E full Playwright suite | Partial (export UI + PG paths); full e2e → M11 |

## Commands

```bash
npm run smoke:m10
npm run evidence:m10:pg
npm run evidence:m10:ui   # requires localhost:3000
```

## Remaining gaps

1. Exact multi-year retention / purge calendar for anonymised residual history (**OPEN**).
2. Transitive `postcss` / `sharp` advisories remain after Next 15.5.29 patch (force → Next 16 not taken in M10).
3. Browser Supabase Auth path relies on platform rate limits in addition to server-action limits.
4. Full independent QA / WCAG / security reviewer → **M11**.

## Verdict

M10 account controls + hardening **live-verified** against linked Supabase `gdrkejobqlvtwnlaedpu`. **Stop before M11.**
