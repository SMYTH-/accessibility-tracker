# M4 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M4 |
| M3 base tip | `dda5e603` (PR #4) |
| Implementation branch | `cursor/m4-savings-setup-4636` |
| Tip SHA | _(set after park commit)_ |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod) |
| Date | 13 November 2026 |
| Machine | Dom’s Mac (P&P - 033) — `/Users/dom.smyth/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m4` · `npm run evidence:m4:pg` · `npm run evidence:m4:ui` · `media/m4/` |

## Checklist

### Setup & activation (GOAL-01/02, G1.1-03/04)

| Check | Result | Evidence |
| --- | --- | --- |
| Cannot activate without valid positive target **and** weekly commitment | **Pass** (smoke + live PG) | `smoke:m4` reject zero/invalid; PG `reject zero target` |
| Targets/commitments positive, challenge currency; minor units | **Pass** (smoke + live PG) | `2000.00` → 200000 minor GBP |
| Cannot edit others’ targets | **Pass** (live PG) | Own-row RLS + `reject non-member` / `other cannot get setup` |
| Approved members incl. owner can configure after approval/create | **Pass** (smoke + live UI) | Activate on owner membership |

### Incomplete setup (G1.1-01/03/04)

| Check | Result | Evidence |
| --- | --- | --- |
| Incomplete setup → savings participation inactive | **Pass** (live PG + UI) | Create leaves `savings_participation_active = false`; shot `01` |
| Missing setup does not create missed commitments | **Pass** | `isAssessedForWeeklyCommitments` false until activate |
| Cannot record savings until setup complete | **Pass** (live UI) | `canRecordSavings` gate; M5 button disabled (`05`) |
| Record also requires Active challenge | **Pass** (live UI) | Scheduled + active savings still gated |

### First assessed week (GOAL-02, contribution timing §3.1)

| Check | Result | Evidence |
| --- | --- | --- |
| Assessment uses challenge time zone | **Pass** (live PG) | `first_assessed_week_start` / helpers use challenge TZ |
| Monday activation → current week | **Pass** (live PG frozen helper) | Mon 16 Nov 2026 → `2026-11-16` |
| Tuesday–Sunday → following Monday | **Pass** (live PG frozen helper) | Fri 13 Nov → `2026-11-16` |

### G1.1-10 park (post-activation target edit)

| Check | Result | Evidence |
| --- | --- | --- |
| Signed-in members cannot change target after activation | **Pass** (smoke + live PG + UI) | RPC `TARGET_CHANGE_DEFERRED`; mock/service park; UI hides Update target (`03`) |
| Deferred reason is clear (no invented progress/milestone rules) | **Pass** | Message cites G1.1-10 progress/milestone approval |
| Target unchanged after parked signed-in attempt | **Pass** (smoke + live PG) | Still `200000` minor after reject |
| Service-role test helper may update; authenticated cannot | **Pass** (live PG) | `update_savings_target_for_tests` service_role only |
| Activate audit retained; no signed-in `target_change` | **Pass** (live PG + UI) | Audit activate-only on signed-in path |

## Evidence runs (13 Nov 2026)

| Suite | Result |
| --- | --- |
| `m4-activation-week-smoke.mjs` | **10/10 Pass** |
| `m4-service-smoke.ts` | **ALL PASS** (mock file store; park asserted) |
| Migration `20261113120000_m4_savings_setup.sql` | **Applied** via `supabase db push --linked` → `gdrkejobqlvtwnlaedpu` |
| Migration `20261113133000_m4_park_post_activation_target_edit.sql` | **Applied** |
| Migration `20261113134000_m4_revoke_test_target_update_from_auth.sql` | **Applied** |
| `m4-postgres-evidence.mjs` | **Pass 30/30** (live Supabase on Dom’s Mac) |
| `m4-supabase-ui-evidence.mjs` | **Pass** — 5 live shots in `media/m4/` (`01`–`05`); active shot shows park copy, no Update target |
| `m4-mock-ui-evidence.mjs` | **Pass** (earlier mock auth screenshots; superseded by live UI) |
| `npm run build` | **Pass** (prior acceptance; not re-required for park-only) |

### Live env (acceptance)

`.env.local` present on Dom’s Mac with (names only):

1. `NEXT_PUBLIC_SUPABASE_URL` → host `gdrkejobqlvtwnlaedpu.supabase.co`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`

## Architecture notes

- Tables: `membership_savings_setup`, `savings_setup_audit`
- Live RPCs: `activate_savings_setup`, `get_own_savings_setup`
- Parked signed-in RPC: `update_savings_target` → always `TARGET_CHANGE_DEFERRED`
- Helpers: `first_assessed_week_start`, `next_weekly_period_start`, `challenge_local_date`
- Test infra (service_role): `activate_savings_setup_at(p_now, …)`, `update_savings_target_for_tests(…)`
- App module: `src/lib/savings/*` + `SavingsSetupForm` (read-only after activate)

## Remaining limitations (not blockers for M4)

| Item | Notes |
| --- | --- |
| Weekly commitment amount-change rules after activation | **OPEN** — not edited post-activate in M4 |
| Full G1.1-10 rewrite / progress & milestone behaviour | **Parked** — no post-activation target edit until approved |
| Contribution recording | **M5** — out of scope |

## Sign-off posture

M4 initial setup/activation + first-assessed-week remain intact. **Post-activation target editing parked** in UI + signed-in API until G1.1-10 progress/milestone rules are approved. Live Postgres **30/30** + live UI evidence refreshed. **Stop before M5.**
