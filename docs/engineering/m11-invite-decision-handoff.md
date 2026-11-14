# M11 invite-decision handoff (verify otp_expired → fresh link)

| Field | Value |
| --- | --- |
| Date | 14 November 2026 |
| PR | [#12](https://github.com/SMYTH-/accessibility-tracker/pull/12) |
| Preview | `http://localhost:3000` up |
| Private beta invites / deploy | **NO-GO** |

## Go / no-go

**NO-GO.** Approve · reject · recovery **Pass**. Verify **pending** after `otp_expired` — fresh Auth signup link delivered (Resend, Auth SMTP rate-limited). Verified domain + Gate 7 still block invites. No deploy/invites.

### Open

1. Dominic opens **new** Confirm mail (Resend-delivered Auth link; check Spam) and confirms clean open
2. Verified sending domain
3. Gate 7
