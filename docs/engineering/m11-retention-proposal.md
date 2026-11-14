# M11 — Retention / purge proposal (pending approval)

| Field | Value |
| --- | --- |
| Status | **Proposal only — purge behaviour remains disabled** |
| Against | PRS ACC-01 · §7.5–7.6 · §8.2 · G1.1-13 · Gate 1.1 / PRS §19 · M10 Option A |
| Working periods (Dominic direction, 14 Nov 2026) | **24 months** after challenge Completed/Cancelled for residual history; **90 days** for notification bodies |
| Asks | Approve deletion-audit period + confirm purge job may be built later |
| Date | 14 November 2026 |

## What already happens at deletion (approved Option A)

Documented in `m10-deletion-decision.md` — sessions revoked, identity tombstoned, memberships ended, shared amounts others were authorised to see retained as minimum history with actor anonymised, previously private figures remain absent from peers.

Purge of that residual history is **not implemented** until this proposal is approved.

## Working retention periods

| Class | Retain until | Then (after approval only) |
| --- | --- | --- |
| Residual contribution / amend / reverse bodies (incl. anonymised actors) | Challenge **Completed** or **Cancelled**, then **+ 24 months** | Delete or null monetary bodies; optional non-identifying audit stub |
| Weekly assessment rows for left/deleted members | Same terminal + **24 months** | Delete assessment rows for users with no active membership |
| Activity / milestone announcement history | Same terminal + **24 months** | Delete events for tombstoned / non-member actors (privacy-filtered peers already cannot see private ones) |
| Notification outbox bodies (`subject` / `body`) | **90 days** after `sent` or `failed` | Delete bodies; counts/status may remain |
| Rate-limit buckets | **7 days** sliding | Operational delete (non-personal) |
| Account deletion audit | See shortest useful period below | Trim to minimum fields or delete row |

## Deletion audit — minimum fields + shortest useful period

**Table:** `account_deletion_requests` (+ child `account_deletion_challenge_holds`).

**Minimum fields worth keeping for dispute / retry / Option A proof:**

| Field | Why |
| --- | --- |
| `id` | Correlate holds and logs |
| `user_id` | Link tombstoned auth user (already non-loginable) |
| `status` | `grace_pending` → `completed` / cancelled path |
| `requested_at` / `completed_at` / `grace_ends_at` | Timeline for grace and finalise |
| `detail` keys: revocation outcome, `sessions_revoked_at`, error if any | Prove dual-session revoke succeeded |
| Hold: `challenge_id`, `hold_kind`, `resolution`, `resolved_at` | Prove transfer vs cancel path |

Emails/passwords are **not** in this table (identity already tombstoned in Auth).

**Shortest useful period proposed: 180 days after `completed_at` (or request terminal status).**

Justification (engineering, not legal advice):

- Covers failed finalise / “revoking” retries and dual-session disputes well beyond the 7-day grace.
- Long enough for a private-beta support window without inventing multi-year compliance retention.
- Shorter than annual cycles; if Dominic needs tax/legal hold later, extend — do not invent 7 years here.

**Alternative if Dominic wants longer:** 13 months after completion. Not required for closed-lab disposable data.

## Effect of removing old records (after 24 months / 90 days)

Completed summaries, milestones, and privacy today are **derived from live tables** (contributions, assessments, activity/milestone rows, membership privacy flags) — not from a frozen export snapshot.

| If we purge… | Effect on product surfaces |
| --- | --- |
| Contribution bodies after terminal+24mo | Recomputed personal / sharing totals and completion summary amounts for that challenge would drop or zero for purged rows; “Deleted user” history would lose monetary detail |
| Milestone announcement rows | Activity/completion feeds would lose those historical milestone events (no re-announce; they simply disappear) |
| Assessment history | Streak/miss history for that challenge would shorten or empty for purged members |
| Privacy | Purging **previously private** residual does not newly expose figures (they were already omitted). Purging **shared** residual removes figures authorised members could still see in history — same privacy rules, less history |
| Notification bodies @ 90 days | Operators lose email text; membership decisions already recorded on memberships |
| Deletion audit @ 180 days | Lose Option A proof trail for that request; does not change live member dashboards |

**Therefore:** approve periods knowing completed-challenge archaeology after 24 months will thin out. If Dominic needs permanent completion certificates, that is a **separate** product feature (snapshot at complete) — not invented here.

## Explicit non-goals (still)

- **No purge job, cron, or SQL delete ships until Dominic approves this proposal.**
- No change to G1.1-06 live privacy behaviour.
- No shortening of M10 Option A 7-day ownership grace.

## Decision ask

1. Confirm **24 months** residual + **90 days** notification bodies (working direction above).
2. Confirm deletion-audit **180 days** after completion (or name another period).
3. After approval, authorise a later milestone to implement service_role purge — **not M11**.
