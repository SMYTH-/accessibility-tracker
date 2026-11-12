# M1 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M1 |
| Baseline | `96f723d` |
| App / auth fix tip | **`9df6665`** (branch `cursor/m1-shell-auth-962b`) |
| Date | 12 November 2026 |
| Preview | `http://localhost:3000` |
| Auth under test | **supabase** — project `gdrkejobqlvtwnlaedpu` (`.env.local` local-only; not committed) |
| Final account | `smyth.developer+m1final@gmail.com` · display name **dominicjsmyth** |
| **M1 status** | **Signed off** — shell + managed email auth (PO happy; recovery same-browser re-check skipped) |

## Final same-browser acceptance @ `9df6665`

**Rules:** fresh account · real inbox links · same browser · recovery signed out · no link pasting · no admin substitute links.

| Step | Result | Notes |
| --- | --- | --- |
| Fresh register | **Pass** | `smyth.developer+m1final@gmail.com` / dominicjsmyth · Chrome · `localhost:3000` |
| Verification email delivery | **Pass** | Real inbox link, same Chrome |
| **Verify callback outcome** | **Pass** | Landed **`http://localhost:3000/home`** (session established) |
| Signed in on Home | **Pass** | dominicjsmyth |
| Same-browser recovery re-check | **Skipped (PO)** | Second email rate limit on built-in mailer (2/hour). Dominic authorised skip; happy M1 is working |
| Prior live recovery suite | **Pass** (retained) | Earlier non-final run: recovery → update-password → **new password works / old fails** (after callback/PKCE/`next` fixes). Not a substitute for the skipped same-browser re-click, but retained as supporting evidence |

### Callback outcomes

| Callback | Expected | Observed |
| --- | --- | --- |
| Email verification (`/auth/callback`) | Session → app (e.g. `/home`) | **Pass → `/home`** |
| Password recovery (`/auth/callback?next=/update-password`) | Session → password form | **Skipped (rate limit)** — prior live recovery suite **Pass** retained |

## Checklist

| Check | Result |
| --- | --- |
| Unauthenticated protected routes — AUTH-01 | **Pass** (exercised in live runs) |
| Invalid credentials / time-limited recovery — AUTH-01 | **Pass** (prior live suite; same-browser recovery re-click skipped) |
| Profile no financial data — PROF-01 | **Pass** |
| Verify + recovery emails deliver — NOTIF-01 | Verify **Pass**; recovery delivery **Pass** earlier; final recovery re-send **rate-limited / skipped** |
| Responsive shell — §10.2 | **Pass** |
| Working accents only — §0 | **Pass** |
| Register / verify / sign-in / sign-out | **Pass** (final verify gate) |
| Display name profile | **Pass** |
| Provisional nav | **Pass** |
| Recovery → password form; new works / old fails | **Pass** (prior live suite); final same-browser re-check **skipped** |
| Stop before M2 | **Pass** — no M2 implementation |

## Sign-off

**M1 shell + auth signed off** (12 Nov 2026, Europe/London). Remaining gap: optional same-browser recovery re-click when email quota allows or custom SMTP is added — **not blocking** per PO.

**Stopped before M2.**
