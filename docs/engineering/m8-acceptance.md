# M8 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M8 · GAME-01 · G1.1-03/05/09/11 · approved timing |
| M7 base tip | `8424ebea` (PR #8) |
| Implementation branch | `cursor/m8-weekly-streaks-64a8` |
| Tip SHA | `2d524eaa` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod linked) |
| Date | 13 November 2026 |
| Machine | Dom’s Mac — `/Users/dom.smyth/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m8` · `npm run evidence:m8:pg` · `npm run evidence:m8:ui` · `media/m8/` |
| Migration | `20261113190000_m8_weekly_assessment.sql` (applied live) |

## Checklist

### Assessment rules (GAME-01, G1.1-03/05, timing)

| Check | Result | Evidence |
| --- | --- | --- |
| Challenge TZ; Monday–Sunday weeks | **Pass** | PG `current_week_start` W46 = `2026-11-09` |
| Monday activation → current week | **Pass** | PG first assessed `2026-11-16` |
| Tue–Sun activation → following Monday | **Pass** | Friday → `2026-11-16` |
| Pre-assessment → personal progress only | **Pass** | `pre_assessment_minor 3000`; status `pre_assessment`; no history rows |
| Savings-inactive never Completed/Missed | **Pass** | Status `inactive` |
| Assess with eligible contributions + commitment | **Pass** | Week sums vs `weekly_commitment_minor` |
| Open week: progress + completion; miss only when closed | **Pass** | Below → `in_progress`; met → `completed`; closed under → `missed` |
| Paused distinct (scheduling OPEN) | **Pass** | Enum + engine; no pause schedule invented |
| Server-side; safe to rerun | **Pass** | Repeated recompute identical |

### Streaks (G1.1-09)

| Check | Result | Evidence |
| --- | --- | --- |
| Label **Your streak** (personal) | **Pass** | Dashboard + RPC |
| After miss, next completed starts new streak; miss preserved | **Pass** | Reverse W45 → miss kept; W46 complete → streak **1** |
| Amend/reverse that changes result → recompute; audit trail | **Pass** | W45 miss→completed; `weekly_assessment_audit` + contribution revisions |
| Approved example: correct miss after two completed → streak **3** | **Pass** | PG + amend response |
| Streak awards / thresholds | **OPEN** | Not invented |

### Privacy (preserve M7)

| Check | Result | Evidence |
| --- | --- | --- |
| Commitment + assessment details in member’s own view | **Pass** | Personal dashboard / history |
| Another account cannot read private commitment figures | **Pass** | Sam RLS setup + assessments; own commitment 4000 |
| Shared activity changes | **M9** | Stopped |

## Explicitly not verified / out of scope

| Item | Note |
| --- | --- |
| Full challenge activity feed | **M9** |
| Pause scheduling / duration / resume | Still **OPEN** — status only |
| Streak milestone awards (3/6/12) | Still **OPEN** |
| Post-activation target editing | Remains parked (M4) |
| Re-opt-in / small-group suppression | Still **OPEN** (M7) |

## Commands

```bash
npm run smoke:m8
npm run evidence:m8:pg
npm run evidence:m8:ui
```

## RPCs / tables

- `recompute_member_weekly_assessments_at(challenge_id, user_id, now)` — service_role; deterministic upsert
- `recompute_own_weekly_assessments(challenge_id)` / `own_weekly_assessment_summary(challenge_id)` — authenticated self
- `challenge_dashboard` — recomputes then returns streak + week status + own history
- Tables: `weekly_commitment_assessments`, `weekly_assessment_audit` (RLS own-row)
- Contribution create/amend/reverse return `assessment` after recompute

## Live suite result

`npm run smoke:m8` → **pass** · `npm run evidence:m8:pg` → **55/55 passed** (13 Nov 2026).

## Verdict

M8 weekly commitment assessment, Your streak, and recovery verified on live Supabase with amend→streak-of-three, recovery after miss, rerun consistency, and private own-view commitment/assessment details. **Stop before M9.**
