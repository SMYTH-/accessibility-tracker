# Accountability Tracker

Mobile-first web app for private savings challenges (product docs under `docs/`).

## M8 status

Milestone **M8** (weekly commitment assessment, Your streak, recovery) on tip of signed-off M7 (`8424ebea`).

- Deterministic weekly assessment in challenge TZ (Mon–Sun); Completed / Missed / In progress / Paused distinct
- Monday activation → current week; Tue–Sun → following Monday; pre-assessment → personal progress only
- Open week: progress + completion; miss only after week closes
- **Your streak** personal only; miss → next completed week starts a new streak automatically
- Amend/reverse recomputes assessments + streak; audit retained
- Commitment amounts + assessment details in member’s own view; M7 privacy preserved
- Pause scheduling / streak awards remain **OPEN** (not invented)
- **Stop before M9**

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure `.env.local` from `.env.example` (URL + anon key; optional service role for ticks/scripts). Do not commit secrets. Apply M8 migrations under `supabase/migrations/` for live Postgres.

```bash
npm run smoke:m8
npm run evidence:m8:pg
npm run evidence:m8:ui
```

## Docs

| Doc | Path |
| --- | --- |
| M8 walkthrough | `docs/engineering/m8-walkthrough.md` |
| M8 acceptance | `docs/engineering/m8-acceptance.md` |
| M7 walkthrough | `docs/engineering/m7-walkthrough.md` |
| M7 acceptance | `docs/engineering/m7-acceptance.md` |
