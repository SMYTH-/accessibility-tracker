# M11 Acceptance Checks — private-beta readiness

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M11 · Gates 6–7 · §10.1 · §10.5 · Journeys A–E · WCAG 2.2 AA |
| Implementation branch | `cursor/m11-beta-readiness-cb14` · PR #12 |
| Persistence | **Supabase** `gdrkejobqlvtwnlaedpu` |
| Date | 14 November 2026 |
| Preview | `http://localhost:3000` (local only) |
| Closed-lab | **Accepted** |
| Private beta | **NO-GO** for invites / deploy |

## Email (four-mail proof) — **4/4 Pass** (test-inbox)

| Item | Status | Evidence |
| --- | --- | --- |
| Membership **approval** | **Pass** | Resend MCP delivered + Dominic sight (`Accountability Tracker` / `onboarding@resend.dev`) |
| Membership **rejection** | **Pass** | Same |
| Password **recovery** | **Pass** | Dominic — Reset password from `Supabase Auth <noreply@mail.app.supabase.io>` |
| Sign-up **verification** | **Pass** | Dominic — fresh Confirm link succeeded; hash had `access_token`, `type=signup`, `email_verified=true`; Auth `email_confirmed_at` set on user `d28f358c-…` (2026-11-14T13:49:14Z) |
| Caveat | **Test-inbox only** — verified custom sending domain still required before beta testers | — |
| Spam note | `onboarding@resend.dev` can land in Spam | Dominic |
| Auth sender note | Recovery / early Auth mail used default Supabase host; membership + rate-limit fallback verify via Resend | — |

### Auth callback hash fix (retest)

| Item | Status | Evidence |
| --- | --- | --- |
| Fix | **Shipped** | `/auth/callback` with no `code`/`token_hash` → `/auth/confirm`; client consumes `#access_token` hash. Commits `7edb783a`, `81091592` on `cursor/m11-beta-readiness-cb14` |
| Valid session hash → Home | **Pass** | Playwright + live Supabase magiclink tokens → `http://localhost:3000/home` |
| Signup verified, sign-in needed | **Pass** | `#type=signup&email_verified=true` → `/sign-in?verified=1` with “Email verified. Sign in to continue.” |
| Invalid / expired link | **Pass** | `#error=…&error_code=otp_expired` and empty confirm → `/sign-in?error=auth_callback` |
| Password recovery routing | **Pass** | Live recovery hash → `/update-password` (recovery session active) |
| Inbox Dom sight (confirm + recovery links) | **Pass** | Dominic — Confirm → `http://localhost:3000/home`; Reset → Choose a new password. Resend lab mail (`onboarding@resend.dev` → `smyth.developer@gmail.com`) |

Prior **4/4** test-inbox Pass **unchanged** (not regressed).

## Other gates (unchanged Pass)

Journeys 86/86 · a11y 11/11 · SR 13/13 · tick 9/9 · security F-01–F-05 · PostCSS resolved · retention planning approved (purge disabled).

## Go / no-go

### Recommendation: **NO-GO for private-beta invites / deploy**

Test-inbox four-mail proof **Pass**. Closed-lab may continue.

| Blocker | Status |
| --- | --- |
| 1. Four-mail test-inbox proof | **Cleared** |
| 2. Verified custom sending domain | **Still required** before non–test-inbox recipients |
| 3. Gate 7 PO invite authorisation | **Still required** |
| 4. Public-host `LIFECYCLE_TICK_SECRET` | Only if/when non-local deploy authorised |
| 5. Retention purge | Separate implementation approval |

**Stop:** no deploy, no tester invitations until separate approval.
