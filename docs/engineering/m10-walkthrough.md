# M10 Walkthrough — Account controls & hardening

## Preview

`http://localhost:3000` (Supabase auth via `.env.local` → project `gdrkejobqlvtwnlaedpu`)

## Apply migrations

```bash
supabase db push --linked --yes
# 20261113220000_m10_account_export_hardening.sql
# 20261113221000_m10_account_deletion.sql
```

## Click path

1. Sign in → **Profile**.
2. **Account controls** → **Export my data** → JSON download (own records only).
3. Acknowledge deletion → **Request account deletion**.
   - If you own Active/Scheduled challenges with eligible approved members: transfer required.
   - If none: 7-day grace starts; members notified; transfer during grace prevents cancel.
4. After transfer (or grace expiry / tick): finalise → identity tombstoned; sessions revoked; sign-in with old email fails.

## Evidence commands

```bash
npm run smoke:m10
npm run evidence:m10:pg
npm run evidence:m10:ui
```

Screenshots: `media/m10/`.

## Out of M10

M11 independent QA/security review; multi-year retention calendar; pause/streak awards/reopen; re-opt-in; manual cancel UX.
