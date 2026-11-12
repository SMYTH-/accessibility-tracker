# M1 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M1 |
| Baseline | `96f723d` |
| Branch | `cursor/m1-shell-auth-962b` |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Auth under test | **supabase** — project `gdrkejobqlvtwnlaedpu` (`.env.local` present; not committed) |
| Live suite | **Complete** (register → verify → sign-in → protected → profile → sign-out → recovery → new/old password) |

## Live Supabase run

| Step | Result | Notes |
| --- | --- | --- |
| Register | **Pass** | Plus-address test account |
| Verification email delivery | **Pass** | Dominic received + clicked (NOTIF-01) |
| `/auth/callback` after first verify | **Failed then fixed** | Session exchange failed (`?error=auth_callback`) while provider still confirmed email. Fixed: browser PKCE, callback response cookies, decode `next`, avoid double-encoding, use `localhost` not `127.0.0.1` |
| Provider email confirmed | **Pass** | |
| Sign-in | **Pass** | |
| Protected routes | **Pass** | |
| Profile update | **Pass** | |
| Sign-out | **Pass** | |
| Password recovery email | **Pass** | Delivery observed; inbox link had double-encoded `next` (`%252F`) — fixed in app |
| Recovery → update password | **Pass** | Callback → `/update-password` with recovery session |
| New password works | **Pass** | |
| Old password fails | **Pass** | |

## Checklist

| Check | Result | Notes |
| --- | --- | --- |
| Unauthenticated users cannot open protected challenge routes — AUTH-01 | **Pass** (live) | |
| Invalid credentials denied; recovery is time-limited — AUTH-01 | **Pass** (live) | Old password denied after reset; provider recovery tokens time-limited |
| Profile exposes no unnecessary financial data — PROF-01 | **Pass** | |
| Verify + recovery emails deliver in non-prod — NOTIF-01 | **Pass** (live) | |
| Responsive shell usable on small screens — §10.2 | **Pass** | |
| Working accents only; no claim of final brand identity — §0 | **Pass** | |
| Register, verify, sign-in, sign-out | **Pass** (live) | |
| Display name + basic profile | **Pass** (live) | |
| Provisional nav Home · Challenge · Activity · Profile | **Pass** | |
| Recovery redirect (signed-out browser) | **Pass** (live) | `/auth/callback?next=/update-password` |
| New password works; old password fails | **Pass** (live) | |
| Stop before M2 | **Pass** | No challenge creation |

## Summary

| | |
| --- | --- |
| Pass | All M1 live auth acceptance checks above |
| Fail | None remaining for this live run |
| Gaps / caveats | First verify click did not establish a session (provider confirm succeeded; user signed in with password). Callback/PKCE/`next` encoding fixed before recovery proof. Keep using `http://localhost:3000` only. Do not paste live reset links into chat. `.env.local` never committed. |
| Sign-off | **Ready for Dominic M1 sign-off** — still **stop before M2** |

## Explicit stop

**M1 live auth suite complete — awaiting PO sign-off. Stopped before M2.**
