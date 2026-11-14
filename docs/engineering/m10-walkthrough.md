# M10 Walkthrough — Account controls & hardening

## Preview

`http://localhost:3000` (Supabase auth via `.env.local` → project `gdrkejobqlvtwnlaedpu`)

## Apply migrations

```bash
supabase db push --linked --yes
# 20261113220000_m10_account_export_hardening.sql
# 20261113221000_m10_account_deletion.sql
# 20261113222000_m10_deletion_session_revoke.sql
# 20261113222100_m10_pre_request_grant_fix.sql
# 20261113222200_m10_refresh_token_revoke_fix.sql
```

## Click path

1. Sign in → **Profile**.
2. **Account controls** → **Export my data** → JSON download (own records only).
3. Acknowledge deletion → **Request account deletion**.
   - If you own Active/Scheduled challenges with eligible approved members: transfer required.
   - If none: 7-day grace starts; members notified; transfer during grace prevents cancel.
4. After transfer (or grace expiry / tick): finalise → status may briefly be `revoking` (access already denied) then `completed` once sessions/refresh tokens are wiped.
5. Other open sessions lose protected pages and export/challenge RPCs immediately; refresh fails; old email cannot sign in.
6. If revocation fails, Profile shows pending revocation — **retry Finalise**; completion is reported only after revoke succeeds.

## Evidence commands

```bash
npm run smoke:m10
npm run evidence:m10:pg
npm run evidence:m10:dual
npm run evidence:m10:ui
```

Screenshots / JSON: `media/m10/` (includes `dual-session-evidence.json`).

## Out of M10 / M11 carry-forward

- Multi-year retention calendar (OPEN)
- Remaining dependency advisories (postcss/sharp)
- Full Journeys A–E + independent QA/security review
- Pause / streak awards / reopen / re-opt-in / manual cancel UX (still OPEN)
