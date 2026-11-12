# Accountability Tracker

Mobile-first web app for private savings challenges (product docs under `docs/`).

## M2 status

Milestone **M2** (create private challenge + lifecycle) is implemented on this branch, on top of signed-off M1.

- Working accents only: Deep Sea `#1A6B7C` · Honey Amber `#C9842A`
- Create: name, start/end, currency, time zone, optional description
- Atomic owner + approved membership; savings participation deferred
- Lifecycle: future → Scheduled; today → Active; past start rejected; midnight transitions in challenge TZ
- **Stop before M3** — no cancel, invites, or savings setup UI

## Local preview

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Auth: Supabase when `NEXT_PUBLIC_SUPABASE_*` is set; otherwise **local mock**. Challenge data persists in `.data/challenges.json` (gitignored).

```bash
npm run smoke:m2
```

## Docs

| Doc | Path |
| --- | --- |
| M2 plan (activation lock) | `docs/engineering/m2-challenge-plan.md` |
| M2 walkthrough | `docs/engineering/m2-walkthrough.md` |
| M2 acceptance | `docs/engineering/m2-acceptance.md` |
| M1 walkthrough | `docs/engineering/m1-walkthrough.md` |
| M0 architecture | `docs/engineering/m0-architecture.md` |
| MVP build plan | `docs/engineering/mvp-build-plan.md` |
