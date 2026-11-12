# M2 Walkthrough — Challenge create & lifecycle

| Field | Value |
| --- | --- |
| Milestone | M2 only (stop before M3) |
| Plan baseline | `eceed9a` — `docs/engineering/m2-challenge-plan.md` |
| M1 base | `cursor/m1-shell-auth-962b` / PR #2 tip `318d490` |
| Branch | `cursor/m2-challenge-lifecycle-25cb` |
| Local preview | `http://localhost:3000` |
| Auth for UI shots | **mock** (`AUTH_MODE=mock` + `NEXT_PUBLIC_AUTH_MODE=mock`) |
| Persistence | Local file store `.data/challenges.json` (gitignored) |
| Working accents | Deep Sea `#1A6B7C` · Honey Amber `#C9842A` (working only) |
| Screenshots | `media/m2/` (repo + Project store) |

---

## What shipped

| Capability | Status |
| --- | --- |
| Signed-in create private challenge (name, start/end, currency, TZ, optional description) | **Real** |
| Atomic challenge + approved owner membership | **Real** |
| Owner create before savings (no target/commitment on create) | **Real** |
| Reject past start; end must follow start | **Real** |
| Future start → **Scheduled**; start = today (challenge TZ) → **Active** | **Real** |
| Scheduled → Active at local midnight on start; Active → Completed at local midnight after end | **Real** (reconcile on read + `GET/POST /api/challenges/lifecycle-tick`) |
| Lifecycle audit trail | **Real** |
| Record-savings gate (Active **and** savings-active member) | **Real** (UI gated; no M5 record flow) |
| Cancel / invites / savings setup | **Not built** (out of M2) |

---

## Local preview

```bash
cd ~/Local\ Sites/accessibility-tracker
npm install
# Mock auth (recommended for quick create demo even if .env.local has Supabase):
AUTH_MODE=mock NEXT_PUBLIC_AUTH_MODE=mock npm run dev -- -p 3000
```

Open [http://localhost:3000](http://localhost:3000).

1. Sign up → mock verify → sign in.
2. Home → **Create challenge** (or Challenge tab → Create).
3. Step through Details → Schedule (currency + TZ) → Review → Create.
4. Lands on **challenge overview** with status badge, membership, gated record-savings, audit.

Lifecycle smoke (no browser):

```bash
npm run smoke:m2
```

UI screenshots:

```bash
node scripts/m2-screenshots.mjs
```

---

## Screenshot index

| File | Shows |
| --- | --- |
| `media/m2/01-home-create-cta.png` | Home create CTA |
| `media/m2/02-create-step-details.png` | Name + description; savings deferral note |
| `media/m2/03-create-step-schedule.png` | Start/end, currency, time zone |
| `media/m2/04-create-step-review.png` | Review before submit |
| `media/m2/05-overview-scheduled.png` | Future start → Scheduled; owner approved; savings inactive |
| `media/m2/06-reject-past-start.png` | Past start rejected with clear error |
| `media/m2/07-overview-active.png` | Start = today → Active; record gated on M4 setup |
| `media/m2/08-challenge-list.png` | Challenge list with status badges |

---

## Persistence note

M2 uses a durable **local JSON store** (same pragmatic pattern as M1 mock auth) so create + lifecycle work without a product Postgres migration. Schema shape matches m0 entities (challenge, membership, lifecycle audit). Postgres/Drizzle remains the architecture target for later wiring — **flagged** as not yet the system-of-record DB.

---

## Explicit stops

- No cancel UX/API.
- No invites / join / disclosure (M3).
- No target / weekly commitment activation UI (M4).
- No contribution recording UI (M5).
