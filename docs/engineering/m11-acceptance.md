# M11 Acceptance Checks — private-beta readiness

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M11 · Gates 6–7 · §10.1 · §10.5 · Journeys A–E · WCAG 2.2 AA |
| M10 base tip | `6e9cca6d` (PR #11) |
| Implementation branch | `cursor/m11-beta-readiness-cb14` · PR #12 |
| Tip SHA | branch tip after verify-retry |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod linked) |
| Date | 14 November 2026 |
| Machine | Dom Mac · `~/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` (**local only**) |
| Evidence | `evidence:m11:*` · `media/m11/email-resend-evidence.json` |
| Closed-lab | **Accepted** |
| Private beta | **NO-GO** for invites / deploy |

## Checklist

### Journeys A–E

| Check | Result | Evidence |
| --- | --- | --- |
| A–E + access boundaries | **Pass 86/86** | `media/m11/journeys-evidence.json` |

### Email (four-mail proof)

| Item | Status | Evidence |
| --- | --- | --- |
| Membership **approval** | **Pass** | Resend MCP delivered + Dominic inbox sight (`Accountability Tracker` / `onboarding@resend.dev`) |
| Membership **rejection** | **Pass** | Same |
| Password **recovery** | **Pass** | Dominic — Reset password from `noreply@mail.app.supabase.io` |
| Sign-up **verification** | **Pending / retry** | Prior Confirm signup not found; fresh signup re-triggered to exact `M3_TEST_INBOX` (user `518ac527-…`, unconfirmed). **Dominic: open fresh Confirm signup now** (Inbox + **Spam**) |
| Spam note | Resend `onboarding@resend.dev` **spam risk** — Dominic found only “M11 probe …” in spam; Auth mails may use `noreply@mail.app.supabase.io` | Dominic |
| Auth SMTP vs Resend | Recovery (and likely verify) still on **default Supabase mail host**, not Resend sender | Dominic paste |
| Caveat | **Test-inbox only** — verified sending domain still required before beta testers | — |

**Four-check:** **3/4 Pass** (approve · reject · recovery). **Verify pending** after fresh re-trigger.

### Other gates (unchanged Pass)

Tick 9/9 · Security F-01–F-05 · PostCSS resolved · a11y 11/11 · SR 13/13 · Retention planning approved (purge disabled).

## Invite decision — go / no-go

### Recommendation: **NO-GO for private-beta invites / deploy**

Test-inbox OK for closed-lab. Four-mail Pass incomplete until verify confirmed. Even then: **verified domain + Gate 7** still block invites.

| Blocker | Status |
| --- | --- |
| 1. Beta email four-check | Approve/reject/recovery **Pass**; verify **pending/retry** |
| 2. Verified sending domain | Required before tester addresses |
| 3. Gate 7 | Explicit PO yes |
| 4. Public-host tick secret | Only if non-local deploy authorised |

**Stop:** no deploy, no tester invitations.
