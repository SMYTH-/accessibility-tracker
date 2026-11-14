# M4 Walkthrough — Savings target + weekly commitment setup

| Field | Value |
| --- | --- |
| Milestone | M4 only (stop before M5) |
| Base tip | `dda5e603` (signed-off M3 / PR #4) |
| Branch | `cursor/m4-savings-setup-4636` |
| Persistence | Supabase Auth + Postgres `gdrkejobqlvtwnlaedpu` (when `.env.local` present) |
| Preview | `http://localhost:3000` |
| Specs | GOAL-01, GOAL-02, G1.1-01, G1.1-03, G1.1-04; G1.1-10 post-activation edit **parked** |

## What was built

| Capability | Mode |
| --- | --- |
| Approved members (incl. owner) set positive personal target + weekly commitment | **Real** (RPC + UI) |
| Amounts in challenge currency, integer minor units | **Real** |
| Server-side membership + validation (RPC / service) | **Real** |
| Incomplete setup → `savings_participation_active = false` | **Real** |
| Missing setup → not assessed for missed weeks | **Real** (`isAssessedForWeeklyCommitments`) |
| Record savings gated until Active challenge **and** setup | **Real** (M5 UI still disabled) |
| First assessed week: Mon = current week; Tue–Sun = following Monday (challenge TZ) | **Real** |
| Post-activation target edit (G1.1-10) | **Parked** — signed-in RPC + UI blocked until progress/milestone rules approved |
| Cannot edit another member’s target (own-row RLS + RPC) | **Real** |

## Out of M4

Contribution recording / corrections (M5), streaks (M8), sharing totals (M6), privacy opt-out (M7), cancel, ownership transfer.

## Click path (local preview)

1. Sign in → Create challenge (or open an approved membership) → overview shows **Inactive (setup required)**.
2. **Activate savings participation** — enter positive target + weekly commitment in challenge currency.
3. After activate: **Your savings setup** shows target, weekly commitment, **First assessed week** (Monday date), target effective-from.
4. Post-activation target editing is **parked** (no Update target control; copy cites G1.1-10).
5. **Record savings (M5)** remains gated (disabled).

## Evidence commands

```bash
npm run smoke:m4
# With .env.local (URL + anon + service role for gdrkejobqlvtwnlaedpu) and migrations applied:
npm run evidence:m4:pg
npm run evidence:m4:ui   # needs preview on :3000
# Offline UI shots (mock auth):
AUTH_MODE=mock NEXT_PUBLIC_AUTH_MODE=mock npm run dev
node scripts/m4-mock-ui-evidence.mjs
```

Screenshots: `media/m4/` (also mirrored under Project store `media/m4/`).

## Migration

Applied to project `gdrkejobqlvtwnlaedpu` via `supabase db push --linked` (Dom’s Mac):

- `supabase/migrations/20261113120000_m4_savings_setup.sql`
- `supabase/migrations/20261113133000_m4_park_post_activation_target_edit.sql`
- `supabase/migrations/20261113134000_m4_revoke_test_target_update_from_auth.sql`

## Live evidence (13 Nov 2026)

| Suite | Result |
| --- | --- |
| `evidence:m4:pg` | **30/30 Pass** (includes signed-in park + service-role helper) |
| `evidence:m4:ui` | **Pass** — live shots `media/m4/01`–`05` (park copy on active setup) |

## Stop

M4 setup/activation + park of post-activation target edit closed on `gdrkejobqlvtwnlaedpu`. **Do not start M5.**
