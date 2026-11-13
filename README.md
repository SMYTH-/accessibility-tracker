# Accountability Tracker

Mobile-first web app for private savings challenges (product docs under `docs/`).

## M6 status

Milestone **M6** (personal dashboard + sharing-member totals) on tip of signed-off M5 (`e22f76f`).

- Working accents only: Deep Sea `#1A6B7C` · Honey Amber `#C9842A`
- Home: personal progress (self-reported) → separate milestone recognition → weekly strip + **Your streak** (calc deferred to M8) → **Sharing members only** → activity preview → Record savings
- Sharing totals computed server-side from eligible contributions + targets of approved members who currently share monetary information
- G1.1-06-R1 privacy suite with real Supabase sessions; privacy-state fixtures (settings UX → M7)
- Target editing remains parked (M4); weekly assessment / streak → M8
- **Stop before M7**

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure `.env.local` from `.env.example` (URL + anon key; optional service role for ticks/scripts). Do not commit secrets. Apply M6 migrations under `supabase/migrations/` for live Postgres.

```bash
npm run smoke:m6
npm run evidence:m6:pg
npm run evidence:m6:ui
```

## Docs

| Doc | Path |
| --- | --- |
| M6 walkthrough | `docs/engineering/m6-walkthrough.md` |
| M6 acceptance | `docs/engineering/m6-acceptance.md` |
| M5 walkthrough | `docs/engineering/m5-walkthrough.md` |
| M5 acceptance | `docs/engineering/m5-acceptance.md` |
