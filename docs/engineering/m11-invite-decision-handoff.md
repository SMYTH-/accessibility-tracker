# M11 invite-decision handoff — final (post four-mail Pass)

| Field | Value |
| --- | --- |
| Date | 14 November 2026 |
| PR | [#12](https://github.com/SMYTH-/accessibility-tracker/pull/12) · `cursor/m11-beta-readiness-cb14` |
| Preview | Local `http://localhost:3000` only |
| Closed-lab | **Accepted** |
| Four-mail test-inbox proof | **Pass** (approve · reject · recovery · verify) |
| Private beta invites / deploy | **NO-GO** |

## Go / no-go (one verdict)

**NO-GO for inviting human testers or deployment.**

Test-inbox email path is proven (4/4). That does **not** clear Gate 7: a **verified custom sending domain** is still required before any beta-tester addresses; explicit PO invite authorisation is still required. No deploy/invites.

### Cleared

| Item | Evidence |
| --- | --- |
| Journeys / a11y / SR / tick / security / PostCSS / retention planning | Prior Pass |
| Membership approve + reject | Resend MCP **delivered** + Dominic inbox |
| Password recovery | Dominic · `noreply@mail.app.supabase.io` |
| Sign-up verification | Dominic · fresh link; Auth confirmed `d28f358c-…` @ 13:49:14Z; session hash valid (`email_verified=true`) |
| Auth callback query polish | Noted only — `/sign-in?error=auth_callback` with valid hash; **not** an inbox fail |

### Still blocking invite GO

1. **Verified custom sending domain** (leave `onboarding@resend.dev` / default Supabase mail for lab only; spam risk noted).
2. **Gate 7** explicit PO yes to invite testers.
3. Public-host tick secret only when non-local deploy is authorised.

## Store paths

- `docs/engineering/m11-acceptance.md`
- `docs/engineering/m11-invite-decision-handoff.md`
- `media/m11/email-resend-evidence.json`
