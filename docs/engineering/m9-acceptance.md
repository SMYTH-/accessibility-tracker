# M9 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M9 · SOC-01 · G1.1-06-R1 · G1.1-12/13 · Path B |
| M8 base tip | `3f19ad71` (PR #9) |
| Implementation branch | `cursor/m9-activity-completion-6e9b` |
| Tip SHA | _(see PR tip after push)_ |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod linked) |
| Date | 13 November 2026 |
| Machine | Cloud agent (offline smoke). Live PG/UI **blocked** here — no `.env.local` (URL/anon/service). Dom’s Mac `~/Local Sites/accessibility-tracker` for live apply + evidence. |
| Preview | `http://localhost:3000` (once env available) |
| Evidence | `npm run smoke:m9` · `npm run evidence:m9:pg` · `npm run evidence:m9:ui` · `media/m9/` |
| Migrations | `20261113210000_m9_activity_completion.sql` (**pending live apply**) |

## Checklist

### Challenge view order (Path B)

| Check | Result | Evidence |
| --- | --- | --- |
| Personal **Your streak** + weekly commitment before roster | **Pass** (UI) | `ChallengeDashboard` Path B: streak strip → roster → sharing → activity |
| Roster before activity | **Pass** | Same |
| Commitment figures / assessment history stay in own view | **Pass** | Feed omits commitment amounts; history only on personal strip |
| Encourage/kudos omitted | **Pass** | Not shipped |

### Activity feed (SOC-01, G1.1-06/08)

| Check | Result | Evidence |
| --- | --- | --- |
| Joins, contributions, commitments, milestones, completion | **Pass** (mock) | `smoke:m9` kinds present |
| Membership enforced before sort/paginate | **Pass** (mock) | Stranger → null; pending/removed → `MEMBERSHIP_REQUIRED` (PG script) |
| Privacy filter before order/limit | **Pass** (mock) | Private Jordan contrib never appears in Alex/Sam feed |
| Hidden amounts never in feed | **Pass** (mock) | No Jordan `amount_minor` for others |
| Private contrib leaves other member totals unchanged | **Pass** (mock) | Sam sharing 90000 unchanged after Jordan +£100 |
| Milestone activity privacy (G1.1-08) | **Pass** (mock) | Others’ milestones only when sharing |
| Streak awards | **OPEN** | Not invented / not emitted |

### Completion (G1.1-12)

| Check | Result | Evidence |
| --- | --- | --- |
| Completed summary (eligible savings, participation, milestones) | **Pass** (mock) | `challenge_completion_summary` / `CompletionSummaryView` |
| Ordinary writes rejected after completion | **Pass** (mock) | Create/amend/reverse → `CHALLENGE_READONLY` |
| Privacy after completion | **Pass** (mock) | Roster Private chip; no Jordan money keys |
| Authorised history retained for members | **Pass** (mock) | Own contributions + feed still readable |
| Reopen / cancel | **OPEN** | Not implemented |

### Owner (G1.1-13)

| Check | Result | Evidence |
| --- | --- | --- |
| Active/Scheduled owner leave blocked | **Pass** (mock) | `OWNER_LEAVE_REQUIRES_TRANSFER` |
| Ownership transfer / deletion fallback | **OPEN** | Not invented |

## Explicitly not verified / out of scope

| Item | Note |
| --- | --- |
| Live Supabase PG + UI walkthrough | **Blocked on this cloud VM** — no `.env.local`. Scripts ready; needs Dom Mac or injected secrets |
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

## RPCs / tables

- `challenge_activity_feed(challenge_id, limit, before)` — membership + privacy **before** union/sort/page
- `challenge_activity_preview` — same feed, limit 8
- `challenge_completion_summary(challenge_id)` — Completed only; `read_only`; privacy preserved
- Existing write RPCs retain `CHALLENGE_READONLY` at challenge-local boundary
- `leave_challenge` owner guard unchanged for Scheduled/Active

## Offline suite result

`npm run smoke:m9` → **pass** (13 Nov 2026). Regression: `smoke:m8` + `smoke:m6` pass.

## Verdict

M9 activity feed + Path B order + completion summary + owner leave guard implemented and offline-verified. **Live Supabase apply/evidence pending Dom Mac or env injection.** **Stop before M10.** Pause scheduling, streak awards, reopen/cancel, ownership transfer remain OPEN.
