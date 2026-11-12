# M1 Walkthrough — Shell, Auth, Profile

| Field | Value |
| --- | --- |
| Milestone | M1 only (stop before M2) |
| Baseline | Approved M0 + MVP plan lock at `96f723d` |
| Implementation commit | `83b2ce9` on `cursor/m1-shell-auth-962b` |
| Local preview | `http://localhost:3000` |
| Auth mode (this checkout) | **mock** — no `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` in env |
| Working accents | Deep Sea `#1A6B7C` · Honey Amber `#C9842A` (working only) |
| Nav | Provisional: Home · Challenge · Activity · Profile |

---

## Configured vs mocked

| Capability | Status |
| --- | --- |
| App shell + responsive mobile-first layout | **Real** (Next.js App Router) |
| Provisional bottom nav | **Real** |
| Register / verify / sign-in / sign-out / password reset | **Mock auth** when Supabase env vars are absent; **Supabase Auth** when both URL + anon key are set in `.env.local` |
| Verify + recovery email delivery (NOTIF-01) | **Mock:** time-limited tokens (1 hour) surfaced as on-page links (no SMTP). **Supabase:** provider emails when configured — **unverified** in this checkout without secrets |
| Display name profile | **Real** (mock store or Supabase `user_metadata.display_name`) |
| Challenge creation / invites / contributions | **Not built** (M2+) |

To enable managed auth later: copy `.env.example` → `.env.local`, add Supabase project URL + anon key, restart `npm run dev`. Optional `AUTH_MODE=mock` forces mock even with keys present.

---

## Flows (mock mode)

### 1. Account creation

1. Open `http://localhost:3000/sign-up`.
2. Enter display name, email, password (≥ 8 characters).
3. Submit **Create account**.
4. Success panel shows a **Verify email (mock link)** — token expires in 1 hour.

### 2. Email verification

1. Follow the mock verify link (or open `/verify-email?token=…`).
2. Click **Confirm email verification**.
3. Sign-in is blocked until this succeeds.

### 3. Sign-in

1. Open `/sign-in`.
2. Use verified email + password.
3. Invalid credentials are denied.
4. Success lands on `/home` (shell).

### 4. Protected routes (AUTH-01)

1. Sign out (or use a private window).
2. Visit `/challenge`, `/home`, `/activity`, or `/profile`.
3. Expect redirect to `/sign-in?next=…`.

### 5. Sign-out

1. Open **Profile**.
2. Click **Sign out**.
3. Session cookie cleared; protected routes redirect again.

### 6. Password reset

1. Open `/reset-password`, submit email.
2. Mock mode returns an on-page **Open recovery link** (1-hour token). Unknown emails get the same generic success copy (no account enumeration).
3. Set a new password on `/update-password?token=…`.
4. Sign in with the new password.
5. Expired/invalid tokens are rejected.

### 7. Profile (PROF-01)

1. Signed in → **Profile**.
2. Update **Display name** and save.
3. Profile shows email + verification flag only — **no financial data**.

---

## Acceptance results

See companion checklist: `docs/engineering/m1-acceptance.md` (mirrored in Project Context).

---

## Explicit stop

**M1 complete for local preview. Stopped before M2** (no challenge create / lifecycle UI or APIs).
