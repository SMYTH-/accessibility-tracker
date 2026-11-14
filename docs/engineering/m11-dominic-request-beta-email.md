# One request — beta email setup (blocks invite GO)

| Field | Value |
| --- | --- |
| Status | **Blocked on Dominic** — cannot complete Resend → Dominic inbox proof from this agent |
| Why one request | Assignment: bundle provider + inbox actions into a single ask |
| Date | 14 November 2026 |

## What we need from you (once)

Please do **all** of the following, then reply with the green ticks (no secret values in chat — put keys only in local `.env.local` / Supabase dashboard):

1. **Resend**
   - Create/use a Resend API key for Pactwell lab/beta.
   - Add to Dom Mac `~/Local Sites/accessibility-tracker/.env.local`:
     - `RESEND_API_KEY=…`
     - `EMAIL_FROM=Pactwell <verified-from@…>` (Resend-verified domain or `onboarding@resend.dev` for lab)
     - `M3_TEST_INBOX=<your inbox that should receive beta mail>`
   - Restart `npm run dev` on `:3000`.

2. **Supabase Auth SMTP (verification + recovery links)**
   - Auth verify/recovery are sent by **Supabase Auth**, not the app Resend outbox.
   - In project `gdrkejobqlvtwnlaedpu` → Authentication → Emails / SMTP: configure custom SMTP to Resend (or confirm built-in Supabase mail delivers reliably to your inbox for this project).
   - When custom SMTP is enabled, set **Sender name** to `Pactwell` (Management API: `smtp_sender_name`). Built-in Supabase mail still shows `Supabase Auth` until custom SMTP is on.
   - Confirm Site URL / redirect allow-list includes `http://localhost:3000/auth/callback`.
   - Auth templates (Confirm / Reset) are branded Pactwell in-repo and via Management API; re-check Dashboard → Authentication → Email Templates if SMTP is reconfigured.

3. **Inbox confirmation (your side)**
   After (1)–(2), tell the coordinator “email ready” so we can re-run delivery evidence. We will then prove with disposable accounts:
   - Fresh **email verification** link arrives and opens.
   - Fresh **password recovery** link arrives and opens.
   - Membership **approval** and **rejection** messages arrive (app outbox → Resend).

## What already works without Resend

- Membership approve/reject **outbox + Ethereal** delivery (M3/M11 journeys) — interim only.
- Auth flows work when Supabase delivers mail (M1 signed off; rate limits may still throttle).

## What stays NO-GO until this lands

Private-beta **invite** GO requires Resend → Dominic proof for verify, recovery, approve, and reject. Closed-lab disposable testing may continue.
