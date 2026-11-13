# M8 Walkthrough — Weekly assessment, Your streak, recovery

| Field | Value |
| --- | --- |
| Branch | `cursor/m8-weekly-streaks-64a8` |
| Base | M7 `8424ebea` (`cursor/m7-privacy-settings-2765`) |
| Specs | GAME-01, G1.1-03, G1.1-05, G1.1-09, G1.1-11 + approved contribution timing |
| Stop | Before M9 |
| Preview | `http://localhost:3000` |
| Media | `media/m8/` |

## What shipped

| Capability | Implementation |
| --- | --- |
| Weekly assessment (challenge TZ, Mon–Sun) | PG `recompute_member_weekly_assessments_at` + TS engine |
| Mon vs Tue–Sun first assessed week | Existing M4 helpers; verified live |
| Pre-assessment → personal progress only | No Completed/Missed rows before first assessed Monday |
| Open week: progress + completion; miss only when closed | `in_progress` vs `missed` |
| Savings-inactive never Completed/Missed | Status `inactive`; rows cleared |
| **Your streak** (personal) | Consecutive Completed looking back; miss breaks; next Completed starts new streak |
| Amend/reverse → recompute + audit | Hooked into contribution RPCs; `weekly_assessment_audit` |
| Paused ≠ Completed/Missed | Status enum includes `paused`; scheduling OPEN (not invented) |
| Own-view commitment + assessment details | Dashboard personal + history; RLS own-row |
| M7 privacy preserved | Other members cannot read setup/assessment rows |

## Screens (mobile)

1. `01-alex-home-streak-miss` — After two completed weeks and a closed miss: supportive recovery copy, streak ready to restart.
2. `02-alex-challenge-own-assessments` — Challenge overview; assessment in scope from first assessed Monday.
3. `03-alex-home-streak-three` — After amending the missed week up to commitment: **Your streak · 3 weeks**.
4. `04-sam-home-own-commitment-only` — Sam’s home shows Sam’s commitment figures only.
5. `05-sam-cannot-see-alex-assessment-details` — Roster/privacy: no Alex assessment history or private commitment leakage.

## How to verify locally

```bash
npm run smoke:m8
npm run evidence:m8:pg
npm run dev   # localhost:3000
npm run evidence:m8:ui
```

## Out of scope (stop before M9)

Full challenge activity feed, cancel, ownership transfer, inventing pause schedule/duration/resume, inventing streak award thresholds (3/6/12 remain OPEN).
