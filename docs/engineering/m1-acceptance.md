# M1 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M1 |
| Baseline | `96f723d` |
| Branch | `cursor/m1-shell-auth-962b` |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Auth under test | **mock** (real Supabase suite **blocked** — no `.env.local` / secrets on machine) |


## Live Supabase run (in progress)

| Field | Value |
| --- | --- |
| Project | `gdrkejobqlvtwnlaedpu` (non-prod) |
| Preview | `http://localhost:3000` |
| Auth mode | **supabase** (`.env.local` present; not committed) |
| Register | **Pass** — verification email requested |
| Verify email click | **Blocked on Dominic inbox** — `smyth.developer+m1live1794504378519@gmail.com` |
| Remaining | sign-in, protected routes, profile, sign-out, recovery, new/old password |

## Checklist

| Check | Result | Notes |
| --- | --- | --- |
| Unauthenticated users cannot open protected challenge routes — AUTH-01 | **Pass** (mock) | Middleware redirects `/challenge`, `/home`, `/activity`, `/profile` → `/sign-in` |
| Invalid credentials denied; recovery is time-limited — AUTH-01 | **Pass** (mock) / **Unverified** (Supabase) | Mock: wrong password denied; 1h tokens. Real recovery not run yet |
| Profile exposes no unnecessary financial data — PROF-01 | **Pass** | Email, verified flag, display name only |
| Verify + recovery emails deliver in non-prod — NOTIF-01 | **Unverified** | Needs non-prod Supabase + inbox; mock surrogate only so far |
| Responsive shell usable on small screens — §10.2 | **Pass** | Mobile-first shell + bottom nav (~390px screenshots) |
| Working accents only; no claim of final brand identity — §0 | **Pass** | Deep Sea / Honey Amber; open identity called out in UI |
| Register, verify, sign-in, sign-out | **Pass** (mock) / **Unverified** (Supabase) | Live email verify blocked on credentials |
| Display name + basic profile | **Pass** (mock) / **Unverified** (Supabase) | |
| Provisional nav Home · Challenge · Activity · Profile | **Pass** | |
| Recovery redirect (signed-out browser) | **Fixed in code** / **Unverified live** | Was `/update-password` (no code exchange). Now `/auth/callback?next=/update-password` + safety redirect if `?code=` hits update-password |
| New password works; old password fails | **Pass** (mock) / **Unverified** (Supabase) | Supabase path signs out after update so re-login is required |
| Stop before M2 | **Pass** | No challenge creation |

## Summary

| | |
| --- | --- |
| Pass (mock / shell) | Shell, accents, nav, mock auth/profile, protected routes, recovery redirect **code fix** |
| Fail | None found in mock suite |
| Unverified / blocked | Real NOTIF-01 delivery; full Supabase register→verify→sign-in→profile→sign-out→recovery (new vs old password) |
| Blocker | Dominic: non-prod Supabase URL + anon key in `.env.local`, Site URL + redirect allow list, readable inbox for test account (see walkthrough checklist). **Do not paste secrets into chat.** |

## Explicit stop

**M1 still open** pending non-prod Supabase sign-off. **Stopped before M2** — no challenge creation.
