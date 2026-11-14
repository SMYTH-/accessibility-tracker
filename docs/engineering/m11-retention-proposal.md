# M11 — Retention / purge proposal

| Field | Value |
| --- | --- |
| Status | **Approved for planning** (Dominic, 14 November 2026) — **purge behaviour remains disabled** |
| Against | PRS ACC-01 · §7.5–7.6 · §8.2 · G1.1-13 · Gate 1.1 / PRS §19 · M10 Option A |
| Approved periods | **24 months** after challenge Completed/Cancelled for residual history; **90 days** for notification bodies; **180 days** after a deletion request reaches a **terminal** state for the minimum deletion audit record |
| Not authorised | Implementing purge jobs, cron, or SQL deletes |
| Date | 14 November 2026 |

## What already happens at deletion (approved Option A)

Documented in `m10-deletion-decision.md` — sessions revoked, identity tombstoned, memberships ended, shared amounts others were authorised to see retained as minimum history with actor anonymised, previously private figures remain absent from peers.

## Approved retention periods (planning lock)

| Class | Retain until | Then (only after a future purge implementation is authorised) |
| --- | --- | --- |
| Residual contribution / amend / reverse bodies (incl. anonymised actors) | Challenge **Completed** or **Cancelled**, then **+ 24 months** | Delete or null monetary bodies; optional non-identifying audit stub |
| Weekly assessment rows for left/deleted members | Same terminal + **24 months** | Delete assessment rows for users with no active membership |
| Activity / milestone announcement history | Same terminal + **24 months** | Delete events for tombstoned / non-member actors |
| Notification outbox bodies (`subject` / `body`) | **90 days** after `sent` or `failed` | Delete bodies; counts/status may remain |
| Rate-limit buckets | **7 days** sliding (operational) | Operational delete (non-personal) |
| Account deletion audit (minimum record) | **180 days** after the deletion request reaches a **terminal** state (`completed` / cancelled path as recorded) | Trim to minimum fields or delete row |

## Deletion audit — minimum fields (unchanged)

**Table:** `account_deletion_requests` (+ child `account_deletion_challenge_holds`).

| Field | Why |
| --- | --- |
| `id` | Correlate holds and logs |
| `user_id` | Link tombstoned auth user (already non-loginable) |
| `status` | Path to terminal state |
| `requested_at` / `completed_at` / `grace_ends_at` | Timeline for grace and finalise |
| `detail` keys: revocation outcome, `sessions_revoked_at`, error if any | Prove dual-session revoke succeeded |
| Hold: `challenge_id`, `hold_kind`, `resolution`, `resolved_at` | Prove transfer vs cancel path |

## Effect of removing old records (after periods elapse)

Completed summaries, milestones, and privacy today are **derived from live tables**. After a future authorised purge:

| If we purge… | Effect |
| --- | --- |
| Contribution bodies after terminal+24mo | Recomputed totals / completion summary amounts thin or zero for purged rows |
| Milestone announcement rows | Feeds lose those historical events |
| Assessment history | Streak/miss history shortens for purged members |
| Privacy | Previously private residual stays non-exposing; shared residual history shrinks for authorised viewers |
| Notification bodies @ 90 days | Operators lose email text; membership rows remain |
| Deletion audit @ 180 days after terminal | Lose Option A proof trail for that request; live dashboards unchanged |

## Explicit non-goals (still)

- **No purge job, cron, or SQL delete ships until a separate implementation approval.**
- No change to G1.1-06 live privacy behaviour.
- No shortening of M10 Option A 7-day ownership grace.

## Next step (not M11)

When Dominic authorises implementation: service_role scheduled purge matching the periods above, with regression against completion summary / milestone / privacy surfaces.
