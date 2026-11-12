# M1 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M1 |
| Baseline | `96f723d` |
| Branch | `cursor/m1-shell-auth-962b` @ **`9df6665`** |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Auth under test | **supabase** — project `gdrkejobqlvtwnlaedpu` (`.env.local` local-only; not committed) |

## Final same-browser acceptance @ `9df6665` (authoritative)

**Rules:** fresh account · real inbox links only · **same browser that started each flow** · recovery starts **signed out** · never paste links into chat · no admin-generated substitute links.

| Step | Result | Notes |
| --- | --- | --- |
| Fresh register | **Awaiting Dominic** | Suggested To: `smyth.developer+m1final1794505384@gmail.com` · browser: one Chrome window · URL `http://localhost:3000` (not `127.0.0.1`) |
| Verification email delivery | **Awaiting** | |
| **Verify callback outcome** | **Awaiting** | Record landing after click: expect `/home` or `/auth/callback` → `/home` · **not** `/sign-in?error=auth_callback` |
| Sign-in (if needed) / protected routes / profile / sign-out | **Awaiting** | |
| Recovery request (signed out) | **Awaiting** | Same browser as will open the reset email |
| Recovery email delivery | **Awaiting** | |
| **Recovery callback outcome** | **Awaiting** | Expect `/update-password` password form · **not** `/sign-in?error=auth_callback` |
| New password works | **Awaiting** | |
| Old password fails | **Awaiting** | |

### Callback outcomes (fill when observed)

| Callback | Expected | Observed |
| --- | --- | --- |
| Email verification (`/auth/callback`) | Session established; continue to app (e.g. `/home`) | _pending same-browser click_ |
| Password recovery (`/auth/callback?next=/update-password`) | Session established; **password form** on `/update-password` | _pending same-browser click_ |

## Prior live run (context only — not this final gate)

Earlier automation/admin-assisted recovery proved flows after callback fixes, but **this final gate requires Dominic same-browser inbox clicks** with a fresh account. Prior verify click had landed on `/sign-in?error=auth_callback` before PKCE/cookie/`next` fixes at `ae38e0e` / `9df6665`.

## Checklist (status after final gate)

| Check | Result |
| --- | --- |
| Unauthenticated protected routes — AUTH-01 | Pending final gate |
| Invalid credentials / time-limited recovery — AUTH-01 | Pending final gate |
| Profile no financial data — PROF-01 | Pass (unchanged surface) |
| Verify + recovery emails deliver — NOTIF-01 | Pending final gate |
| Responsive shell — §10.2 | Pass |
| Working accents only — §0 | Pass |
| Register / verify / sign-in / sign-out | Pending final gate |
| Display name profile | Pending final gate |
| Provisional nav | Pass |
| Recovery → password form; new works / old fails | Pending final gate |
| Stop before M2 | **Pass** — M2 untouched |

## Explicit stop

**M1 open for final same-browser sign-off evidence.** **Stopped before M2.**
