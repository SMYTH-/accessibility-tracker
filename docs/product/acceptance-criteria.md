# Acceptance Criteria

Sources:

- Product Specification v1.0 (Gate 1 Approved, 11 November 2026) — frozen baseline §5
- Gate 1.1 Product Rules Amendment (Approved, 11 November 2026) — G1.1-01 … G1.1-14 acceptance criteria

**Precedence:** Amendment AC governs where more specific than parent PRS AC for the same behaviour.

Status: reconciled to Gate 1.1. Criteria are approved product acceptance targets; open behaviours are marked explicitly. Implementation is **not authorised**.

---

## AUTH-01 — Authentication

Refs: PRS AUTH-01.

- Authentication is required for private challenge access.
- Invalid credentials do not grant access.
- Sessions are handled securely.
- Password recovery uses secure, time-limited mechanisms.
- Unauthorised users cannot access protected resources.

Session policy detail is **OPEN — requires product-owner approval** (architecture/security).

## PROF-01 — User Profiles

Refs: PRS PROF-01.

**No detailed acceptance-criteria list** is provided in the specification.

Capability statements only:

- Users can set a display name, view their profile, and update basic profile information.
- Profile information must not expose unnecessary personal or financial data.

**Status:** thin / **OPEN — requires product-owner approval** for detailed AC elaboration before implementation.

## CHAL-01 — Create Challenge

Refs: PRS CHAL-01; G1.1-01; G1.1-02.

PRS:

- Required fields are validated.
- The end date must follow the start date.
- Challenge creation is atomic.
- The creator becomes the owner.
- The challenge is private.
- Successful creation leads to the challenge overview.
- Invalid submissions produce clear error messages.

Gate 1.1 (mandatory):

- The creator automatically receives owner permissions **and** approved membership (G1.1-01).
- The owner can configure a challenge without immediately setting a target (G1.1-01).
- The owner cannot record savings until their individual participation setup is complete (G1.1-01).
- Inactive savings participation does not generate missed commitments (G1.1-01).
- Ownership permissions are distinct from savings participation status (G1.1-01).
- Every challenge has one valid lifecycle status (Draft / Scheduled / Active / Completed / Cancelled) (G1.1-02).
- Status transitions are controlled and auditable where appropriate; invalid transitions are rejected (G1.1-02).
- Challenge status is represented consistently in the interface (G1.1-02).

Detailed transition validation remains **OPEN — requires product-owner approval.**

## CHAL-02 — Invitations

Refs: PRS CHAL-02; G1.1-07; G1.1-14.

PRS:

- Invitation links cannot be used to bypass membership approval.
- Links can be revoked.
- Links have an expiry mechanism.
- Invitees must authenticate before requesting membership.
- Invalid or expired links cannot create membership requests.
- Invitations do not expose private challenge financial data.

Gate 1.1 (mandatory):

- Invitations have an expiration timestamp (G1.1-14).
- Invitations expire **seven days** after creation by default (G1.1-14).
- Owners can revoke invitations (G1.1-14).
- Expired or revoked invitations are rejected (G1.1-14).
- Invalid invitations do not expose protected information (G1.1-14).
- Invitation use is subject to appropriate security controls (G1.1-14).
- Invitation previews contain only permitted information: name, description, start date, end date, participant count (G1.1-07).
- Pending members cannot access protected financial data (G1.1-07).
- Membership approval remains mandatory (G1.1-07).
- Financial privacy disclosures are presented before active participation (G1.1-07).

## CHAL-03 — Membership

Refs: PRS CHAL-03; G1.1-01; G1.1-04; G1.1-13.

PRS:

- Pending users cannot access private financial information.
- Approval grants the appropriate membership permissions.
- Declined users do not gain access.
- Members can leave challenges.
- Owners can remove members.
- Removed members immediately lose access.
- Duplicate memberships are prevented.

Gate 1.1 (mandatory):

- A participant may configure their target after membership approval (G1.1-04).
- An approved member awaiting target configuration cannot record savings (G1.1-04).
- Missing target configuration does not create missed commitments (G1.1-04).
- Ownership cannot be transferred to an unauthorised user (G1.1-13).
- Voluntary owner departure from an active or scheduled challenge is blocked until a valid transfer (G1.1-13).
- Ownership changes preserve membership and financial privacy rules (G1.1-13).
- Transfers are auditable (G1.1-13).
- Account deletion must not create orphaned active challenges (G1.1-13).

Ownership fallback when no eligible replacement exists is **OPEN — requires product-owner approval.**

## GOAL-01 — Individual Savings Targets

Refs: PRS GOAL-01; G1.1-04; G1.1-10.

PRS:

- Targets are positive monetary amounts.
- Targets use the challenge currency.
- Different participants may choose different amounts.
- Participants cannot modify another member’s target.
- Target changes are recorded.
- Changes to targets apply prospectively for commitment assessment.

Gate 1.1 (mandatory):

