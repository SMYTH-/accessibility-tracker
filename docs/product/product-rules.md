# Product Rules

Sources:

- Product Specification v1.0 (Gate 1 Approved, 11 November 2026) — frozen baseline
- Gate 1.1 Product Rules Amendment (Approved, 11 November 2026) — authoritative for G1.1-01 … G1.1-14

**Precedence:** Where the amendment is more specific than the parent PRS for a behaviour it addresses, the amendment governs. Derived documents must not invent missing product rules.

Status: reconciled to Gate 1.1. Implementation is **not authorised**.

---

## Gate 1.1 Approved Product Rules

### G1.1-01 — Challenge Owner Participation

Refs: Amendment G1.1-01; PRS §4.2, CHAL-01.

- The challenge creator automatically becomes the challenge owner **and** an approved participant.
- The owner has the same savings capabilities as other participants, plus challenge administration permissions.
- The owner is **not** required to configure a personal savings target or weekly commitment during initial challenge creation.
- The owner may create the challenge, configure it and invite friends before activating their own savings participation.
- An owner without an activated savings commitment must **not** be counted as having completed or missed weekly commitments.
- A challenge may exist with only its owner before other participants join.
- Ownership permissions are distinct from savings participation status.
- The owner cannot record savings until individual participation setup is complete.

### G1.1-02 — Challenge Lifecycle

Refs: Amendment G1.1-02; PRS §4.1, §8.4.

States:

| State | Meaning |
| --- | --- |
| **Draft** | Created but not yet ready for participation. |
| **Scheduled** | Configured and awaiting the start date. |
| **Active** | Within its configured participation period. |
| **Completed** | Challenge period has ended. |
| **Cancelled** | Explicitly terminated; terminal state. |

Rules:

- Lifecycle status is distinct from individual participation status.
- Every challenge has exactly one valid lifecycle status.
- A challenge cannot become active for savings participation until required configuration is valid.
- Completed and cancelled challenges do not accept ordinary new contributions.
- Detailed transition validation, including cancellation and edge cases, is **OPEN — requires product-owner approval** before implementation.

### G1.1-03 — Mandatory Weekly Commitments

Refs: Amendment G1.1-03; PRS GOAL-02, GAME-01.

- Every **active savings participant** must have a positive weekly savings commitment.
- Weekly commitments are **mandatory** for active participation, not optional.
- Participants who have not completed savings setup are **not** assessed for streaks or missed commitments.
- Commitment values may differ between participants.
- Commitments are evaluated according to the challenge’s configured time zone.
- Exact weekly commitment boundaries, partial first/final weeks, and commitment amount change rules remain **OPEN — requires product-owner approval.**

### G1.1-04 — Mandatory Individual Targets

Refs: Amendment G1.1-04; PRS GOAL-01, §4.3.

- Every **active savings participant** must have an individual savings target.
- Targets are independent and may differ between members.
- A target must be configured before savings participation becomes active.
- The owner may defer this configuration until after challenge creation (see G1.1-01).
- An approved member awaiting target configuration cannot record savings.
- Missing target configuration does not create missed commitments.
- Members cannot modify other participants’ targets.

### G1.1-05 — Eligible Savings Contributions

Refs: Amendment G1.1-05; PRS SAVE-01, SAVE-02, §4.4, §8.4.

An **eligible contribution** is a valid, authorised, non-reversed, self-reported savings entry associated with an active participant and dated within the challenge’s permitted savings period.

Rules:

- Eligible contributions contribute to personal progress and applicable commitment calculations.
- Contributions must not be interpreted as verified bank deposits.
- Invalid, reversed, unauthorised or out-of-period entries must not contribute to progress.
- Corrections trigger recalculation of affected results.
- Precise treatment of backdating, excess contributions, correction timing and allocation to weekly periods is **OPEN — requires product-owner approval.**

### G1.1-06 — Financial Privacy and Group Totals

Refs: Amendment G1.1-06; PRS PRIV-01, §4.4, §7.2.

- Opting out of sharing monetary information hides **both** individual reported savings amounts **and** the individual savings target from other members.
- Private monetary values must not be included in financial aggregates shown to other challenge members.
- Visible group totals must represent only contributions and targets of members sharing monetary information.
- The interface must clearly label these totals as **visible-member totals**, not complete group totals.
- Private members may still appear in participant lists.
- Nonfinancial participation information may be displayed only where it does not disclose or allow reliable inference of hidden monetary values.
- The user’s own private information remains visible to that user.
- Privacy is enforced server-side; activity feeds, exports and notifications respect visibility settings.
- Hidden monetary values cannot be reconstructed through aggregate differences or other exposed data.
- Small-group aggregate privacy edge cases remain **OPEN — requires product-owner approval.**

### G1.1-07 — Invitation Preview

Refs: Amendment G1.1-07; PRS CHAL-02, CHAL-03, §8.1, Journey B.

