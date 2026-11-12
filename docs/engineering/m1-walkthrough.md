# M1 Walkthrough — Shell, Auth, Profile

| Field | Value |
| --- | --- |
| Milestone | M1 only (stop before M2) |
| Baseline | Approved M0 + MVP plan lock at `96f723d` |
| Branch | `cursor/m1-shell-auth-962b` |
| Local preview | `http://localhost:3000` |
| Auth mode (this checkout) | **mock** until Dominic supplies non-prod Supabase config (no `.env.local` yet) |
| Working accents | Deep Sea `#1A6B7C` · Honey Amber `#C9842A` (working only) |
| Nav | Provisional: Home · Challenge · Activity · Profile |

---

## Configured vs mocked

| Capability | Status |
| --- | --- |
| App shell + responsive mobile-first layout | **Real** (Next.js App Router) |
| Provisional bottom nav | **Real** |
| Register / verify / sign-in / sign-out / password reset | **Mock** without env; **Supabase Auth** when URL + anon key set |
| Verify + recovery email delivery (NOTIF-01) | **Mock:** on-page 1h tokens. **Supabase:** blocked until non-prod project + env + dashboard redirects configured |
| Display name profile | **Real** (mock store or Supabase `user_metadata.display_name`) |
| Challenge creation / invites / contributions | **Not built** (M2+) |

---

## Recovery redirect (finding + fix)

**Finding:** `resetPasswordForEmail` previously set `redirectTo` to `/update-password`. Code exchange only lives on `/auth/callback`. From a **signed-out** browser, the recovery email therefore landed on the password form **without** a session, so `updateUser({ password })` could not succeed.

**Fix:** Recovery now redirects to:

`/auth/callback?next=/update-password`

Flow: email link → exchange `code` for session on callback → continue to update-password → set password → sign out → sign in with new password.

Safety net: if an older email still hits `/update-password?code=…`, that page redirects into `/auth/callback` with the same `next`.

---

## What Dominic must configure (non-prod Supabase)

Do **not** paste secret values into chat. Create local `.env.local` (gitignored) or use Cursor secrets if you later publish the app.

### A. Supabase project (non-production)

1. Create or pick a **non-prod** Supabase project (dev/staging — not production).
2. Auth → Providers → **Email** enabled.
3. Prefer **Confirm email** enabled so verification is exercised.
4. Auth → URL configuration:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs allow list** (add all):
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/callback?next=/update-password`
     - or wildcard `http://localhost:3000/**`
5. Email: built-in Supabase email is enough for a local check (rate-limited), **or** configure custom SMTP for reliable delivery.
6. Optional: review Auth email templates so links use the Site URL / redirect allow list (default templates with `{{ .ConfirmationURL }}` / `{{ .RedirectTo }}` are fine).

### B. Local env (machine only)

In `~/Local Sites/accessibility-tracker/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=<project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/public key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then restart `npm run dev`. Leave `AUTH_MODE` unset (or not `mock`).

Env var names the app expects: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `NEXT_PUBLIC_SITE_URL`, optional `AUTH_MODE=mock`.

### C. Access needed to run the live suite

| Need | Why |
| --- | --- |
| Non-prod project URL + anon key in `.env.local` | Switch app from mock → Supabase |
| Inbox the agent/Dominic can read for the test account | Click verify + recovery links |
| Dashboard confirm of Site URL + redirect allow list | Email links must be accepted |
| Dev server on localhost:3000 | Same origin as Site URL |

Once `.env.local` exists on this machine, say the word and the live suite can be re-run (signed-out browser: register → verify email → sign-in → protected routes → profile → sign-out → recovery → new password works / old fails).

---

## Flows (mock mode — available now)

### 1–7 (unchanged mock path)

1. **Create account** `/sign-up` → mock verify link.
2. **Verify** `/verify-email?token=…`.
3. **Sign in** `/sign-in`.
4. **Protected routes** unsigned → `/sign-in?next=…`.
5. **Sign out** Profile.
6. **Reset** `/reset-password` → mock recovery link → `/update-password?token=…`.
7. **Profile** display name only; no financial fields.

### Supabase mode (when configured)

1. Register → check inbox → confirmation link → `/auth/callback` → home or sign-in.
2. Sign in → `/home`, `/challenge`, etc.
3. Profile display name update.
4. Sign out.
5. Reset password → inbox → `/auth/callback?next=/update-password` → new password → sign in with **new** (old must fail).

---

## Acceptance results

See `docs/engineering/m1-acceptance.md` (Project Context mirror).

---

## Callback failure (live) + fix

First verification click hit `/sign-in?error=auth_callback` even though Supabase marked the email confirmed. Root causes addressed:

1. **PKCE:** signup/reset now start on the **browser** client so `code_verifier` cookies exist for `/auth/callback`.
2. **Callback cookies:** session cookies are written onto the **redirect response**.
3. **Host:** always use `http://localhost:3000` (Site URL), not `127.0.0.1`, so cookies match.

## Explicit stop

**M1 remains open for Supabase verification.** No M2 / challenge creation.
