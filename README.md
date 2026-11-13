# Accountability Tracker

Mobile-first web app for private savings challenges (product docs under `docs/`).

## M4 status

Milestone **M4** (personal savings target + weekly commitment setup) on tip of signed-off M3 (`dda5e603`).

- Working accents only: Deep Sea `#1A6B7C` · Honey Amber `#C9842A`
- Approved members (incl. owner) activate with positive target + weekly commitment (challenge currency, minor units)
- Server-side membership + validation (RPC / service)
- Incomplete setup → savings inactive; no missed-week assessment; record gated
- First assessed week: Monday = current week; Tue–Sun = following Monday (challenge TZ)
- G1.1-10 prospective target-change baseline + audit
- **Stop before M5** — no contribution recording

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure `.env.local` from `.env.example` (URL + anon key; optional service role for ticks/scripts). Do not commit secrets. Apply `supabase/migrations/20261113120000_m4_savings_setup.sql` for live Postgres.

```bash
npm run smoke:m4
npm run evidence:m4:pg
npm run evidence:m4:ui
```

## Docs

| Doc | Path |
| --- | --- |
| M4 walkthrough | `docs/engineering/m4-walkthrough.md` |
| M4 acceptance | `docs/engineering/m4-acceptance.md` |
| M3 walkthrough | `docs/engineering/m3-walkthrough.md` |
| M3 acceptance | `docs/engineering/m3-acceptance.md` |
