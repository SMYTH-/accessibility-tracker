# Accountability Tracker — Gate 1.1 — Product Rules Amendment

| Field | Value |
| --- | --- |
| Document version | 1.0 |
| Approval date | 11 November 2026 |
| Status | Approved |
| Parent specification | `docs/product/specification-v1.md` |

---

## 1. Purpose

This amendment clarifies product behaviours identified during the Gate 1 specification review.

It supplements Product Specification v1.0 without replacing or modifying the approved baseline.

The amendment is authoritative for the 14 rules below. Where it provides greater specificity than the parent specification, the amendment governs that behaviour.

Any future changes require explicit product-owner approval.

No implementation is authorised by this document.

---

## 2. Approved Product Rules

### G1.1-01 — Challenge Owner Participation

The challenge creator automatically becomes the challenge owner and an approved participant.

The owner has the same savings capabilities as other participants, alongside additional challenge administration permissions.

The owner is not required to configure their personal savings target or weekly commitment during initial challenge creation.

The owner may create the challenge, configure it and invite friends before activating their own savings participation.

An owner without an activated savings commitment must not be counted as having completed or missed weekly commitments.

A challenge may exist with only its owner before other participants join.

**Acceptance criteria**

- The creator automatically receives owner permissions and approved membership.
- The owner can configure a challenge without immediately setting a target.
- The owner cannot record savings until their individual participation setup is complete.
- Inactive savings participation does not generate missed commitments.
- Ownership permissions are distinct from savings participation status.

### G1.1-02 — Challenge Lifecycle

States:

- **Draft** — Created but not yet ready for participation.
- **Scheduled** — Configured and awaiting the start date.
- **Active** — Within its configured participation period.
- **Completed** — Challenge period has ended.
- **Cancelled** — Challenge has been explicitly terminated. Cancelled is a terminal state.

The application must distinguish lifecycle status from individual participation status.

A challenge cannot become active for savings participation until its required configuration is valid.

Detailed transition validation, including cancellation and edge cases, must be documented before implementation.

**Acceptance criteria**

- Every challenge has one valid lifecycle status.
- Status transitions are controlled and auditable where appropriate.
- Invalid transitions are rejected.
- Completed and cancelled challenges do not accept ordinary new contributions.
- Challenge status is represented consistently in the interface.

### G1.1-03 — Mandatory Weekly Commitments

Every active savings participant must have a positive weekly savings commitment.

Weekly commitments are mandatory for active participation, not optional.

Participants who have not completed their savings setup are not assessed for streaks or missed commitments.

Commitment values may differ between participants.

**Acceptance criteria**

- A participant cannot activate savings participation without a valid weekly commitment.
- Weekly commitments are positive monetary amounts.
- Commitment assessment begins only when participation is active.
- Participants without an active commitment are not marked as missing payments.
- Commitments are evaluated according to the challenge’s configured time zone.

### G1.1-04 — Mandatory Individual Targets

Every active savings participant must have an individual savings target.

Targets are independent and may differ between members.

A target must be configured before savings participation becomes active.

The owner may defer this configuration until after challenge creation.

**Acceptance criteria**

- Active savings participation requires a positive individual target.
- A participant may configure their target after membership approval.
- An approved member awaiting target configuration cannot record savings.
- Missing target configuration does not create missed commitments.
- Members cannot modify other participants’ targets.

### G1.1-05 — Eligible Savings Contributions

An eligible contribution is a valid, authorised, non-reversed, self-reported savings entry associated with an active participant and dated within the challenge’s permitted savings period.

Eligible contributions contribute to personal progress and applicable commitment calculations.

Contributions must not be interpreted as verified bank deposits.

Invalid, reversed, unauthorised or out-of-period entries must not contribute to progress.

The precise treatment of backdating, excess contributions, correction timing and allocation to weekly periods must be documented before implementation.

**Acceptance criteria**

- Only eligible contributions affect financial progress.
- Reversed contributions do not count towards totals.
- Contributions are associated with the correct participant and challenge.
- Monetary calculations use precise arithmetic.
- Displayed amounts are labelled as self-reported where appropriate.
- Corrections trigger recalculation of affected results.

### G1.1-06 — Financial Privacy and Group Totals

A participant who opts out of sharing monetary information hides both their individual reported savings amounts and their individual savings target.

Private monetary values must not be included in financial aggregates shown to other challenge members.

Visible group totals must represent only the contributions and targets of members sharing their monetary information.

The interface must clearly label these totals as visible-member totals rather than complete group totals.

Private members may still appear in participant lists.

Nonfinancial participation information may be displayed only where it does not disclose or allow reliable inference of hidden monetary values.

The user’s own private information remains visible to that user.

**Acceptance criteria**

- Opting out hides both savings amounts and targets from other members.
- Private amounts and targets are excluded from other members’ visible aggregates.
- Members can always view their own authorised financial information.
- Financial totals clearly indicate their visibility scope.
- Privacy is enforced server-side.
- Activity feeds, exports and notifications respect visibility settings.
- Hidden monetary values cannot be reconstructed through aggregate differences or other exposed data.
- Privacy changes are applied consistently.

### G1.1-07 — Invitation Preview

An invitee who is not yet approved may view only:

- Challenge name
- Description
- Start date
- End date
- Participant count

Must not expose:

- Individual savings targets
- Contribution amounts
- Financial group totals
- Member financial activity
- Private member profile information

Invitation does not bypass owner approval or financial visibility acknowledgement.

**Acceptance criteria**

- Invitation previews contain only permitted information.
- Pending members cannot access protected financial data.
- Invalid or expired invitations do not grant access.
- Membership approval remains mandatory.
- Financial privacy disclosures are presented before active participation.