An invitee who is not yet approved may view only:

- Challenge name
- Description
- Start date
- End date
- Participant count

Must **not** expose: individual savings targets, contribution amounts, financial group totals, member financial activity, or private member profile information.

Invitation does not bypass owner approval or financial visibility acknowledgement.

### G1.1-08 — Progress Milestones

Refs: Amendment G1.1-08; PRS §6.1, DASH-01, SOC-01, GAME-01.

- MVP personal progress milestones: **25%, 50%, 75% and 100%** of individual target.
- MVP also recognises weekly commitment streak milestones.
- Progress milestones are based on eligible self-reported contributions.
- Must not encourage exceeding financial means.
- Exact streak milestone thresholds and treatment of corrected or reduced progress remain **OPEN — requires product-owner approval.**

### G1.1-09 — Recovery After Missed Commitments

Refs: Amendment G1.1-09; PRS GAME-01, §6.3, Journey E.

- A missed commitment remains historical.
- After a missed week, the participant **automatically** begins a new streak when they next complete an eligible weekly commitment.
- **No separate recovery action** is required.
- Recovery must not retroactively change a missed period into completed unless an authorised contribution correction legitimately changes that period’s assessment.
- Messaging must be supportive and nonpunitive.

### G1.1-10 — Prospective Target Changes

Refs: Amendment G1.1-10; PRS GOAL-01, §3.

- Target changes take effect for commitment assessment at the **beginning of the next weekly commitment period**.
- Historical commitment assessments must not be rewritten solely because of a target change.
- Target changes are audited.
- Effect on overall progress percentages and previously earned milestones is **OPEN — requires product-owner approval** before implementation.

### G1.1-11 — Prospective Commitment Pauses

Refs: Amendment G1.1-11; PRS GAME-01, §6.4.

- Pauses begin at the **start of the next weekly commitment period**.
- Pauses cannot apply retroactively to erase missed commitments.
- Paused weeks are distinct from completed and missed weeks.
- Pause scheduling respects the challenge time zone.
- Maximum pause duration and resume behaviour are **OPEN — requires product-owner approval.**

### G1.1-12 — Completed Challenges

Refs: Amendment G1.1-12; PRS §8.4.

- Completed challenges are **read-only by default**.
- Ordinary contribution creation, target changes and commitment changes are disabled after completion.
- Post-completion corrections require a separately defined authorised reopening process (**OPEN — requires product-owner approval**).
- Historical information is accessible only to authorised users, subject to retention and deletion rules.
- Privacy remains enforced after completion.

### G1.1-13 — Challenge Ownership and Departure

Refs: Amendment G1.1-13; PRS §4.2, §8.2.

- The owner must transfer ownership to another eligible approved member before voluntarily leaving an **active or scheduled** challenge.
- Owner account deletion and no eligible replacement require a documented fallback (**OPEN — requires product-owner approval**).
- Owner departure must not leave a challenge without valid administrative authority.
- Ownership transfers are authorised and auditable.
- Ownership cannot be transferred to an unauthorised user.
- Ownership changes preserve membership and financial privacy rules.

### G1.1-14 — Invitation Expiration

Refs: Amendment G1.1-14; PRS CHAL-02.

- Private invitation links expire **seven days** after creation by default.
- Owners may revoke invitations before expiry.
- Expired or revoked links cannot request membership.
- Expiration does not bypass owner approval.
- Invalid invitations do not expose protected information.

---

## Gamification Rules (PRS §6, clarified by G1.1-03, G1.1-08, G1.1-09, G1.1-11)

Gamification should encourage sustainable saving habits. It must not encourage users to save beyond their financial means.

### Core Mechanics (MVP)

- Weekly commitment tracking (mandatory for active savings participation — G1.1-03).
- Current streak.
- Completed commitment history.
- Missed commitment indicators.
- Progress milestones at 25% / 50% / 75% / 100% of individual target (G1.1-08).
- Weekly commitment streak milestones (thresholds **OPEN**).
- Challenge completion recognition.

### Fairness

- Users should be rewarded for consistency relative to their own commitments.
- Raw savings amounts should not be the primary measure of achievement.

### Missed Commitments and Recovery

- Missed periods remain recorded historically.
- New streak begins automatically on the next eligible completed week (G1.1-09); no manual streak reset.
- Supportive, nonpunitive feedback.

### Pauses

- Prospective only; effective at the start of the next weekly commitment period (G1.1-11).
- Paused periods must not be represented as successful savings weeks.
- Completed, missed and paused periods must remain distinguishable.

### Excluded Mechanics

- Financial penalties; real-money wagering; cash prizes; public wealth rankings; punitive financial scoring; pressure to save unaffordable amounts.

**Related requirements:** GAME-01, GOAL-02.

---

## Privacy and Financial Data Rules (PRS §7, clarified by G1.1-06, G1.1-07)