- Active savings participation requires a positive individual target (G1.1-04).
- Target changes are recorded with effective dates (G1.1-10).
- Historical target values are auditable (G1.1-10).
- Previously completed commitment periods are not silently rewritten by a target change (G1.1-10).
- Updated values apply at the beginning of the next weekly commitment period (G1.1-10).
- Users cannot modify another member’s target (G1.1-10).

Effect on progress percentages and previously earned milestones is **OPEN — requires product-owner approval.**

## GOAL-02 — Weekly Commitments

Refs: PRS GOAL-02; G1.1-03; G1.1-11.

PRS:

- Commitments must be valid positive amounts.
- Commitments are assessed using the challenge time zone.
- Eligible contributions determine whether a commitment is met.
- Completed, missed and paused periods are distinguishable.
- Historical assessments are not silently rewritten by later commitment changes.

Gate 1.1 (mandatory):

- A participant cannot activate savings participation without a valid weekly commitment (G1.1-03).
- Weekly commitments are positive monetary amounts (G1.1-03).
- Commitment assessment begins only when participation is active (G1.1-03).
- Participants without an active commitment are not marked as missing payments (G1.1-03).
- Commitments are evaluated according to the challenge’s configured time zone (G1.1-03).
- A pause cannot alter previously assessed weeks (G1.1-11).
- Paused periods are explicitly identified and are not treated as successful savings weeks (G1.1-11).
- Historical data remains accurate under pauses (G1.1-11).
- Pause scheduling respects the challenge time zone (G1.1-11).

Exact week boundaries, partial weeks, commitment amount changes, and pause duration/resume are **OPEN — requires product-owner approval.**

## SAVE-01 — Record Contributions

Refs: PRS SAVE-01; G1.1-05.

PRS:

- Only authorised participants can record contributions.
- Users cannot create contributions for other participants.
- Amounts must be positive.
- Monetary values must use precise minor-unit calculations.
- Invalid amounts are rejected.
- Duplicate submissions are prevented through idempotency.
- Successful contributions update progress.
- Contributions are clearly labelled as self-reported.

Gate 1.1 (mandatory):

- Only **eligible** contributions affect financial progress (G1.1-05).
- Reversed contributions do not count towards totals (G1.1-05).
- Contributions are associated with the correct participant and challenge (G1.1-05).
- Monetary calculations use precise arithmetic (G1.1-05).
- Displayed amounts are labelled as self-reported where appropriate (G1.1-05).
- Corrections trigger recalculation of affected results (G1.1-05).
- Recording requires completed participation setup (active participant with target + weekly commitment) (G1.1-01, G1.1-03, G1.1-04).
- Completed and cancelled challenges do not accept ordinary new contributions (G1.1-02, G1.1-12).

Backdating, excess contributions, and weekly allocation remain **OPEN — requires product-owner approval.** Idempotency implementation is **OPEN** (architecture).

## SAVE-02 — Correct Contributions

Refs: PRS SAVE-02; G1.1-05; G1.1-09; G1.1-12.

PRS:

- Users can only correct their own contributions.
- Corrections preserve an audit history.
- Historical changes are traceable.
- Affected progress is recalculated.
- Relevant milestones and commitment assessments are updated according to documented rules.
- Corrections do not silently destroy previous records.

Gate 1.1:

- Recovery must not retroactively change a missed period into completed unless an authorised contribution correction legitimately changes that period’s assessment (G1.1-09).
- Post-completion ordinary corrections are disabled; authorised reopening is required (G1.1-12) — reopening process **OPEN — requires product-owner approval.**
- Milestone/commitment update rules for corrections remain partly **OPEN — requires product-owner approval.**

## DASH-01 — Personal and Group Dashboard

Refs: PRS DASH-01; G1.1-06; G1.1-08.

PRS:

- Calculations are accurate.
- Private amounts are not exposed.
- Empty states are provided.
- Loading and error states are handled.
- Layouts are responsive.
- Financial information is clearly labelled.

Gate 1.1 (mandatory):

- Financial totals clearly indicate their visibility scope (visible-member totals) (G1.1-06).
- Private amounts and targets are excluded from other members’ visible aggregates (G1.1-06).
- Members can always view their own authorised financial information (G1.1-06).
- Progress milestones use individual targets at 25% / 50% / 75% / 100% (G1.1-08).
- Milestones are not awarded using unauthorised or reversed contributions (G1.1-08).
- Challenge lifecycle status is represented consistently (G1.1-02).

## SOC-01 — Social Activity

Refs: PRS SOC-01; G1.1-06; G1.1-08.

PRS:

- Activity respects privacy preferences.
- Hidden amounts do not appear in feeds.
- Activity cannot be used to bypass membership permissions.
- Financial information is not publicly accessible.

Gate 1.1 (mandatory):

- Activity feeds, exports and notifications respect visibility settings (G1.1-06).
- Privacy settings govern milestone activity shown to others (G1.1-08).
- Hidden monetary values cannot be reconstructed through aggregate differences or other exposed data (G1.1-06).

## GAME-01 — Commitment Streaks

