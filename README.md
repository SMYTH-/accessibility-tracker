# Accountability Tracker

Mobile-first web app for private savings challenges (product docs under `docs/`).

## M1 status

Milestone **M1** (shell + managed email auth + profile) is implemented on this branch.

- Working accents only: Deep Sea `#1A6B7C` · Honey Amber `#C9842A`
- Provisional nav: Home · Challenge · Activity · Profile
- Auth: Supabase when `NEXT_PUBLIC_SUPABASE_*` is set; otherwise **local mock** (see `docs/engineering/m1-walkthrough.md`)
- **Stop before M2** — no challenge creation

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional real auth: copy `.env.example` → `.env.local` and add Supabase URL + anon key.

## Docs

| Doc | Path |
| --- | --- |
| M0 architecture | `docs/engineering/m0-architecture.md` |
| MVP build plan | `docs/engineering/mvp-build-plan.md` |
| M1 walkthrough | `docs/engineering/m1-walkthrough.md` |
| M1 acceptance | `docs/engineering/m1-acceptance.md` |
