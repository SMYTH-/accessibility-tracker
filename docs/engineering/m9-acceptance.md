# M9 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M9 · SOC-01 · G1.1-06-R1 · G1.1-12/13 · Path B |
| M8 base tip | `3f19ad71` (PR #9) |
| Implementation branch | `cursor/m9-activity-completion-6e9b` |
| Tip SHA | `d8b8b80c` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod linked) |
| Date | 13 November 2026 |
| Machine | Dom Mac P&P-033 · `~/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m9` · `npm run evidence:m9:pg` · `npm run evidence:m9:ui` · `media/m9/` |
| Migrations | `20261113210000_m9_activity_completion.sql` + `20261113211000_m9_activity_feed_fix.sql` + `20261113212000_m9_feed_progress_cast.sql` (**applied** to linked project) |

## Checklist

### Challenge view order (Path B)

| Check | Result | Evidence |
| --- | --- | --- |
| Personal **Your streak** + weekly commitment before roster | **Pass** (live UI) | `media/m9/01-alex-home-path-b-active.png`, `02-alex-challenge-streak-roster-activity.png` |
| Roster before activity | **Pass** | Same |
| Commitment figures / assessment history stay in own view | **Pass** | Feed omits commitment amounts; history only on personal strip |
| Encourage/kudos omitted | **Pass** | Not shipped |

### Activity feed (SOC-01, G1.1-06/08)

| Check | Result | Evidence |
| --- | --- | --- |
| Joins, contributions, commitments, milestones, completion | **Pass** (live PG + UI) | `evidence:m9:pg` 41/41; `media/m9/03-alex-activity-feed.png` |
| Membership enforced before sort/paginate | **Pass** (live PG) | pending/removed/stranger → `MEMBERSHIP_REQUIRED` |
| Privacy filter before order/limit | **Pass** (live PG) | Private Jordan contrib never appears in Alex/Sam feed |
| Hidden amounts never in feed | **Pass** (live PG) | No Jordan `amount_minor` for others |
| Private contrib leaves other member totals unchanged | **Pass** (live PG) | Sam sharing 90000 unchanged after Jordan +£100 |
| Milestone activity privacy (G1.1-08) | **Pass** (live PG) | Others’ milestones only when sharing |
| Streak awards | **OPEN** | Not invented / not emitted |

### Completion (G1.1-12)

| Check | Result | Evidence |
| --- | --- | --- |
| Completed summary (eligible savings, participation, milestones) | **Pass** (live PG + UI) | `challenge_completion_summary`; `media/m9/05-alex-completed-summary.png` |
| Ordinary writes rejected after completion | **Pass** (live PG) | Create/amend/reverse → `CHALLENGE_READONLY` |
| Privacy after completion | **Pass** (live PG) | Roster Private chip; no Jordan money keys |
| Authorised history retained for members | **Pass** (live PG + UI) | Own contributions + feed still readable; `06-alex-completed-readonly.png` |
| Reopen / cancel | **OPEN** | Not implemented |

### Owner (G1.1-13)

| Check | Result | Evidence |
| --- | --- | --- |
| Active/Scheduled owner leave blocked | **Pass** (live PG) | `OWNER_LEAVE_REQUIRES_TRANSFER` |
| Ownership transfer / deletion fallback | **OPEN** | Not invented |

## Explicitly not verified / out of scope

| Item | Note |
| --- | --- |
| Pause scheduling / duration / resume | Still **OPEN** |
| Streak awards (3/6/12) | Still **OPEN** |
| Challenge reopen / cancellation | Still **OPEN** |
| Ownership transfer / account-deletion fallback | Still **OPEN** |
| M10+ | **Stopped** |

## Commands

```bash
npm run smoke:m9
npm run evidence:m9:pg
npm run evidence:m9:ui
```

## Live suite results (13 Nov 2026, Dom Mac)

| Suite | Result |
| --- | --- |
| `smoke:m9` | **pass** (26 asserts) |
| `evidence:m9:pg` | **41/41 passed** |
| `evidence:m9:ui` | **6/6 screenshots** |

Live fixes applied after initial tip `c741a489`: assessment `computed_at`, drop ambiguous 1-arg feed overload, `progress_percent` bigint cast, create-after-complete → `CHALLENGE_READONLY`.

## RPCs / tables

- `challenge_activity_feed(challenge_id, limit, before)` — membership + privacy **before** union/sort/page
- `challenge_activity_preview` — same feed, limit 8
- `challenge_completion_summary(challenge_id)` — Completed only; `read_only`; privacy preserved
- Existing write RPCs retain `CHALLENGE_READONLY` at challenge-local boundary
- `leave_challenge` owner guard unchanged for Scheduled/Active

## Verdict

M9 activity feed + Path B order + completion summary + owner leave guard **live-verified** against linked Supabase `gdrkejobqlvtwnlaedpu`. **Stop before M10.** Pause scheduling, streak awards, reopen/cancel, ownership transfer remain OPEN.
