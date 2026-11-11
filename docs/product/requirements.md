# Requirements

Sources:

- Product Specification v1.0 (Gate 1 Approved, 11 November 2026) — frozen baseline
- Gate 1.1 Product Rules Amendment (Approved, 11 November 2026) — G1.1-01 … G1.1-14

**Precedence:** Amendment governs where more specific than the parent PRS for behaviours it addresses.

Status: reconciled to Gate 1.1. All MVP functional requirements are P0 unless otherwise stated. Implementation is **not authorised**.

---

## MVP Functional Requirements

### AUTH-01 — Authentication

Refs: PRS §5 AUTH-01.

Users must be able to:

- Register an account.
- Verify their email address.
- Sign in securely.
- Sign out.
- Recover access to their account.

### PROF-01 — User Profiles

Refs: PRS §5 PROF-01.

Users must be able to:

- Set a display name.
- View their profile.
- Update basic profile information.

Profile information must not expose unnecessary personal or financial data. Detailed profile field requirements remain **OPEN — requires product-owner approval.**

### CHAL-01 — Create Challenge

Refs: PRS §5 CHAL-01; G1.1-01, G1.1-02, G1.1-12.

Authenticated users can create a private challenge.

**Required fields:** challenge name, start date, end date, currency, time zone.

**Optional fields:** description.

**Gate 1.1 clarifications:**

- Creator automatically becomes owner **and** approved participant (G1.1-01).
- Owner is not required to set personal target or weekly commitment at creation (G1.1-01).
- Challenge enters the documented lifecycle model (Draft / Scheduled / Active / Completed / Cancelled — G1.1-02).
- A challenge may exist with only its owner before other participants join (G1.1-01).
- Owner cannot record savings until participation setup (target + weekly commitment) is complete (G1.1-01, G1.1-03, G1.1-04).
- Completed challenges are read-only by default; ordinary contributions, target changes and commitment changes are disabled after completion (G1.1-12). Post-completion reopening remains **OPEN — requires product-owner approval.**

### CHAL-02 — Invitations

Refs: PRS §5 CHAL-02; G1.1-07, G1.1-14.

Challenge owners can generate private invitation links.

**Gate 1.1 clarifications:**

- Default invitation expiry: **seven days** after creation (G1.1-14).
- Owners may revoke invitations before expiry (G1.1-14).
- Invitation preview for non-approved invitees is limited to name, description, start/end dates, and participant count (G1.1-07).
- Invitation does not bypass owner approval or financial visibility acknowledgement (G1.1-07).

### CHAL-03 — Membership

Refs: PRS §5 CHAL-03; G1.1-01, G1.1-04, G1.1-07, G1.1-13.

Invitees can request to join a challenge. Challenge owners can approve or decline requests. Members can leave; owners can remove members.

**Gate 1.1 clarifications:**

- Pending / non-approved invitees see only the G1.1-07 preview surface; no protected financial data.
- Approved membership is distinct from **active savings participation** (requires target + weekly commitment — G1.1-03, G1.1-04).
- Owner of an active or scheduled challenge must transfer ownership before voluntary leave (G1.1-13).
- Ownership fallback on account deletion / no eligible replacement is **OPEN — requires product-owner approval.**

### GOAL-01 — Individual Savings Targets

Refs: PRS §5 GOAL-01; G1.1-04, G1.1-10.

Every **active savings participant** must have a positive individual savings target (mandatory — G1.1-04). Different participants may choose different amounts. Target changes apply prospectively for commitment assessment at the **beginning of the next weekly commitment period** (G1.1-10).

Approved members (including the owner) may configure their target after membership approval / challenge creation; they cannot record savings until the target is set (G1.1-01, G1.1-04).

Effect of target changes on progress percentages and previously earned milestones is **OPEN — requires product-owner approval.**

### GOAL-02 — Weekly Commitments

Refs: PRS §5 GOAL-02; G1.1-03, G1.1-11.

Every **active savings participant** must have a positive recurring weekly savings commitment (mandatory — G1.1-03). Commitments are assessed using the challenge time zone.

Participants without completed savings setup are not assessed for streaks or missed commitments (G1.1-03).

Pauses begin at the start of the next weekly commitment period (G1.1-11). Exact weekly boundaries, partial weeks, commitment amount changes, and pause duration/resume remain **OPEN — requires product-owner approval.**

### SAVE-01 — Record Contributions

Refs: PRS §5 SAVE-01; G1.1-05.

Participants with **active savings participation** can manually record money saved outside the application. Contributions are self-reported and must update progress only when **eligible** (G1.1-05).

Only eligible contributions (valid, authorised, non-reversed, associated with an active participant, dated within the permitted savings period) affect financial progress.

