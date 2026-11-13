# M5 Walkthrough — Record contributions + corrections

| Field | Value |
| --- | --- |
| Milestone | M5 only (stop before M6) |
| Base tip | `072dd66` (signed-off M4 / PR #5) |
| Branch | `cursor/m5-contribution-recording-66ef` |
| Tip SHA | `a9ec4434ec96bd59665e516629dfdf272228d6ae` |
| Persistence | Supabase Auth + Postgres `gdrkejobqlvtwnlaedpu` (when `.env.local` present) |
| Preview | `http://localhost:3000` |
| Specs | SAVE-01, SAVE-02, G1.1-05; approved timing §3.1 (`m0-architecture.md` §3) |

## What was built

| Capability | Mode |
| --- | --- |
| Record positive amount in challenge currency when Active + savings setup complete | **Real** (RPC + UI) |
| Contribution date = today in challenge TZ (server-side) | **Real** |
| Labelled **self-reported** | **Real** |
| Integer minor units | **Real** |
| Idempotent create (idempotency key; double submit does not double-count) | **Real** |
| Amend / reverse own entries with audit trail; original date + week preserved | **Real** |
| Corrections cannot create a missing closed-week entry (no dated create API) | **Real** |
| Eligible totals exclude reversed; include amendments | **Real** (`own_eligible_totals`) |
| Pre-assessment amounts → personal target / progress only (flagged vs commitment-eligible) | **Real** |
| Cross-user denial (RLS + RPC) | **Real** |
| Sharing-member dashboard totals / streak UI | **Out of scope** (M6 / M8) |
| Post-activation target editing | **Still parked** (M4) |

## Out of M5

Dashboard / sharing-member totals UI (M6), privacy opt-out (M7), weekly assessment / streak UI (M8), cancel, ownership transfer, inventing closed-week creates.

## Click path (local preview)

1. Sign in → open an **Active** challenge with savings setup complete.
2. **Record contribution** — enter positive amount; date is fixed to today in the challenge time zone; labelled self-reported.
3. Retry with the same submit key → counted once.
4. **Amend** or **Reverse** an existing entry; audit trail keeps original date and week.
5. Eligible total updates; reversed amounts drop out.

## Evidence commands

```bash
npm run smoke:m5
# With .env.local (URL + anon + service role for gdrkejobqlvtwnlaedpu) and migrations applied:
npm run evidence:m5:pg
npm run evidence:m5:ui   # needs preview on :3000
```

Screenshots: `media/m5/` (also under Project store `media/m5/`).

## Migration

Applied to project `gdrkejobqlvtwnlaedpu` via `supabase db push --linked`:

- `supabase/migrations/20261113150000_m5_contributions.sql`
- `supabase/migrations/20261113151000_m5_revoke_test_helpers.sql`

## Live evidence (13 Nov 2026)

| Suite | Result |
| --- | --- |
| `smoke:m5` | **Pass** |
| `evidence:m5:pg` | **60/60 Pass** |
| `evidence:m5:ui` | **Pass** — live shots `media/m5/01`–`05` |
| `npm run build` | **Pass** |

## Stop

M5 contribution record/correct closed on `gdrkejobqlvtwnlaedpu`. **Do not start M6.**
