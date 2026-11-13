# M4 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M4 |
| M3 base tip | `dda5e603` (PR #4) |
| Implementation branch | `cursor/m4-savings-setup-4636` |
| Tip SHA | `646d97eb9a4ffb980851cb3061cb43c6d4fd22df` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod) when `.env.local` present |
| Date | 13 November 2026 |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m4` · `npm run evidence:m4:pg` · `npm run evidence:m4:ui` / mock UI · `media/m4/` |

## Checklist

### Setup & activation (GOAL-01/02, G1.1-03/04)

| Check | Result | Evidence |
| --- | --- | --- |
| Cannot activate without valid positive target **and** weekly commitment | **Pass** (smoke) · PG pending `.env.local` | `smoke:m4` reject zero/invalid; RPC checks |
| Targets/commitments positive, challenge currency; minor units | **Pass** (smoke) | `2000.00` → 200000 minor GBP |
| Cannot edit others’ targets | **Pass** (code) · PG pending | Own-row RLS + `MEMBERSHIP_REQUIRED` RPC |
| Approved members incl. owner can configure after approval/create | **Pass** (smoke + UI) | Activate on owner membership |

### Incomplete setup (G1.1-01/03/04)

| Check | Result | Evidence |
| --- | --- | --- |
| Incomplete setup → savings participation inactive | **Pass** | Create leaves `savings_participation_active = false` |
| Missing setup does not create missed commitments | **Pass** | `isAssessedForWeeklyCommitments` false until activate |
| Cannot record savings until setup complete | **Pass** | `canRecordSavings` gate; M5 button disabled |
| Record also requires Active challenge | **Pass** | Scheduled + active savings still gated |

### First assessed week (GOAL-02, contribution timing §3.1)

| Check | Result | Evidence |
| --- | --- | --- |
| Assessment uses challenge time zone | **Pass** | `first_assessed_week_start` / helpers use challenge TZ |
| Monday activation → current week | **Pass** (smoke) · PG pending frozen helper | Mon 16 Nov 2026 → `2026-11-16` |
| Tuesday–Sunday → following Monday | **Pass** (smoke) · PG pending | Fri 13 Nov → `2026-11-16` |

### G1.1-10 baseline

| Check | Result | Evidence |
| --- | --- | --- |
| Target changes recorded with effective dates | **Pass** (smoke) · PG pending | `update_savings_target` → next Monday |
| Historical values auditable | **Pass** (code) · PG pending | `savings_setup_audit` |
| Users cannot modify another member’s target | **Pass** (code) · PG pending | RPC scoped to `auth.uid()` |

## Evidence runs (13 Nov 2026)

| Suite | Result |
| --- | --- |
| `m4-activation-week-smoke.mjs` | **10/10 Pass** |
| `m4-service-smoke.ts` | **ALL PASS** (mock file store) |
| `m4-postgres-evidence.mjs` | **Blocked** — no `/workspace/.env.local` on this VM |
| `m4-supabase-ui-evidence.mjs` | **Blocked** — same |
| `m4-mock-ui-evidence.mjs` | **Pass** when run (mock auth screenshots in `media/m4/`) |
| `npm run build` | **Pass** |

### Env blocker (acceptance only)

This cloud VM needs gitignored `.env.local` with:

1. `NEXT_PUBLIC_SUPABASE_URL` (must include `gdrkejobqlvtwnlaedpu`)
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`

Cursor publish-app binding of `SUPABASE_SERVICE_ROLE_KEY` does **not** inject into the agent VM. Apply migration `20261113120000_m4_savings_setup.sql` before `evidence:m4:pg`.

## Architecture notes

- Tables: `membership_savings_setup`, `savings_setup_audit`
- Live RPCs: `activate_savings_setup`, `update_savings_target`, `get_own_savings_setup`
- Helpers: `first_assessed_week_start`, `next_weekly_period_start`, `challenge_local_date`
- Test infra (service_role): `activate_savings_setup_at(p_now, …)`
- App module: `src/lib/savings/*` + `SavingsSetupForm`

## Unverified / remaining limitations

| Item | Notes |
| --- | --- |
| Live Supabase PG + UI evidence on this VM | Waiting on `.env.local` or Dom local worker |
| Weekly commitment amount-change rules after activation | **OPEN** — not edited post-activate in M4 |
| Full G1.1-10 rewrite / M8 assessment engine | Deferred |
| Contribution recording | **M5** |

## Sign-off posture

M4 implementation + offline smoke + mock UI evidence ready for review. **Postgres acceptance remains open** until env + migration on `gdrkejobqlvtwnlaedpu`. **Stop before M5.**
