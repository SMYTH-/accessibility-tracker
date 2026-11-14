# M11 Acceptance Checks — private-beta readiness

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M11 · Gates 6–7 · §10.1 · §10.5 · Journeys A–E · WCAG 2.2 AA |
| Implementation branch | `cursor/m11-beta-readiness-cb14` · PR #12 |
| Persistence | **Supabase** `gdrkejobqlvtwnlaedpu` |
| Date | 14 November 2026 |
| Preview | `http://localhost:3000` (up; `.env.local` / `NEXT_PUBLIC_SITE_URL` match) |
| Closed-lab | **Accepted** |
| Private beta | **NO-GO** for invites / deploy |

## Email (four-mail proof)

| Item | Status | Evidence |
| --- | --- | --- |
| Membership **approval** | **Pass** | MCP delivered + Dominic sight (`onboarding@resend.dev`) |
| Membership **rejection** | **Pass** | Same |
| Password **recovery** | **Pass** | Dominic — `noreply@mail.app.supabase.io` |
| Sign-up **verification** | **Pending — fresh link** | Prior link → `otp_expired` / `access_denied` on `/sign-in?error=auth_callback`. Auth SMTP **rate-limited**; fresh Auth `generateLink(signup)` delivered via Resend `01a1da51-3b25-…` to exact inbox. **Await Dominic open + clean confirm** |
| Spam note | Check **Inbox + Spam** — `onboarding@resend.dev` spam risk | Dominic prior probe-in-spam |
| Caveat | Test-inbox only; verified domain still required before testers | — |

**Four-check:** **3/4 Pass**. Verify **not Pass** until Dominic confirms the new link opened cleanly.

## Other gates (unchanged)

Journeys 86/86 · a11y 11/11 · SR 13/13 · tick 9/9 · security remediations · PostCSS resolved · retention planning approved (purge disabled).

## Go / no-go

**NO-GO for private-beta invites / deploy.** Even after four-check Pass: verified sending domain + Gate 7 still required. **Stop:** no deploy, no invitations.
