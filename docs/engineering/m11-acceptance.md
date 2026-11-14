# M11 Acceptance Checks — private-beta readiness

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M11 · Gates 6–7 · §10.1 · §10.5 · Journeys A–E · WCAG 2.2 AA |
| M10 base tip | `6e9cca6d` (PR #11) |
| Implementation branch | `cursor/m11-beta-readiness-cb14` · PR #12 |
| Tip SHA | email-evidence commit on `cursor/m11-beta-readiness-cb14` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod linked) |
| Date | 14 November 2026 |
| Machine | Dom Mac · `~/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` (**local only**) · tip includes redesign |
| Evidence | `evidence:m11:*` · `smoke:m10` · `media/m11/` |
| Migrations | M10 set + **`20261113230000_m11_security_hardening.sql` (applied)** |
| Security review | Store `internal/m11-security-review.md` + remediations |
| Retention | **Approved for planning** — purge still disabled |
| Closed-lab | **Accepted** by Dominic (14 Nov) for disposable data |
| Private beta | **NO-GO** for invites / deploy — see go/no-go |

## Checklist

### Journeys A–E (connected two-account, live Supabase)

| Check | Result | Evidence |
| --- | --- | --- |
| A–E + access boundaries (re-run after PostCSS pin) | **Pass 86/86** | `media/m11/journeys-evidence.json` |

### Email (Resend + Auth SMTP) — four-mail proof

| Item | Status | Evidence |
| --- | --- | --- |
| Config | `EMAIL_FROM=Accountability Tracker <onboarding@resend.dev>`; `M3_TEST_INBOX` = exact Resend-account email (no `+`) | `.env.local` (not committed) |
| Supabase Auth SMTP | Same sender | Dominic dashboard (prior “email ready”) |
| Membership **rejection** | **Pass** — outbox → exact inbox; Resend send **200** `01a1da33-7e4f-7a82-aea0-160338567421` | `media/m11/email-resend-evidence.json` |
| Membership **approval** | **Pass** — outbox → exact inbox; Resend send **200** `01a1da33-826f-7326-92f5-105c1bbfbd3a` | same |
| Sign-up **verification** | **Queued** via Supabase Auth SMTP | same — **Dominic: open fresh Confirm signup now** |
| Password **recovery** | **Queued** via Supabase Auth SMTP | same — **Dominic: open fresh Reset password after verify** |
| Resend GET metadata | N/A — send-only API key (`restricted_api_key`); recipient proven via outbox + send 200 | script handles as optional |
| Caveat | **Test-inbox only** — verified sending domain still required before beta testers | — |

**Human pending (blocks final go/no-go):** Dominic confirms (1) membership approve + reject mail arrived in the exact inbox, (2) fresh Confirm signup link worked, (3) fresh Reset password link worked. Agent will not flip invite GO until that confirmation.

### LIFECYCLE_TICK_SECRET

| Check | Result |
| --- | --- |
| Docs + missing/invalid → 401; valid → 200 | **Pass 9/9** (`evidence:m11:tick`) |
| Local preview | Secret in `.env.local` (not committed) |

### Security remediations

| Item | Status |
| --- | --- |
| F-01–F-05 + sharp pin | **Fixed / verified** |

### Advisories (PostCSS / Sharp)

| Package | Status | Decision |
| --- | --- | --- |
| **sharp** | **0.35.5** pinned | Done |
| **postcss** | **8.5.32** via exact pin + `overrides` (Next deduped) | **Resolved** — high cleared; build + regression Pass — `m11-postcss-advisory.md` |

### WCAG 2.2 AA + screen reader

| Check | Result |
| --- | --- |
| axe + keyboard/focus/reflow/zoom | **Pass 11/11** (re-run after PostCSS) |
| SR walkthrough sign-in / record / privacy | **Pass 13/13** (prior) |

### Retention / purge

| Item | Status |
| --- | --- |
| Planning approval | **Approved** — 24 months residual after Completed/Cancelled; 90 days notification bodies; **180 days** after deletion request **terminal** for minimum audit |
| Purge implementation | **Disabled / not shipped** |

### Explicitly open

| Item | Note |
| --- | --- |
| Pause / streak awards / re-opt-in / manual cancel | OPEN |
| Purge job | Needs separate implementation approval |
| Human confirm of four-mail inbox + link opens | Awaiting Dominic |
| Verified sending domain | Required before real beta tester addresses |
| Gate 7 invite authorisation | Stop |

## Commands

```bash
npm run evidence:m11:journeys
npm run evidence:m11:ui
npm run evidence:m11:a11y
npm run evidence:m11:sr
npm run evidence:m11:tick
npm run evidence:m11:email
npm run smoke:m10
```

## Invite decision — go / no-go

### Recommendation: **NO-GO for private-beta invites / deploy**

**Closed-lab:** continue. Agent-side approve/reject sends + Auth verify/recovery queue **proven** to exact `M3_TEST_INBOX`; human link opens + inbox sighting still pending; verified domain still required before testers.

| Blocker | Status |
| --- | --- |
| 1. Beta email (four mails) | Agent send/queue **done**; Dominic open verify → then recovery; confirm approve/reject arrived |
| 2. Verified sending domain | **Still required** before any non–test-inbox recipients |
| 3. Tick secret on public host | Only if/when non-local host authorised |
| 4. Retention purge | Separate implementation approval (planning periods locked) |
| 5. Gate 7 | Explicit PO yes to invite testers |

**Stop:** no deploy, no tester invitations until separate approval.
