# M2 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M2 · `m2-challenge-plan.md` §5 |
| Plan lock | `eceed9a` |
| M1 base tip | `318d490` (`cursor/m1-shell-auth-962b`) |
| Implementation branch | `cursor/m2-challenge-lifecycle-25cb` |
| Tip SHA | `7960c230` (implementation) · branch includes follow-on docs commits |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m2` · Playwright `scripts/m2-screenshots.mjs` · `media/m2/` |

## Checklist

### Create & ownership (CHAL-01, G1.1-01)

| Check | Result | Evidence |
| --- | --- | --- |
| Required fields validated (name, start, end, currency, TZ) | **Pass** | Create form + `validateCreateChallengeInput`; UI review step |
| End after start; clear errors | **Pass** | Service smoke: reject end before start |
| Past start rejected | **Pass** | Service smoke + `06-reject-past-start.png` |
| Atomic create; creator is owner | **Pass** | Service smoke; overview membership owner |
| Creator approved member; owner-only OK | **Pass** | Membership `approved` / `owner` on overview |
| Challenge private | **Pass** | `visibility: private` + Private badge |
| Success lands on challenge overview | **Pass** | Redirect `/challenge/[id]`; `05` / `07` shots |

### Owner deferral (G1.1-01)

| Check | Result | Evidence |
| --- | --- | --- |
| Create/configure without target or weekly commitment | **Pass** | No savings fields on create; deferral copy |
| Invites not required; no savings activation required | **Pass** | Review notes; M3 invite explicitly out |
| Ownership ≠ savings participation | **Pass** | `savingsParticipationActive: false` at create |
| Owner without savings not assessed missed/completed weeks | **Pass** | `isAssessedForWeeklyCommitments` false; overview copy |
| Cannot record until Active **and** savings setup | **Pass** | `canRecordSavings` gate; Active+inactive → M4 message (`07`) |

### Lifecycle (G1.1-02 + activation lock)

| Check | Result | Evidence |
| --- | --- | --- |
| Exactly one lifecycle status | **Pass** | Single `lifecycleStatus` field + badge |
| Status shown in UI | **Pass** | List + overview badges |
| Future → Scheduled; today → Active | **Pass** | Smoke + `05` / `07` |
| Scheduled → Active at local midnight on start (challenge TZ) | **Pass** | Service smoke with frozen clocks + reconcile |
| Active → Completed at local midnight after end (challenge TZ) | **Pass** | Service smoke reconcile after end+1 |
| Invalid transitions rejected | **Pass** | Smoke: Completed → Active rejected + audit |
| Transitions auditable | **Pass** | Overview lifecycle audit list |
| Completed rejects ordinary new contributions | **Pass** (gate) | `canRecordSavings` blocks non-Active; no contribution API in M2 |
| No cancel UX/API | **Pass** | No cancel control or action |

## Smoke results (12 Nov 2026)

- `m2-lifecycle-smoke.mjs`: **12/12 Pass**
- `m2-service-smoke.ts`: **13/13 Pass**
- Playwright UI create/list/reject/active: **Pass** (mock auth)

## Unverified / flagged

| Item | Notes |
| --- | --- |
| Supabase-auth session → create challenge end-to-end | UI acceptance used **mock** auth. Supabase sign-in + create not re-run this turn. |
| Wall-clock midnight without a request | Transitions apply on read reconcile and `/api/challenges/lifecycle-tick`. No hosted cron attached. |
| Postgres / Drizzle system of record | Local `.data/challenges.json` only; architecture DB not migrated. |
| Currency catalogue completeness | Working subset (GBP/EUR/USD/AUD/CAD/NZD); D8 still OPEN. |
| Multi-instance write locking | Single-process local file store; fine for preview, not multi-node safe. |

## Sign-off posture

Implementation complete against authorised M2 scope. Ready for PO review on preview + checklist. **Stopped before M3.**
