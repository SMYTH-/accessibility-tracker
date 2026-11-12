# M2 Walkthrough — Challenge create & lifecycle (Postgres)

| Field | Value |
| --- | --- |
| Milestone | M2 only (stop before M3) |
| Plan baseline | `eceed9a` — `docs/engineering/m2-challenge-plan.md` |
| M1 base | `cursor/m1-shell-auth-962b` / PR #2 tip `318d490` |
| Branch | `cursor/m2-challenge-lifecycle-25cb` |
| Local preview | `http://localhost:3000` |
| Auth | **Supabase** against non-prod `gdrkejobqlvtwnlaedpu` (`.env.local` local-only) |
| Persistence | **Supabase Postgres** (atomic RPC + RLS) |
| Working accents | Deep Sea `#1A6B7C` · Honey Amber `#C9842A` (working only) |
| Screenshots | `media/m2/` (repo + Project store) |

---

## What shipped

| Capability | Status |
| --- | --- |
| Signed-in create private challenge | **Real** (Supabase session + Postgres) |
| Atomic challenge + approved owner membership (one transaction) | **Real** (`create_private_challenge`) |
| Failed membership → no orphan challenge | **Proven** (rollback helper RPC) |
| Second user cannot access private challenge | **Proven** (RLS + UI) |
| Persist across app restart | **Proven** |
| TZ midnight Scheduled/Active/Completed | **Real** (`reconcile_challenge_lifecycles`) |
| Owner create before savings | **Real** |
| Cancel / invites / savings setup | **Not built** (out of M2) |

---

## Local preview (Supabase)

```bash
cd ~/Local\ Sites/accessibility-tracker
# .env.local already holds URL + anon (+ optional service role for ticks/scripts)
npm install
npm run dev -- -p 3000
```

Open [http://localhost:3000](http://localhost:3000). Sign in with a confirmed Supabase user, then **Create challenge**.

Evidence scripts (never print secrets):

```bash
node --env-file=.env.local scripts/m2-postgres-evidence.mjs
node scripts/m2-supabase-ui-evidence.mjs
npm run smoke:m2   # offline helper + mock-store unit path
```

---

## Screenshot index

| File | Shows |
| --- | --- |
| `01`–`08` | Earlier mock-auth create flow (accepted for UX) |
| `09-supabase-home.png` | Home after **real Supabase sign-in** |
| `10-supabase-overview-scheduled.png` | Created challenge overview (Scheduled) |
| `11-supabase-other-user-denied.png` | Second signed-in user denied |
| `12-supabase-persist-after-relogin.png` | Same challenge after fresh browser session |

---

## Explicit stops

- No cancel UX/API.
- No invites / join / disclosure (M3).
- No target / weekly commitment activation UI (M4).
- No contribution recording UI (M5).
