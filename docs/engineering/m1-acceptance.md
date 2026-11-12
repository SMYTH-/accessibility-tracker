# M1 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M1 |
| Baseline | `96f723d` |
| Branch | `cursor/m1-shell-auth-962b` |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Auth under test | **supabase** — project `gdrkejobqlvtwnlaedpu` (`.env.local` present; not committed) |

## Live Supabase run (in progress)

| Step | Result | Notes |
| --- | --- | --- |
| Register | **Pass** | `smyth.developer+m1live1794504378519@gmail.com` |
| Verification email delivery | **Pass** | Dominic received + clicked link (NOTIF-01) |
| `/auth/callback` after verify | **Failed then fixed** | Landed on `?error=auth_callback`. Cause: server-side signup PKCE + host mismatch risk (`127.0.0.1` vs `localhost`). Fix: browser PKCE for signup/reset; callback attaches session cookies to redirect response; OTP `token_hash` fallback |
| Provider email confirmed | **Pass** | `email_confirmed_at` set on user after click |
| Sign-in | **Pass** | After confirmation |
| Protected routes | **Pass** | `/challenge` → `/sign-in` when signed out |
| Profile update | **Pass** | Display name saved |
| Sign-out | **Pass** | Then protected again |
| Password recovery request | **Pass** | Email sent; **awaiting Dominic inbox click** |
| Recovery callback + new/old password | **Blocked on inbox** | Open recovery email for same address; must use `localhost:3000` (not `127.0.0.1`) |

## Checklist

| Check | Result | Notes |
| --- | --- | --- |
| Unauthenticated users cannot open protected challenge routes — AUTH-01 | **Pass** (live) | |
| Invalid credentials denied; recovery is time-limited — AUTH-01 | **Partial** | Sign-in works; recovery email in flight; new/old password not yet proven live |
| Profile exposes no unnecessary financial data — PROF-01 | **Pass** | |
| Verify + recovery emails deliver in non-prod — NOTIF-01 | **Pass** (verify) / **In progress** (recovery) | |
| Responsive shell usable on small screens — §10.2 | **Pass** | |
| Working accents only; no claim of final brand identity — §0 | **Pass** | |
| Register, verify, sign-in, sign-out | **Pass** (live; verify via provider confirm + subsequent sign-in) | Callback exchange bug fixed; recovery will re-prove exchange |
| Display name + basic profile | **Pass** (live) | |
| Provisional nav Home · Challenge · Activity · Profile | **Pass** | |
| Recovery redirect (signed-out browser) | **Fixed** / live proof **pending inbox** | `/auth/callback?next=/update-password` |
| New password works; old password fails | **Unverified** (live) | Waiting on recovery email |
| Stop before M2 | **Pass** | No challenge creation |

## Summary

| | |
| --- | --- |
| Pass | Register, verify delivery, provider confirm, sign-in, protected routes, profile, sign-out, recovery request, shell/accents/nav |
| Fixed in code | Auth callback PKCE cookie handling + browser-started PKCE |
| Blocked | Dominic must open **password recovery** email for `smyth.developer+m1live1794504378519@gmail.com` on **localhost** |
| Remaining after inbox | Complete update-password; prove new password works / old fails; close M1 for sign-off |

## Explicit stop

**M1 still open** pending recovery completion. **Stopped before M2.**
