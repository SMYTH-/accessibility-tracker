# M11 invite-decision handoff (verify retry)

| Field | Value |
| --- | --- |
| Date | 14 November 2026 |
| PR | [#12](https://github.com/SMYTH-/accessibility-tracker/pull/12) · `cursor/m11-beta-readiness-cb14` |
| Preview | Local `http://localhost:3000` only |
| Closed-lab | **Accepted** |
| Private beta invites / deploy | **NO-GO** |

## Go / no-go

**NO-GO for invites / deploy.** Test-inbox closed-lab OK.

Approve · reject · recovery **Pass**. Sign-up verification **pending** after fresh re-trigger (prior Confirm signup not found; probe was in spam). Verified domain + Gate 7 still required before testers.

### Cleared

- Membership approve + reject (MCP + Dominic)
- Reset password receipt (Dominic · `noreply@mail.app.supabase.io`)
- Journeys / a11y / tick / security / PostCSS / retention planning

### Open

1. Dominic opens **fresh Confirm signup** (check Inbox + Spam) for user re-created unconfirmed on exact `M3_TEST_INBOX`
2. Verified sending domain (note: `onboarding@resend.dev` spam risk)
3. Gate 7 invite authorisation

## Store

- `docs/engineering/m11-acceptance.md`
- `docs/engineering/m11-invite-decision-handoff.md`
- `media/m11/email-resend-evidence.json`
