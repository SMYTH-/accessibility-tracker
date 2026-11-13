# Accountability Tracker

Mobile-first web app for private savings challenges (product docs under `docs/`).

## M7 status

Milestone **M7** (financial privacy settings + two-account E2E) on tip of signed-off M6 (`55198423`).

- Profile → **Financial privacy**: one **Hide monetary information (opt-out)** control per approved challenge
- Default: visible to approved members; cannot-undo warning; ack required before Save
- Server RPC `set_own_share_monetary_info` enforces opt-out; reads omit private amounts/targets for others
- Re-opt-in and small-group suppression remain **OPEN** (deferred / not invented)
- Target editing remains parked (M4); weekly assessment / streak → M8
- **Stop before M8**

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure `.env.local` from `.env.example` (URL + anon key; optional service role for ticks/scripts). Do not commit secrets. Apply M7 migrations under `supabase/migrations/` for live Postgres.

```bash
npm run smoke:m7
npm run evidence:m7:pg
npm run evidence:m7:ui
```

## Docs

| Doc | Path |
| --- | --- |
| M7 walkthrough | `docs/engineering/m7-walkthrough.md` |
| M7 acceptance | `docs/engineering/m7-acceptance.md` |
| M6 walkthrough | `docs/engineering/m6-walkthrough.md` |
| M6 acceptance | `docs/engineering/m6-acceptance.md` |
