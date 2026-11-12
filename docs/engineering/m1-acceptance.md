# M1 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M1 |
| Baseline | `96f723d` |
| App / auth fix tip | **`9df6665`** (branch `cursor/m1-shell-auth-962b`; docs tip may be later) |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Auth under test | **supabase** — project `gdrkejobqlvtwnlaedpu` (`.env.local` local-only; not committed) |

## Final same-browser acceptance @ `9df6665` (authoritative)

**Rules:** fresh account · real inbox links only · **same browser that started each flow** · recovery starts **signed out** · never paste links into chat · no admin-generated substitute links.

**Resume (18:57 Europe/London):** rate-limit window cleared. `smyth.developer+m1final@gmail.com` still **not** created — safe to register. Preview restarted on M1 branch.

| Step | Result | Notes |
| --- | --- | --- |
| Fresh register | **Awaiting Dominic** | Use `smyth.developer+m1final@gmail.com` (display name e.g. dominicsmyth) · **one Chrome window** · `http://localhost:3000` only (not `127.0.0.1`) |
| Verification email delivery | **Awaiting** | |
| **Verify callback outcome** | **Awaiting** | After inbox click in **same Chrome**: expect `/home` (or callback → `/home`) · **fail if** `/sign-in?error=auth_callback` |
| Sign-in (if needed) / protected routes / profile / sign-out | **Awaiting** | Visit `/challenge` signed-out after sign-out to confirm redirect |
| Recovery request (signed out) | **Awaiting** | Same Chrome that will open the reset email |
| Recovery email delivery | **Awaiting** | |
| **Recovery callback outcome** | **Awaiting** | Expect `/update-password` **with password form** · **fail if** `/sign-in?error=auth_callback` |
| New password works | **Awaiting** | |
| Old password fails | **Awaiting** | |

### Callback outcomes (fill when observed)

| Callback | Expected | Observed |
| --- | --- | --- |
| Email verification (`/auth/callback`) | Session established; continue to app (e.g. `/home`) | _pending same-browser click_ |
| Password recovery (`/auth/callback?next=/update-password`) | Session established; **password form** on `/update-password` | _pending same-browser click_ |

## Prior notes (not this gate)

- Built-in mailer hard cap **2 emails/hour**; cannot raise without custom SMTP.
- Earlier automation/admin-assisted recovery is **not** this final gate.

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
| Stop before M2 | **Pass** — M2 untouched this turn |

## Explicit stop

**M1 open — awaiting Dominic same-browser verify + recovery clicks.** **Stopped before M2.**
