# M6 Walkthrough — Personal dashboard + sharing-member totals

| Field | Value |
| --- | --- |
| Milestone | M6 |
| Base | M5 tip `e22f76f` (PR #6) |
| Branch | `cursor/m6-dashboard-totals-18d2` |
| Persistence | Supabase `gdrkejobqlvtwnlaedpu` |
| Preview | http://localhost:3000 |
| Stop | Before M7 privacy settings UX |

## What shipped

| Surface | Behaviour | Evidence |
| --- | --- | --- |
| Home hierarchy (A+B) | Personal progress → separate milestone chip → weekly + **Your streak** → **Sharing members only** → activity preview → Record savings | UI `01`–`04` |
| Personal progress | Eligible PG contributions vs personal target; labelled self-reported; current % distinct from Halfway | PG + UI |
| Sharing members only | Server sum of eligible saved + targets for approved members with `share_monetary_info = true` at read time | PG Path C |
| Opt-out (fixture) | Excluded from others’ totals; self still sees own | PG |
| G1.1-06-R1 suite | Real sessions; pending/removed/stranger denied; post-opt-out create/amend/reverse/target invariant; no history endpoint; late joiner | `evidence:m6:pg` 72/72 |
| Target edit | Remains parked (M4) | Unchanged |
| Weekly / streak calc | Label **Your streak** only; calculation deferred | UI copy |

## Click path (local)

1. Sign in → **Home** shows personal eligible total, optional Halfway chip separate from current %, Sharing members only aggregate.
2. Record / amend / reverse on challenge overview → return to Home; personal progress updates; sharing total moves only while you share.
3. Challenge overview also shows Sharing members only with link back to Home.

## Out of scope (stop before M7)

Privacy settings UI / cannot-undo warning flow (M7), weekly assessment + streak numbers (M8), full activity feed (M9), cancel, ownership transfer, re-enabling parked target edit.
