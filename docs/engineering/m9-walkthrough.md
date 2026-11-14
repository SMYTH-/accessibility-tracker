# M9 Walkthrough — Activity feed + completion

Connected path: **active challenge (Path B)** → **completed summary**.

## Setup

1. Branch `cursor/m9-activity-completion-6e9b` from M8 tip `3f19ad71`.
2. Apply migrations to `gdrkejobqlvtwnlaedpu`:
   - `supabase/migrations/20261113210000_m9_activity_completion.sql`
   - `supabase/migrations/20261113211000_m9_activity_feed_fix.sql`
   - `supabase/migrations/20261113212000_m9_feed_progress_cast.sql`
   - `supabase/migrations/20261113213000_m9_milestone_history_retention.sql`
3. `.env.local` with project URL, anon key, service role, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
4. `npm run dev` → `http://localhost:3000`.

## Path — Active → Completed

1. **Sign in as Alex** (approved owner, savings active, sharing).
2. **Home** — Path B order: personal progress → **Your streak** / this-week commitment → **Members** roster → Sharing members only → Activity preview. Record CTA enabled.
3. **Challenge** — Same Path B strip; own assessment history only in personal strip (not dumped on roster peers).
4. **Activity** — Full privacy-filtered feed: joins, contributions (sharing + self), commitment completions (no shared commitment figures), progress milestones 25/50/75/100% (retained after correction dips; no duplicate on re-cross), no streak awards. Opt-out hides others’ milestone announcements while the saver keeps own history.
5. **Sign in as Sam** — Feed shows Alex/Sam monetary events; private others absent; sharing total unchanged when a private member records.
6. **Pending / removed / unrelated** — `challenge_activity_feed` / dashboard RPCs return `MEMBERSHIP_REQUIRED` (no feed leak). Verified live via `evidence:m9:pg`.
7. **Complete** — End date passed + lifecycle tick → **Completed**.
8. **Home / Challenge** — Completion summary: personal eligible savings + milestones, participation counts, sharing-member totals, roster with privacy preserved, permitted activity including `challenge_completed`. **Read-only** badge; Record savings disabled.
9. **Rejected writes** — create / amend / reverse contribution → `CHALLENGE_READONLY`.
10. **Owner leave** — still blocked while Scheduled/Active (`OWNER_LEAVE_REQUIRES_TRANSFER`); transfer UX remains OPEN.

## Screenshots (live UI evidence, Dom Mac 13 Nov 2026)

| File | What |
| --- | --- |
| `media/m9/01-alex-home-path-b-active.png` | Active Path B home |
| `media/m9/02-alex-challenge-streak-roster-activity.png` | Streak → roster → activity |
| `media/m9/03-alex-activity-feed.png` | Full feed |
| `media/m9/04-sam-activity-no-private-leak.png` | Peer privacy-filtered feed |
| `media/m9/05-alex-completed-summary.png` | Completed summary (£500 / £900 sharing) |
| `media/m9/06-alex-completed-readonly.png` | Read-only boundary |

## Stop

**Stop before M10.** Do not invent pause schedules, streak awards, reopen/cancel, or ownership transfer / deletion fallback.
