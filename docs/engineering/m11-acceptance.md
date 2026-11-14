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
| Retention | Revised proposal — **purge still disabled** |
| Closed-lab | **Accepted** by Dominic (14 Nov) for disposable data |
| Private beta | **NO-GO** for invites / deploy |

## Checklist

### Journeys A–E (connected two-account, live Supabase)

| Check | Result | Evidence |
| --- | --- | --- |
| A–E connected walkthrough + access boundaries | **Pass 86/86** | `media/m11/journeys-evidence.json` |
| Opt-out, completion, export, dual-session deletion | **Pass** | same |

### Access boundaries

| State | Result |
| --- | --- |
| Signed-out / pending / approved / removed / deleted | **Pass** (prior M11 journeys) |

### Email (honest) — invite blocker

| Item | Status |
| --- | --- |
| Intended beta | Resend → Dominic inbox (+ Supabase Auth SMTP for verify/recovery) |
| Membership approve/reject in this lab | **Ethereal** only (`RESEND_API_KEY` absent) |
| Verify + recovery via Resend → Dominic | **Not verified** — blocked |
| One Dominic request | `docs/engineering/m11-dominic-request-beta-email.md` |

### LIFECYCLE_TICK_SECRET

| Check | Result | Evidence |
| --- | --- | --- |
| Config documented for intended host | **Pass** | `docs/engineering/m11-lifecycle-tick-secret.md` |
| Missing / invalid / empty → 401 | **Pass** | `media/m11/lifecycle-tick-auth-evidence.json` **9/9** |
| Valid Bearer + header → 200 | **Pass** | same |
| Local preview | Secret set in `.env.local` (not committed) | |

### Security remediations (unchanged)

| Item | Status |
| --- | --- |
| F-01–F-05 + sharp pin | **Fixed / verified** (prior) |
| Low residuals | Recorded; not blocking closed-lab |

### Advisories (PostCSS / Sharp)

| Package | Status | Decision |
| --- | --- | --- |
| **sharp** | **0.35.5** pinned | Done |
| **postcss** nested in Next 15.5.29 (`8.4.31`) | High residual | **Closed-lab exception** (Option C). Override Option A blocked by npm `EOVERRIDE`. **Before invite GO:** Next 16 (Option B) or proven override — see `m11-postcss-advisory.md` |

### WCAG 2.2 AA + screen reader

| Check | Result | Evidence |
| --- | --- | --- |
| axe + keyboard/focus/reflow/zoom | **Pass 11/11** | `media/m11/a11y-evidence.json` |
| Screen-reader walkthrough: sign-in, record savings, financial privacy | **Pass 13/13** | `media/m11/screenreader-evidence.json` + `sr-*.aria.yml` / png |
| Method note | Playwright aria snapshots + keyboard; not a live VoiceOver listen-through | Listed in SR JSON `untested` |
| Untested still | Full VoiceOver/TalkBack operator session; complete WCAG checklist beyond axe; reduced-motion sweep | |

### Retention / purge

| Item | Status |
| --- | --- |
| Working periods | **24 months** post Completed/Cancelled residual; **90 days** notification bodies |
| Deletion audit shortest useful | **180 days** after completion (proposed) |
| Impact on summaries / milestones / privacy | Documented in `m11-retention-proposal.md` |
| Purge implementation | **Disabled / not shipped** — awaiting approval |

### Explicitly open

| Item | Note |
| --- | --- |
| Pause / streak awards / re-opt-in / manual cancel | OPEN |
| Purge job | Pending Dominic approval of revised proposal |
| Resend → Dominic proof | Pending one request |
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

### Recommendation: **NO-GO for private-beta invites** (unchanged)

**Closed-lab:** continue (Dominic accepted).

| Blocker | Clears when |
| --- | --- |
| 1. Beta email | Dominic completes `m11-dominic-request-beta-email.md`; agent re-proves verify + recovery + approve + reject to his inbox |
| 2. Tick secret on public host | Only if/when a non-local host is authorised — local already verified |
| 3. Retention | Dominic approves revised proposal (esp. **180-day** deletion audit); purge still later |
| 4. PostCSS | Accept closed-lab exception **or** schedule Next 16 before invites |
| 5. Gate 7 | Explicit PO yes to invite testers |

**Stop:** no deploy, no tester invitations from this milestone.
