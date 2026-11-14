# M11 invite-decision handoff (closed-lab accepted · beta NO-GO)

| Field | Value |
| --- | --- |
| Date | 14 November 2026 |
| PR | [#12](https://github.com/SMYTH-/accessibility-tracker/pull/12) · `cursor/m11-beta-readiness-cb14` |
| Base tip for this pass | `d9ba51ae` + follow-up commits on same PR |
| Preview | Local `http://localhost:3000` only |
| Closed-lab | **Accepted** (Dominic) — disposable data on `gdrkejobqlvtwnlaedpu` |
| Private beta invites / deploy | **NO-GO — stopped** |

## Updated go / no-go

**NO-GO for inviting human testers.** Continue closed-lab.

### Cleared since prior handoff

| Item | Evidence |
| --- | --- |
| Tick secret documented + missing/invalid rejected | `m11-lifecycle-tick-secret.md` · `media/m11/lifecycle-tick-auth-evidence.json` **9/9** |
| Screen-reader walkthrough (sign-in, record, privacy) | `media/m11/screenreader-evidence.json` **13/13** |
| Retention proposal revised (24mo / 90d / 180d audit ask) | `m11-retention-proposal.md` — **purge still disabled** |
| PostCSS recommendation | Closed-lab **exception**; Next 16 before invites — `m11-postcss-advisory.md` |

### Still blocking invite GO

1. **Beta email (one Dominic request):** `docs/engineering/m11-dominic-request-beta-email.md`  
   Needs Resend + Supabase Auth SMTP + inbox confirmation of **verify**, **recovery**, **approve**, **reject**.
2. **Retention approval:** especially **180-day** deletion-audit period (24mo/90d already working direction).
3. **PostCSS for internet host:** accept scheduling Next 16 (or proven override) before invites.
4. **Gate 7** explicit invite authorisation.

Local tick secret is done; public-host secret only matters when a deploy is authorised.

## Store paths

- `/Users/dom.smyth/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/files/docs/engineering/m11-acceptance.md`
- `…/m11-walkthrough.md`
- `…/m11-retention-proposal.md`
- `…/m11-lifecycle-tick-secret.md`
- `…/m11-dominic-request-beta-email.md`
- `…/m11-postcss-advisory.md`
- `…/m11-invite-decision-handoff.md` (this file)
- `…/media/m11/` (journeys, a11y, sr, tick evidence)
- `…/internal/m11-security-review.md`
