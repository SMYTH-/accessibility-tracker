# M11 Acceptance Checks — private-beta readiness

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M11 · Gates 6–7 · §10.1 · §10.5 · Journeys A–E · WCAG 2.2 AA |
| M10 base tip | `6e9cca6d` (PR #11) |
| Implementation branch | `cursor/m11-beta-readiness-cb14` · PR #12 |
| Tip SHA | _(set at handoff commit)_ |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod linked) |
| Date | 14 November 2026 |
| Machine | Dom Mac · `~/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` (**local only**) |
| Evidence | `evidence:m11:*` · `smoke:m10` · `media/m11/` |
| Migrations | M10 set + **`20261113230000_m11_security_hardening.sql` (applied)** |
| Security review | Store `internal/m11-security-review.md` + remediations |
| Retention | **Approved for planning** — purge still disabled |
| Closed-lab | **Accepted** by Dominic (14 Nov) for disposable data |
| Private beta | **NO-GO** for invites / deploy until email proof + Gate 7 |

## Checklist

### Journeys A–E (connected two-account, live Supabase)

| Check | Result | Evidence |
| --- | --- | --- |
| A–E + access boundaries (re-run after PostCSS pin) | **Pass 86/86** | `media/m11/journeys-evidence.json` |

### Email (honest) — invite blocker

| Item | Status |
| --- | --- |
| Intended beta | Resend → Dominic (+ Supabase Auth SMTP for verify/recovery) |
| Lab today | Ethereal only — awaiting Dominic **“email ready”** |
| One request | `docs/engineering/m11-dominic-request-beta-email.md` |
| When ready | Re-prove verify · recovery · approve · reject to Dominic’s inbox |

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
| Resend → Dominic four-mail proof | Await “email ready” |
| Gate 7 invite authorisation | Stop |

## Commands

```bash
npm run evidence:m11:journeys
npm run evidence:m11:ui
npm run evidence:m11:a11y
npm run evidence:m11:sr
npm run evidence:m11:tick
npm run smoke:m10
```

## Invite decision — go / no-go

### Recommendation: **NO-GO for private-beta invites**

**Closed-lab:** continue.

| Blocker | Clears when |
| --- | --- |
| 1. Beta email | Dominic says **email ready**; agent proves verify + recovery + approve + reject |
| 2. Tick secret on public host | Only if/when non-local host authorised |
| 3. Retention purge | Separate implementation approval (planning periods locked) |
| 4. Gate 7 | Explicit PO yes to invite testers |

**PostCSS** is no longer an invite blocker.

**Stop:** no deploy, no tester invitations until separate approval.
