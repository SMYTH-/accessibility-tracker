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

## Final same-browser acceptance @ `9df6665` (authoritative)

**Rules:** fresh account · real inbox links only · **same browser that started each flow** · recovery starts **signed out** · never paste links into chat · no admin-generated substitute links.

| Step | Result | Notes |
| --- | --- | --- |
| Fresh register | **Pass** | `smyth.developer+m1final@gmail.com` / dominicjsmyth · Chrome · `localhost:3000` |
| Verification email delivery | **Pass** | Dominic opened real inbox link (same Chrome) |
| **Verify callback outcome** | **Pass** | Landed **`http://localhost:3000/home`** (session established; not `error=auth_callback`) |
| Signed in on Home | **Pass** | Reported signed in as dominicjsmyth |
| Sign-out → recovery request (signed out) | **Awaiting Dominic** | Same Chrome |
| Recovery email delivery | **Awaiting** | |
| **Recovery callback outcome** | **Awaiting** | Expect `/update-password` **with password form** · **fail if** `/sign-in?error=auth_callback` |
| New password works | **Awaiting** | |
| Old password fails | **Awaiting** | |

### Callback outcomes

| Callback | Expected | Observed |
| --- | --- | --- |
| Email verification (`/auth/callback`) | Session established; continue to app (e.g. `/home`) | **Pass → `/home`** |
| Password recovery (`/auth/callback?next=/update-password`) | Session established; **password form** on `/update-password` | _pending same-browser click_ |

### Part B — Dominic next (same Chrome)

1. **Sign out** (Profile → Sign out).
2. While **signed out**, open **Reset password**, submit `smyth.developer+m1final@gmail.com`.
3. In **that same Chrome**, open Gmail and click the **recovery** link — do **not** paste the link into chat.
4. Reply with **recovery callback outcome** (path only): expect `/update-password` with the new-password form (or report `/sign-in?error=auth_callback` if it fails).
5. Set a **new** password → sign in with **new** (must work) → confirm **old** fails.

## Prior notes (not this gate)

- Built-in mailer hard cap **2 emails/hour**; cannot raise without custom SMTP.
- Earlier automation/admin-assisted recovery is **not** this final gate.

## Checklist (status after final gate)

| Check | Result |
| --- | --- |
| Unauthenticated protected routes — AUTH-01 | Pending (confirm after sign-out) |
| Invalid credentials / time-limited recovery — AUTH-01 | Pending recovery proof |
| Profile no financial data — PROF-01 | Pass (unchanged surface) |
| Verify + recovery emails deliver — NOTIF-01 | Verify **Pass**; recovery pending |
| Responsive shell — §10.2 | Pass |
| Working accents only — §0 | Pass |
| Register / verify / sign-in / sign-out | Register + verify **Pass**; sign-out pending Part B |
| Display name profile | Pass (dominicjsmyth observed) |
| Provisional nav | Pass |
| Recovery → password form; new works / old fails | Pending |
| Stop before M2 | **Pass** — M2 untouched |

## Explicit stop

**M1 open — verify callback Pass; awaiting Dominic recovery click (Part B).** **Stopped before M2.**
