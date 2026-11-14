# Accountability Tracker

Mobile-first web app for private savings challenges (product docs under `docs/`).

## M3 status

Milestone **M3** (invitations, membership, join disclosure) on **Supabase Auth + Postgres** (`gdrkejobqlvtwnlaedpu` non-prod), on tip of signed-off M2 (`27404a6b`).

- Working accents only: Deep Sea `#1A6B7C` · Honey Amber `#C9842A`
- Owner invite links: default 7-day expiry, revocable; server-enforced
- Invite preview: name, description, start, end, participant count only
- PRIV-01 disclosure + ack before request-join (UI + server)
- Owner approve/decline; pending/declined have no financial access
- Approval leaves savings inactive; no duplicate memberships; safe retries
- NOTIF-01 approve/reject emails recorded in `notification_outbox`
- Leave / remove revoke access immediately; owner leave blocked on Scheduled/Active (transfer OPEN)
- **Stop before M4** — no savings setup, contributions, aggregates, or cancel

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure `.env.local` from `.env.example` (URL + anon key; optional service role for ticks/scripts). Do not commit secrets.

```bash
npm run smoke:m3
npm run evidence:m3:pg
npm run evidence:m3:ui
```

## Docs

| Doc | Path |
| --- | --- |
| M3 walkthrough | `docs/engineering/m3-walkthrough.md` |
| M3 acceptance | `docs/engineering/m3-acceptance.md` |
| M2 walkthrough | `docs/engineering/m2-walkthrough.md` |
| M2 acceptance | `docs/engineering/m2-acceptance.md` |
| MVP build plan | `docs/engineering/mvp-build-plan.md` |
| M0 architecture | `docs/engineering/m0-architecture.md` |
