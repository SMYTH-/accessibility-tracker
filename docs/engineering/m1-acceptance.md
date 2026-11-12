# M1 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M1 |
| Baseline | `96f723d` |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Auth under test | **mock** (Supabase secrets not present) |

## Checklist

| Check | Result | Notes |
| --- | --- | --- |
| Unauthenticated users cannot open protected challenge routes — AUTH-01 | **Pass** | Middleware redirects `/challenge`, `/home`, `/activity`, `/profile` → `/sign-in` |
| Invalid credentials denied; recovery is time-limited — AUTH-01 | **Pass** (mock) | Wrong password rejected; mock recovery/verify tokens TTL = 1 hour; expired/invalid tokens rejected |
| Profile exposes no unnecessary financial data — PROF-01 | **Pass** | Profile = email, verified flag, display name only |
| Verify + recovery emails deliver in non-prod — NOTIF-01 | **Unverified** (real email) / **Pass** (mock surrogate) | No Supabase/SMTP credentials in this checkout. Mock surfaces time-limited links in-UI instead of email delivery |
| Responsive shell usable on small screens — §10.2 | **Pass** (manual/layout) | Mobile-first max-width shell + bottom nav; verify visually at ~390px |
| Working accents only; no claim of final brand identity — §0 | **Pass** | Deep Sea / Honey Amber CSS vars; copy states logo/palette/type open |
| Register, verify, sign-in, sign-out | **Pass** (mock) | Exercised via local preview + scripted HTTP flow |
| Display name + basic profile | **Pass** | Update persisted in mock store / Supabase metadata when configured |
| Provisional nav Home · Challenge · Activity · Profile | **Pass** | Labels provisional; no Leaderboard |
| Stop before M2 | **Pass** | No challenge creation UI or APIs |

## Summary

| | Count |
| --- | --- |
| Pass | 8 (+ mock NOTIF surrogate) |
| Fail | 0 |
| Unverified | Real NOTIF-01 email delivery (needs Supabase + provider in non-prod) |

## Explicit stop

Implementation authorised for **M1 only**. Challenge creation and later milestones were **not** started.
