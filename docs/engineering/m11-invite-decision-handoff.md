# M11 invite-decision handoff (post email-ready run)

| Field | Value |
| --- | --- |
| Date | 14 November 2026 |
| PR | [#12](https://github.com/SMYTH-/accessibility-tracker/pull/12) · `cursor/m11-beta-readiness-cb14` |
| Tip | `58282ab9` |
| Preview | Local `http://localhost:3000` only (restarted on redesign tip) |
| Closed-lab | **Accepted** |
| Private beta invites / deploy | **NO-GO** — stopped |

## Go / no-go (one verdict)

**NO-GO for inviting human testers or deployment** (interim — awaiting Dominic inbox confirmation before any revised verdict).

Closed-lab may continue. Email path to the **exact test inbox** is agent-proven for membership approve/reject (Resend 200) and Auth verify/recovery (queued). **Final go/no-go is held** until Dominic confirms approve/reject arrival + successful verify then recovery link opens. Separately: verified sending domain still required before beta-tester addresses; Gate 7 PO yes still required; no deploy/invites.

### Cleared

| Item | Evidence |
| --- | --- |
| Retention planning | **Approved** — 24mo / 90d / 180d terminal deletion audit; purge disabled — `m11-retention-proposal.md` |
| Nested PostCSS high | **Resolved** — `postcss@8.5.32` override — `m11-postcss-advisory.md` |
| Tick secret | Docs + 9/9 auth checks |
| Screen-reader core surfaces | 13/13 (prior) |
| Security F-01–F-05 | Fixed (prior) |
| Journeys / a11y | 86/86 · 11/11 |
| Membership reject → Resend → `M3_TEST_INBOX` | Send 200 · `01a1da33-7e4f-…` — `media/m11/email-resend-evidence.json` |
| Membership approve → Resend → same inbox | Send 200 · `01a1da33-826f-…` |
| Sign-up verification + password recovery | Queued via Supabase Auth SMTP (same `onboarding@resend.dev` sender) |
| Resend MCP | Declined — not relied on |

### Still blocking invite GO

1. **Dominic inbox confirm** — approve+reject arrived; fresh Confirm signup then Reset password links worked.
2. **Verified sending domain** — test-inbox / `onboarding@resend.dev` only until then.
3. **Gate 7** explicit invite authorisation.
4. Public-host `LIFECYCLE_TICK_SECRET` only when a non-local deploy is authorised.

## Store paths

Under `/Users/dom.smyth/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/files/`:

- `docs/engineering/m11-acceptance.md`
- `docs/engineering/m11-invite-decision-handoff.md`
- `docs/engineering/m11-retention-proposal.md`
- `docs/engineering/m11-postcss-advisory.md`
- `docs/engineering/m11-dominic-request-beta-email.md`
- `media/m11/email-resend-evidence.json`
