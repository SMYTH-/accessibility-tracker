# M11 invite-decision handoff (interim — awaiting email ready)

| Field | Value |
| --- | --- |
| Date | 14 November 2026 |
| PR | [#12](https://github.com/SMYTH-/accessibility-tracker/pull/12) · `cursor/m11-beta-readiness-cb14` |
| Tip | `3752b786a73cf9464dbbb3a3cdbebef235711819` |
| Preview | Local `http://localhost:3000` only |
| Closed-lab | **Accepted** |
| Private beta invites / deploy | **NO-GO** — stopped |

## Go / no-go

**NO-GO for inviting human testers.** Continue closed-lab.

### Cleared

| Item | Evidence |
| --- | --- |
| Retention planning | **Approved** — 24mo / 90d / 180d terminal deletion audit; purge disabled — `m11-retention-proposal.md` |
| Nested PostCSS high | **Resolved** — `postcss@8.5.32` override; build + smoke + journeys 86/86 + a11y 11/11 + tick 9/9 — `m11-postcss-advisory.md` |
| Tick secret | Docs + 9/9 auth checks |
| Screen-reader core surfaces | 13/13 (prior) |
| Security F-01–F-05 | Fixed (prior) |

### Still blocking invite GO

1. **Beta email** — Dominic completes `m11-dominic-request-beta-email.md`, then says **“email ready”**. Agent will run four inbox checks (verify, recovery, approve, reject) and only ping Dominic for inbox actions.
2. **Gate 7** explicit invite authorisation.
3. Public-host `LIFECYCLE_TICK_SECRET` only when a non-local deploy is authorised.

After email proof: one updated go/no-go handoff with dependency + email evidence.

## Store paths

Under `/Users/dom.smyth/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/files/`:

- `docs/engineering/m11-acceptance.md`
- `docs/engineering/m11-retention-proposal.md`
- `docs/engineering/m11-postcss-advisory.md`
- `docs/engineering/m11-dominic-request-beta-email.md`
- `docs/engineering/m11-invite-decision-handoff.md`
- `media/m11/`
