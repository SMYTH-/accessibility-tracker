# M11 Walkthrough — private-beta readiness

Preview: `http://localhost:3000` (Supabase auth via `.env.local` → project `gdrkejobqlvtwnlaedpu`)

## Apply migrations

```bash
supabase db push --linked --yes
# includes 20261113230000_m11_security_hardening.sql
```

Set locally (never commit values):

```bash
# Required for internet-reachable hosts — tick route returns 401 without it
LIFECYCLE_TICK_SECRET=…
# Intended beta email path (not set in this lab — Ethereal used for evidence)
# RESEND_API_KEY=…
# EMAIL_FROM=Pactwell <…>
# M3_TEST_INBOX=dominic@…
```

## Evidence commands

```bash
npm run evidence:m11:journeys   # A–E + access boundaries + email honesty
npm run evidence:m11:ui         # two-account screenshots → media/m11/
npm run evidence:m11:a11y       # axe + keyboard/focus/reflow/zoom
npm run evidence:m11:sr         # screen-reader aria walkthrough (sign-in / record / privacy)
npm run evidence:m11:tick       # lifecycle-tick secret auth (401/200)
npm run smoke:m10               # regression money/deletion/revoke
```

Related docs: `m11-lifecycle-tick-secret.md` · `m11-dominic-request-beta-email.md` · `m11-postcss-advisory.md` · `m11-retention-proposal.md` · `m11-invite-decision-handoff.md`

## Connected walkthrough (what was exercised)

1. **Journey A** — Alex creates Active challenge + 7-day invite.
2. **Journey B** — Sam invite preview (signed-out, no financials) → request → decline email → re-request → approve email → savings setup both.
3. **Journey C** — Record + amend (Alex); Sam record.
4. **Journey D** — Both dashboards; Sharing members only; stranger/pending denied.
5. **Journey E** — Missed week preserved; next met week starts streak automatically; pause UX still OPEN.
6. **Opt-out** — Alex then Sam; each peer loses monetary fields / sees Private; self retains own figures.
7. **Remove** — Owner removes member; removed dashboard denied; export of own account still allowed.
8. **Completion** — Lifecycle tick → Completed; ordinary create rejected (`CHALLENGE_READONLY`).
9. **Export** — Cross-user isolation (no peer emails / peer-owned contributions).
10. **Deletion** — Dual-session revoke on Completed solo owner; second session `ACCOUNT_ACCESS_REVOKED`; refresh fails; old password fails.

## Screenshots

See `media/m11/01`–`07` (UI) and `a11y-01`–`08`.

## Email honesty

- **Intended beta path:** Resend → Dominic’s inbox (M3 carry-forward).
- **This lab:** `RESEND_API_KEY` absent → approve/reject delivered via **Ethereal** (M3 interim). Outbox rows recorded and marked `sent`.
- **Before inviting human testers:** configure Resend + from-address + confirm delivery to Dominic’s inbox.