Backdating limits, excess contribution treatment, and weekly allocation remain **OPEN — requires product-owner approval.**

### SAVE-02 — Correct Contributions

Refs: PRS §5 SAVE-02; G1.1-05, G1.1-09.

Participants can correct previously recorded contributions with preserved audit history and recalculated progress. Corrections may legitimately change a period’s commitment assessment; they must not silently destroy previous records. Milestone/commitment update detail for corrections remains partly **OPEN — requires product-owner approval.**

### DASH-01 — Personal and Group Dashboard

Refs: PRS §5 DASH-01; G1.1-02, G1.1-06, G1.1-08.

The challenge dashboard must display challenge metadata (including lifecycle status), personal target and progress, **visible-member** group progress (G1.1-06), recent permitted activity, and relevant streaks and milestones (including 25/50/75/100% personal progress milestones — G1.1-08).

### SOC-01 — Social Activity

Refs: PRS §5 SOC-01; G1.1-06, G1.1-08.

Members can view a challenge activity feed (e.g. new approved participants, reported contributions, completed weekly commitments, milestones, challenge completion), subject to privacy preferences. Hidden amounts and targets must not appear; privacy settings govern milestone activity shown to others (G1.1-06, G1.1-08).

### GAME-01 — Commitment Streaks

Refs: PRS §5 GAME-01; G1.1-03, G1.1-09, G1.1-11.

The application tracks consistent completion of weekly commitments for **active** savings participants, including missed and paused periods. After a miss, a new streak begins **automatically** on the next eligible completed week — no separate recovery action (G1.1-09). Pauses are prospective (G1.1-11).

### PRIV-01 — Financial Visibility

Refs: PRS §5 PRIV-01; G1.1-06, G1.1-07.

Savings amounts are visible to fellow challenge members by default. Participants must be informed before joining and may opt out of sharing monetary information. Opt-out hides **both amounts and targets** from other members and from their visible aggregates, which must be labelled as visible-member totals (G1.1-06). Privacy is enforced server-side. Invitation preview must not expose financial data (G1.1-07).

### ACC-01 — Account Controls

Refs: PRS §5 ACC-01; G1.1-13.

Users must be able to export their personal information, request account deletion, and understand how their data is handled. Account deletion must not create orphaned active challenges; ownership fallback remains **OPEN — requires product-owner approval** (G1.1-13). Retention periods remain **OPEN**.

### NOTIF-01 — Essential Notifications

Refs: PRS §5 NOTIF-01.

| Priority | Scope |
| --- | --- |
| P0 | Essential account and invitation-related emails (e.g. email verification, account recovery, membership approval or rejection). |
| P1 | Optional weekly reminders and achievement notifications. |

Notification event detail beyond these examples remains **OPEN — requires product-owner approval.**

---

## Non-Functional Requirements

### Accessibility (NFR)

Target WCAG 2.2 AA, including keyboard accessibility, visible focus states, semantic controls, accessible validation, sufficient colour contrast, screen-reader-compatible information, and reduced-motion support.

### Responsive Design (NFR)

Mobile-first. Support modern mobile, tablet and desktop layouts. Core workflows must remain usable on small screens.

### Reliability (NFR)

Financial calculations must be deterministic. Avoid floating-point monetary arithmetic. Use database transactions for related changes. Prevent accidental duplicate submissions. Idempotency implementation detail is **OPEN** (architecture).

### Security (NFR)

Secure authentication; server-side authorisation; least-privilege access; input validation; secure session handling; protection against common web vulnerabilities; appropriate rate limiting; encryption in transit and at rest; secret management; audit logging; dependency security review. Session policy, rate limits, and privacy-safe API contracts remain **OPEN** pending Gate 3.

### Testing (NFR)

Every feature requires appropriate automated coverage across unit, integration, end-to-end and security testing as defined in Specification §10.5.

### Quality Gates (NFR)

A feature is complete only when acceptance criteria pass, relevant automated tests pass, TypeScript and lint checks pass, accessibility and responsive layouts are reviewed, security-sensitive changes are reviewed, outstanding defects are documented, and product-owner approval is obtained where required.

---

## Priority Notes

- Unless marked otherwise, all §5 functional requirements are **P0**.
- **NOTIF-01:** essential account/invitation emails are P0; weekly reminders and achievement notifications are **P1**.

---

## Gaps / Deferred

- Thin AC for **PROF-01** and **NOTIF-01** — see `acceptance-criteria.md`.
- Open product and architecture items listed in Gate 1.1 §4 and remaining PRS §19 items — see `decisions.md` and `product-rules.md`.
- Deferred requirements must **not** be treated as approved implementation behaviour.
- Technical architecture decisions are explicitly **provisional** until Gate 3.
