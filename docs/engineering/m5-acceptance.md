# M5 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M5 |
| M4 base tip | `072dd66` (PR #5) |
| Implementation branch | `cursor/m5-contribution-recording-66ef` |
| Tip SHA | `26a9fec5ed3d4d305700b968a959d0ff771ee113` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod) |
| Date | 13 November 2026 |
| Machine | Dom’s Mac — `/Users/dom.smyth/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m5` · `npm run evidence:m5:pg` · `npm run evidence:m5:ui` · `media/m5/` |

## Checklist

### SAVE-01 — Record

| Check | Result | Evidence |
| --- | --- | --- |
| Successful record (positive amount, challenge currency, minor units) | **Pass** | PG `record ok` · UI `03` |
| Contribution date = today in challenge TZ (server-side) | **Pass** | PG London today; frozen Auckland `2026-11-13` at `23:30Z` |
| Labelled self-reported | **Pass** | `source_label` / UI copy |
| Idempotent create — duplicate submit does not double-count | **Pass** | PG `replayed true` · eligible stays 5000 |
| Only own contributions; cross-user create denied | **Pass** | PG `reject non-member` |
| Reject inactive challenge / incomplete setup / zero amount | **Pass** | PG scheduled + before-setup + zero |

### SAVE-02 — Correct

| Check | Result | Evidence |
| --- | --- | --- |
| Amend existing; audit trail; original date + week kept | **Pass** | PG amend + revisions; UI `04` |
| Reverse existing; excluded from eligible totals | **Pass** | PG eligible 5500 after reverse; UI `05` |
| Cross-user amend/reverse denied | **Pass** | PG |
| Cannot create a missing entry in a closed week | **Pass** | No dated-create API; corrections amend/reverse only |
| Concurrent amend/amend serialized; audit chain matches order | **Pass** | PG `[[1000,2000],[2000,3000]]` |
| Concurrent amend/reverse → reversed; amend after reverse denied | **Pass** | PG `CONTRIBUTION_NOT_ACTIVE` |
| Concurrent reverse/reverse → one win, one not-active | **Pass** | PG single reverse audit |

### G1.1-05 — Eligible totals

| Check | Result | Evidence |
| --- | --- | --- |
| Eligible totals use active, in-period, authorised entries | **Pass** | `own_eligible_totals` |
| Reversed amounts excluded; amendments reflected | **Pass** | PG amend/reverse totals |
| Pre-assessment → personal progress only (not commitment-eligible) | **Pass** | PG `pre_assessment_minor 3000` · `commitment_eligible 0` |
| Reversed entry stays excluded after concurrent corrections | **Pass** | PG concurrent eligible = active amend/amend final only |

### Explicitly not verified in M5 UI

| Item | Notes |
| --- | --- |
| Sharing-member total £3,030→£3,080 dashboard beat | **M6** — copy only: included if you share monetary info |
| Streak / weekly assessment UI | **M8** |
| Mid-fi confirm hierarchy full Path A chrome | Personal eligible total shown; sharing aggregate UI deferred |

## Evidence runs (13 Nov 2026)

| Suite | Result |
| --- | --- |
| `m5-week-helpers-smoke.mjs` + `m5-service-smoke.ts` | **Pass** |
| Migration `20261113150000_m5_contributions.sql` | **Applied** |
| Migration `20261113151000_m5_revoke_test_helpers.sql` | **Applied** |
| Migration `20261113152000_m5_concurrent_correction_lock.sql` | **Applied** (`FOR UPDATE` before status/amount; `clock_timestamp()` after lock) |
| `m5-postgres-evidence.mjs` | **Pass 84/84** (was 60; +concurrent amend/amend, amend/reverse, reverse/reverse) |
| `m5-supabase-ui-evidence.mjs` | **Pass** — 5 shots in `media/m5/` (unchanged; concurrent is PG-only) |
| `npm run build` | **Pass** (prior M5 tip) |

### Concurrent verifies (live PG)

| Verify | Result |
| --- | --- |
| Reversed entry stays excluded from eligible totals | **Pass** |
| Amendment cannot succeed after reversal | **Pass** (`CONTRIBUTION_NOT_ACTIVE`) |
| Audit trail matches actual order of successful changes | **Pass** (amend chain `1000→2000→3000`) |

### Live env (acceptance)

`.env.local` present with (names only):

1. `NEXT_PUBLIC_SUPABASE_URL` → host `gdrkejobqlvtwnlaedpu.supabase.co`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`

## Architecture notes

- Tables: `contributions`, `contribution_revisions`
- Live RPCs: `record_contribution`, `amend_contribution`, `reverse_contribution`, `list_own_contributions`, `own_eligible_totals`
- Concurrent hardening: `amend_contribution` / `reverse_contribution` `SELECT … FOR UPDATE` the contribution row before status check and prior-amount read; audit `at` uses `clock_timestamp()` after the lock
- Helpers: `week_start_monday`, `challenge_local_date` (M4)
- Test infra (service_role): `record_contribution_at(p_now, …)`
- App module: `src/lib/contributions/*` + `ContributionPanel`

## Remaining limitations (not blockers for M5)

| Item | Notes |
| --- | --- |
| Sharing-member aggregate UI | **M6** |
| Week assessment / streak recompute UI | **M8** (eligible totals ready for later engines) |
| Excess / no-carry §3.3 defaults | **OPEN** |
| Post-activation target edit | **Parked** (M4 / G1.1-10) |

## Sign-off posture

M5 record + amend/reverse + eligible totals + concurrent correction serialization verified on live Supabase Postgres. **Stop before M6.**