### Privacy Defaults

Within a private challenge:

- Monetary amounts are visible to approved members by default.
- Users are informed before joining and explicitly acknowledge disclosure.
- Users may opt out; opt-out hides **amounts and targets** from other members (G1.1-06).
- Opted-out amounts and targets are excluded from other members’ visible aggregates (labelled as visible-member totals).
- Private financial information is never exposed to pending members or unauthorised users (preview limited per G1.1-07).
- Users are informed that previously viewed information cannot be made unseen (PRIV-01).

### Data Access, Auditability, Minimisation, Regulatory

Unchanged from PRS §7.3–7.6: authenticated identity + membership + permissions; server-side authorisation; auditable corrections; data minimisation (no bank credentials / cards / IDs in MVP); UK GDPR assessments before public beta.

**Related requirements:** PRIV-01, ACC-01, SAVE-02, CHAL-02.

---

## Membership and Challenge Lifecycle Rules (PRS §8, clarified by G1.1-01, G1.1-02, G1.1-07, G1.1-12, G1.1-13)

### Joining

1. Receive a valid (non-expired, non-revoked) invitation — default expiry 7 days (G1.1-14).
2. Authenticate.
3. Review permitted invitation preview only (G1.1-07).
4. Request membership.
5. Receive owner approval.
6. Review financial visibility disclosures.
7. Confirm participation and choose privacy preferences.
8. Configure individual target **and** weekly commitment before active savings participation (G1.1-03, G1.1-04).

Only after membership approval may they access the challenge’s protected financial information. Savings recording requires completed participation setup.

### Owner participation

See G1.1-01: owner is auto-approved; may defer savings setup; challenge may exist owner-only.

### Leaving / Removal

- Leaving: access revoked; contributions excluded from current active-member totals; minimum necessary history retained (PRS §8.2).
- Owners of active/scheduled challenges must transfer ownership before voluntary leave (G1.1-13).
- Removal by owner immediately revokes access (PRS §8.3).

### Challenge Completion / Cancellation

- Completion → read-only by default (G1.1-12).
- Cancelled is a terminal lifecycle state (G1.1-02); detailed cancellation rules remain **OPEN**.

**Related requirements:** CHAL-01, CHAL-02, CHAL-03, PRIV-01, GOAL-01, GOAL-02.

---

## Group Progress Visibility Rules

The application must distinguish personal reported savings, personal target, percentage progress, combined **visible** reported savings, combined **visible** target, and overall participation status.

- Opt-out excludes both contributions and targets from other members’ visible aggregates (G1.1-06).
- Labels must say visible-member totals, not complete group totals.
- Activity feeds must respect privacy; financial information is not publicly accessible.

**Related requirements:** DASH-01, SOC-01, PRIV-01.

---

## Commitment, Target and Contribution Rules (summary)

| Rule | Decision | Trace |
| --- | --- | --- |
| Active participation requires target | Mandatory positive individual target | G1.1-04 |
| Active participation requires weekly commitment | Mandatory positive weekly commitment | G1.1-03 |
| Time zone | Challenge configured time zone | PRS §3, GOAL-02 |
| Target changes | Prospective — next weekly period start | G1.1-10 |
| Pauses | Prospective — next weekly period start | G1.1-11 |
| Recovery | Automatic on next eligible completed week | G1.1-09 |
| Eligible contributions | Defined in G1.1-05 | G1.1-05 |
| Contributions | Corrections with audit history; self-reported labelling | PRS SAVE-01/02 |
| Membership exit | Access revoked; active-member totals adjusted | PRS §8.2 |
| Historical data | Minimum necessary history retained | PRS §3 |

---

## Gaps / Deferred (OPEN — requires product-owner approval)

From Gate 1.1 §4 and unresolved PRS §19 items. Do **not** treat as approved implementation behaviour:

### Product / UX

- Exact weekly commitment boundaries; partial first and final weeks.
- Contribution backdating limits; allocation across weeks; excess weekly savings carry-forward.
- Commitment amount change rules.
- Pause duration and resumption.
- Streak milestone thresholds; correction/reversal effects on milestones; progress after target changes.
- Challenge cancellation transition rules; challenge activation conditions.
- Ownership fallback on account deletion / no eligible replacement.
- Post-completion reopening.
- Small-group aggregate privacy edge cases.
- Notification event requirements; profile field requirements.
- Maximum participants per challenge; maximum active challenges per user.
- Currency support beyond the initial market.
- Accessibility testing methodology; product analytics consent and event definitions.

### Architecture / Security (provisional until Gate 3)

- Idempotency implementation; database transaction boundaries.
- Authentication and session policy; rate limits.
- Data retention periods; account deletion workflow.
- Audit-log storage and access; privacy-safe API response contracts.
- Time-zone and daylight-saving implementation.
- Monitoring and security controls.
- Proposed tech stack (PRS §16) remains **not approved**.
