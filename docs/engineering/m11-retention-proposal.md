# M11 — Retention / purge proposal (pending approval)

| Field | Value |
| --- | --- |
| Status | **Proposal only — purge behaviour not implemented** |
| Against | PRS ACC-01 · §7.5–7.6 · §8.2 · G1.1-13 · Gate 1.1 / PRS §19 · M10 Option A |
| Asks | Dominic approval of calendar periods before any purge job ships |
| Date | 13 November 2026 |

## What already happens at deletion (approved Option A)

Documented in `m10-deletion-decision.md` — sessions revoked, identity tombstoned, memberships ended, shared amounts others were authorised to see retained as minimum history with actor anonymised, previously private figures remain absent from peers.

**Still OPEN:** multi-year calendar for when anonymised residual history may be purged.

## Residual classes that need a calendar

| Class | Where it lives | Who can still see it | Proposed default (for approval) |
| --- | --- | --- | --- |
| Anonymised contribution / amend / reverse rows after member leave or account deletion | `contributions` + audit | Remaining authorised challenge members (privacy-filtered) | Retain while challenge is Active/Scheduled; after challenge **Completed** or **Cancelled**, retain **24 months**, then purge row amounts to null / delete contribution bodies while keeping non-identifying aggregate audit stubs if needed for integrity |
| Weekly assessment history for deleted/left members | `weekly_commitment_assessments` + audit | Own rows gone with access; peer never saw private assessment detail | Same as challenge terminal + **24 months**, then delete assessment rows for users with no active membership and tombstoned/deleted accounts |
| Activity / milestone announcement history | activity feed tables / milestone announcements | Privacy-filtered; Deleted user label | Terminal challenge + **24 months**, then delete events whose actor is tombstoned and no longer an approved member |
| Notification outbox | `notification_outbox` | Operators / service role | **90 days** after `sent`/`failed`, then delete bodies; keep count metrics only if needed |
| Account deletion request audit | `account_deletion_requests` / holds | Service role | Retain **7 years** (account/security audit) — proposed; not invented as legal advice |
| Rate-limit buckets | `action_rate_buckets` | n/a | **7 days** sliding — operational only |

## Explicit non-goals (do not implement until approved)

- No automated purge job, cron, or SQL delete of residual history in this milestone.
- No change to live sharer totals / G1.1-06 behaviour.
- No shortening of M10 Option A 7-day ownership grace.

## Decision ask for Dominic

1. Accept **24 months post-terminal-challenge** for anonymised monetary/assessment/activity residual history, **or** name different periods.
2. Accept **90 days** for notification bodies and **7 years** for deletion-request audit, **or** name different periods.
3. Confirm purge may run as a **service_role scheduled job** after approval (separate implementation milestone).

Until approved: residual anonymised history remains retained indefinitely under Option A minimum-history rules.
