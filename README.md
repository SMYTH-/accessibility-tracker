# Accountability Tracker

Mobile-first web app for private savings challenges (product docs under `docs/`).

## M5 status

Milestone **M5** (self-reported contribution record / amend / reverse) on tip of signed-off M4 (`072dd66`).

- Working accents only: Deep Sea `#1A6B7C` · Honey Amber `#C9842A`
- Active challenge + completed savings setup required to record
- Contribution date = today in challenge TZ; labelled self-reported; integer minor units
- Idempotent create; amend/reverse with audit; original date and week preserved
- Eligible totals for later milestones; pre-assessment amounts → personal progress only
- **Stop before M6** — no sharing-member dashboard totals UI

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure `.env.local` from `.env.example` (URL + anon key; optional service role for ticks/scripts). Do not commit secrets. Apply M5 migrations under `supabase/migrations/` for live Postgres.

```bash
npm run smoke:m5
npm run evidence:m5:pg
npm run evidence:m5:ui
```

## Docs

| Doc | Path |
| --- | --- |
| M5 walkthrough | `docs/engineering/m5-walkthrough.md` |
| M5 acceptance | `docs/engineering/m5-acceptance.md` |
| M4 walkthrough | `docs/engineering/m4-walkthrough.md` |
| M4 acceptance | `docs/engineering/m4-acceptance.md` |
