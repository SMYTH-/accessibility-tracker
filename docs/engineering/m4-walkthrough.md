# M4 Walkthrough — Savings target + weekly commitment setup

| Field | Value |
| --- | --- |
| Milestone | M4 only (stop before M5) |
| Base tip | `dda5e603` (signed-off M3 / PR #4) |
| Branch | `cursor/m4-savings-setup-4636` |
| Persistence | Supabase Auth + Postgres `gdrkejobqlvtwnlaedpu` (when `.env.local` present) |
| Preview | `http://localhost:3000` |
| Specs | GOAL-01, GOAL-02, G1.1-01, G1.1-03, G1.1-04, G1.1-10 baseline |

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
| Prospective target change audit (G1.1-10 baseline) | **Real** |
| Cannot edit another member’s target (own-row RLS + RPC) | **Real** |

## Out of M4

Contribution recording / corrections (M5), streaks (M8), sharing totals (M6), privacy opt-out (M7), cancel, ownership transfer.

## Click path (local preview)

1. Sign in → Create challenge (or open an approved membership) → overview shows **Inactive (setup required)**.
2. **Activate savings participation** — enter positive target + weekly commitment in challenge currency.
3. After activate: **Your savings setup** shows target, weekly commitment, **First assessed week** (Monday date), target effective-from.
4. **Record savings (M5)** remains gated (disabled).
5. Optional: update target prospectively (effective next weekly period).

## Evidence commands

```bash
npm run smoke:m4
# With .env.local (URL + anon + service role for gdrkejobqlvtwnlaedpu) and migration applied:
npm run evidence:m4:pg
npm run evidence:m4:ui   # needs preview on :3000
# Offline UI shots (mock auth):
AUTH_MODE=mock NEXT_PUBLIC_AUTH_MODE=mock npm run dev
node scripts/m4-mock-ui-evidence.mjs
```

Screenshots: `media/m4/` (also mirrored under Project store `media/m4/`).

## Migration

Apply `supabase/migrations/20261113120000_m4_savings_setup.sql` to project `gdrkejobqlvtwnlaedpu` before live PG evidence.

## Stop

M4 complete for PO review once Postgres acceptance is green. **Do not start M5.**
