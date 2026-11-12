# M2 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M2 · `m2-challenge-plan.md` §5 |
| Plan lock | `eceed9a` |
| M1 base tip | `318d490` (`cursor/m1-shell-auth-962b`) |
| Implementation branch | `cursor/m2-challenge-lifecycle-25cb` |
| Tip SHA | `2abff8f3` |
| Persistence | **Supabase Postgres** project `gdrkejobqlvtwnlaedpu` (non-prod) |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m2` · `node --env-file=.env.local scripts/m2-postgres-evidence.mjs` · `node scripts/m2-supabase-ui-evidence.mjs` · `media/m2/` |

## Checklist

### Create & ownership (CHAL-01, G1.1-01)

| Check | Result | Evidence |
| --- | --- | --- |
| Required fields validated (name, start, end, currency, TZ) | **Pass** | App validation + RPC constraints |
| End after start; clear errors | **Pass** | Service smoke + RPC |
| Past start rejected | **Pass** | Validation + RPC |
| **Atomic** create; creator is owner | **Pass** | `create_private_challenge` single transaction |
| Failed membership → **no orphan challenge** | **Pass** | `create_private_challenge_fail_membership` rolled back; count unchanged |
| Creator approved member; owner-only OK | **Pass** | Membership `approved` / `owner` |
| Challenge private | **Pass** | `visibility = private` + RLS |
| Success lands on challenge overview | **Pass** | Redirect `/challenge/[id]`; UI shot `10-supabase-overview-scheduled.png` |
| Second signed-in user **cannot** access | **Pass** | RLS evidence + UI `11-supabase-other-user-denied.png` |
| Persist across **app restart** | **Pass** | DB row after Next restart; UI re-login `12-supabase-persist-after-relogin.png` |

### Owner deferral (G1.1-01)

| Check | Result | Evidence |
| --- | --- | --- |
| Create without target / weekly commitment | **Pass** | No savings fields; `savings_participation_active = false` |
| Invites not required | **Pass** | Out of M2 |
| Ownership ≠ savings participation | **Pass** | Separate column; inactive at create |
| Owner without savings not assessed | **Pass** | `isAssessedForWeeklyCommitments` false |
| Cannot record until Active **and** savings setup | **Pass** | `canRecordSavings` gate |

### Lifecycle (G1.1-02 + activation lock)

| Check | Result | Evidence |
| --- | --- | --- |
| Exactly one lifecycle status | **Pass** | Enum column + badge |
| Status shown in UI | **Pass** | List + overview |
| Future → Scheduled; today → Active | **Pass** | Postgres evidence + UI |
| Scheduled → Active at local midnight on start (challenge TZ) | **Pass** | `reconcile_challenge_lifecycles` with frozen `p_now` |
| Active → Completed at local midnight after end (challenge TZ) | **Pass** | Same reconcile after end+1 |
| Invalid transitions rejected | **Pass** | App/RPC path; cancel not exposed |
| Transitions auditable | **Pass** | `challenge_lifecycle_audit` |
| No cancel UX/API | **Pass** | Out of M2 |

## Evidence runs (12 Nov 2026)

| Suite | Result |
| --- | --- |
| `m2-lifecycle-smoke.mjs` | **12/12 Pass** (pure TZ helpers) |
| `m2-service-smoke.ts` | **13/13 Pass** (file-store mock path retained for offline unit) |
| `m2-postgres-evidence.mjs` | **19/19 Pass** (atomic txn, orphan rollback, RLS deny, TZ transitions, today→Active) |
| `m2-supabase-ui-evidence.mjs` | **Pass** (real Supabase sign-in → create → overview; second user denied; re-login persist) |
| App restart DB check | **Pass** (`.data/m2-restart-persist.json`) |
| `npm run build` | Run on tip before push |

Artifacts (gitignored under `.data/`): `m2-postgres-evidence.json`, `m2-supabase-ui-evidence.json`, `m2-restart-persist.json`.

Screenshots: `media/m2/01`–`08` (mock flow, retained) · `09`–`12` (Supabase live).

## Architecture notes

- Tables: `challenges`, `challenge_memberships`, `challenge_lifecycle_audit`
- Mutations via SECURITY DEFINER RPCs (`create_private_challenge`, `reconcile_challenge_lifecycles`); no direct client inserts
- RLS: approved members read own challenges; memberships select own rows only (M2)
- Server uses authenticated Supabase session; optional `SUPABASE_SERVICE_ROLE_KEY` for tick/admin evidence only (`.env.local`, not committed)

## Unverified / remaining limitations

| Item | Notes |
| --- | --- |
| Hosted cron for midnight ticks | Transitions on read + `/api/challenges/lifecycle-tick`; no platform cron attached |
| Multi-region / connection pooling ops | Single non-prod project; Hyperdrive etc. not configured |
| Currency catalogue completeness | Working subset; D8 still OPEN |
| Service-role key rotation / vault | Local `.env.local` only for non-prod |
| Mock file store | Still available when auth mode is mock; **authoritative M2 path is Postgres** when Supabase env is set |
| Invite roster visibility of other memberships | Intentionally own-row RLS until M3 |

## Sign-off posture

M2 Postgres finish complete against authorised scope on test project `gdrkejobqlvtwnlaedpu`. Mock create flow remains accepted for UX. **Keep M2 open for PO review. Stop before M3** (no cancel, invites, savings).