Refs: PRS GAME-01; G1.1-03; G1.1-09; G1.1-11.

PRS:

- A week is completed when eligible savings meet the commitment.
- Missed periods are recorded.
- Paused periods are distinguishable from missed periods.
- Pauses apply prospectively.
- Users can recover from missed commitments.
- Recovery allows a new streak to begin.
- Historical missed periods remain accurate.
- Streak calculations are deterministic and testable.

Gate 1.1 (mandatory):

- Missed periods remain recorded (G1.1-09).
- A completed week following a missed week starts a new streak **automatically** (G1.1-09).
- No manual streak reset / separate recovery action (G1.1-09).
- Historical assessments are traceable (G1.1-09).
- Supportive, nonpunitive messaging (G1.1-09).
- Inactive / unset commitments do not generate missed assessments (G1.1-01, G1.1-03).
- Pauses begin at the start of the next weekly commitment period (G1.1-11).

Streak milestone thresholds remain **OPEN — requires product-owner approval.**

## PRIV-01 — Financial Visibility

Refs: PRS PRIV-01; G1.1-06.

PRS:

- Financial visibility is explained before participation.
- Users explicitly acknowledge the disclosure.
- An opt-out is available.
- Privacy is enforced server-side.
- Hidden amounts cannot be retrieved through unauthorised API requests.
- Hidden amounts do not appear in group totals visible to other members.
- Activity feeds respect visibility settings.
- Privacy changes take effect across relevant interfaces.
- Users are informed that previously viewed information cannot be made unseen.

Gate 1.1 (mandatory):

- Opting out hides **both** savings amounts **and** targets from other members (G1.1-06).
- Private amounts and targets are excluded from other members’ visible aggregates (G1.1-06).
- Members can always view their own authorised financial information (G1.1-06).
- Financial totals clearly indicate their visibility scope (G1.1-06).
- Privacy is enforced server-side (G1.1-06).
- Activity feeds, exports and notifications respect visibility settings (G1.1-06).
- Hidden monetary values cannot be reconstructed through aggregate differences or other exposed data (G1.1-06).
- Privacy changes are applied consistently (G1.1-06).
- Privacy remains enforced after challenge completion (G1.1-12).

Small-group aggregate privacy edge cases remain **OPEN — requires product-owner approval.**

## ACC-01 — Account Controls

Refs: PRS ACC-01; G1.1-13.

PRS:

- Exported information is limited to data the user is authorised to receive.
- Account deletion revokes active access.
- Personal data is deleted or anonymised according to documented retention requirements.
- Necessary historical records are handled consistently with privacy obligations.

Gate 1.1:

- Account deletion must not create orphaned active challenges (G1.1-13).

Retention periods, deletion workflow, and ownership fallback remain **OPEN — requires product-owner approval.**

## NOTIF-01 — Essential Notifications

Refs: PRS NOTIF-01.

**No detailed acceptance-criteria list** is provided in the specification.

Capability / priority statements only:

- MVP must support essential account and invitation-related emails (examples: email verification, account recovery, membership approval or rejection) — **P0**.
- Optional weekly reminders and achievement notifications are **P1**.

**Status:** thin / **OPEN — requires product-owner approval** for detailed AC elaboration before implementation.

## Completed Challenges (cross-cutting — G1.1-12)

Refs: G1.1-12; PRS §8.4.

- No ordinary new contributions after completion.
- Completed challenges cannot be silently modified.
- Future reopening must be explicitly specified and approved (**OPEN**).
- Authorised members may view permitted historical information.
- Privacy remains enforced after completion.

---

## Thin or Deferred Criteria Summary

| Requirement / topic | AC status |
| --- | --- |
| PROF-01 | No detailed AC list in spec — **OPEN** |
| NOTIF-01 | No detailed AC list; P0 vs P1 scope only — **OPEN** |
| SAVE-02 | AC references “documented rules” for milestone/commitment updates — partly **OPEN** |
| ACC-01 | Retention requirements and ownership fallback — **OPEN** |
| CHAL-02 | Expiry duration **resolved** by G1.1-14 (7 days); security controls detail partly **OPEN** |
| GOAL-01 / GOAL-02 | Mandatory for active participation **resolved** (G1.1-03/04); week boundaries / pause duration still **OPEN** |
| GAME-01 | Automatic recovery **resolved** (G1.1-09); streak milestone thresholds still **OPEN** |
| PRIV-01 | Opt-out scope includes targets **resolved** (G1.1-06); small-group aggregate edges still **OPEN** |
| CHAL-01 / lifecycle | States **resolved** (G1.1-02); transition validation detail still **OPEN** |
| Ownership | Transfer-before-leave **resolved** (G1.1-13); fallback on deletion still **OPEN** |
| Post-completion | Read-only default **resolved** (G1.1-12); reopening still **OPEN** |

Non-functional quality gates (Specification §10.6) also apply to feature completeness but are not per-requirement acceptance criteria.

Technical architecture decisions remain **provisional** until Gate 3.