### G1.1-08 — Progress Milestones

MVP personal progress milestones at 25%, 50%, 75% and 100% of individual target.

MVP also recognises weekly commitment streak milestones.

Exact streak milestone thresholds and treatment of corrected or reduced progress remain subject to further documented rules.

Progress milestones are based on eligible self-reported contributions.

Must not encourage exceeding financial means.

**Acceptance criteria**

- Progress milestones use individual targets.
- Milestones are not awarded using unauthorised or reversed contributions.
- Appropriate recognition when reached.
- Privacy settings govern milestone activity shown to others.
- Deterministic calculation.
- Corrections and target changes do not produce misleading achievement history.

### G1.1-09 — Recovery After Missed Commitments

A missed commitment remains historical.

After a missed week, the participant automatically begins a new streak when they next complete an eligible weekly commitment.

No separate recovery action is required.

Recovery must not retroactively change a missed period into completed unless an authorised contribution correction legitimately changes that period’s assessment.

**Acceptance criteria**

- Missed periods remain recorded.
- A completed week following a missed week starts a new streak.
- No manual streak reset.
- Historical assessments are traceable.
- Supportive, nonpunitive messaging.

### G1.1-10 — Prospective Target Changes

Target changes take effect for commitment assessment at the beginning of the next weekly commitment period.

Historical commitment assessments must not be rewritten solely because of a target change.

Target changes are audited.

Effect on overall progress percentages and previously earned milestones must be explicitly defined before implementation.

**Acceptance criteria**

- Target changes are recorded with effective dates.
- Historical target values are auditable.
- Previously completed commitment periods are not silently rewritten.
- Updated values apply per documented effective-date rules.
- Users cannot modify another member’s target.

### G1.1-11 — Prospective Commitment Pauses

Pauses begin at the start of the next weekly commitment period.

Pauses cannot apply retroactively to erase missed commitments.

Paused weeks are distinct from completed and missed weeks.

Maximum pause duration and resume behaviour must be specified before implementation.

**Acceptance criteria**

- A pause cannot alter previously assessed weeks.
- Paused periods are explicitly identified.
- Paused periods are not treated as successful savings weeks.
- Historical data remains accurate.
- Pause scheduling respects the challenge time zone.

### G1.1-12 — Completed Challenges

Completed challenges are read-only by default.

Ordinary contribution creation, target changes and commitment changes are disabled after completion.

Post-completion corrections require a separately defined authorised reopening process.

Historical information is accessible only to authorised users, subject to retention and deletion rules.

**Acceptance criteria**

- No ordinary new contributions after completion.
- Completed challenges cannot be silently modified.
- Future reopening must be explicitly specified and approved.
- Authorised members may view permitted historical information.
- Privacy remains enforced after completion.

### G1.1-13 — Challenge Ownership and Departure

The owner must transfer ownership to another eligible approved member before voluntarily leaving an active or scheduled challenge.

Owner account deletion and no eligible replacement require a documented fallback.

Owner departure must not leave a challenge without valid administrative authority.

Ownership transfers are authorised and auditable.

**Acceptance criteria**

- Ownership cannot be transferred to an unauthorised user.
- Voluntary owner departure is blocked until a valid transfer.
- Ownership changes preserve membership and financial privacy rules.
- Transfers are auditable.
- Account deletion must not create orphaned active challenges.

### G1.1-14 — Invitation Expiration

Private invitation links expire seven days after creation by default.

Owners may revoke invitations before expiry.

Expired or revoked links cannot request membership.

Expiration does not bypass owner approval.

**Acceptance criteria**

- Invitations have an expiration timestamp.
- Invitations expire seven days after creation by default.
- Owners can revoke invitations.
- Expired or revoked invitations are rejected.
- Invalid invitations do not expose protected information.
- Invitation use is subject to appropriate security controls.

---

## 3. Requirements Precedence

1. `docs/product/specification-v1.md` — frozen Gate 1 baseline
2. `docs/product/amendments/gate-1-1-product-rules.md` — approved clarification amendment
3. Subsequent explicitly approved amendments

Approved amendments clarify or supersede the specific behaviours they address.

Derived documents must remain consistent with these sources.

AI agents must not independently resolve conflicts or introduce new product requirements.

---

## 4. Remaining Open Decisions

This amendment does not resolve every implementation detail.

The following remain open and must be addressed before affected features are implemented:

### Product Rules

- Exact weekly commitment boundaries.
- Partial first and final weeks.
- Contribution backdating limits.
- Contribution allocation across weeks.
- Whether excess weekly savings carry forward.
- Commitment amount change rules.
- Pause duration and resumption.
- Streak milestone thresholds.
- Correction and reversal effects on milestones.
- Progress calculations after target changes.
- Challenge cancellation rules.
- Challenge activation conditions.
- Ownership fallback on account deletion.
- Post-completion reopening.
- Small-group aggregate privacy edge cases.
- Notification event requirements.
- Profile field requirements.

### Architecture and Security

- Idempotency implementation.
- Database transaction boundaries.
- Authentication and session policy.
- Data retention periods.
- Account deletion workflow.
- Audit-log storage and access.
- Rate limits.
- Privacy-safe API response contracts.
- Time-zone and daylight-saving implementation.
- Monitoring and security controls.

These items must not be silently invented by implementation agents.

---

## 5. Approval Record

| Field | Value |
| --- | --- |
| Gate | 1.1 — Product Rules Clarification |
| Status | Approved |
| Date | 11 November 2026 |

The product owner approved all 14 rules.

This document is a supplement to the frozen Gate 1 Product Requirements Specification v1.0. The parent specification must remain unchanged.

### Next Permitted Activity

Gate 2 — Design Discovery planning and research only.

No implementation is authorised.
