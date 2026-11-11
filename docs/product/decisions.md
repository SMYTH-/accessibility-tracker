# Decisions

Sources:

- Product Specification v1.0 (Gate 1 Approved, 11 November 2026) — frozen baseline
- Gate 1.1 Product Rules Amendment (Approved, 11 November 2026) — G1.1-01 … G1.1-14

**Precedence:** Amendment governs where more specific than the parent PRS for behaviours it addresses.

Status: reconciled to Gate 1.1. Implementation is **not authorised**. Technical architecture remains **provisional** until Gate 3.

---

## Approved Gate 1 Decision Table (PRS §3)

| Category | Approved Decision |
| --- | --- |
| Primary audience | Friends saving together |
| Platform | Mobile-first responsive web application |
| Challenge model | Individual savings targets within shared challenges |
| Challenge access | Private and invitation-only |
| Membership approval | Challenge owner approves membership requests |
| Savings targets | Each participant chooses their own target |
| Challenge duration | Custom start and end dates |
| Savings tracking | Manually recorded, self-reported contributions |
| Default visibility | Savings amounts visible to challenge members |
| Privacy | Participants can opt out of sharing amounts |
| Private contributions | Excluded from other members’ visible group totals |
| Commitments | Weekly savings commitments |
| Time zone | Commitment periods use the challenge’s configured time zone |
| Missed commitments | Marked missed, with recovery and pause options |
| Pauses | Apply prospectively |
| Contributions | Corrections allowed with audit history |
| Target changes | Prospective for commitment assessments |
| Membership exit | Access revoked; active-member totals adjusted |
| Historical data | Minimum necessary history retained |
| Financial custody | No money held, transferred or invested |
| MVP monetisation | No paid subscriptions |
| Future monetisation | Freemium model to be validated |

---

## Approved Gate 1.1 Clarifications

These preserve and refine the Gate 1 baseline; they do not silently replace unrelated §3 decisions.

| Rule ID | Clarified decision |
| --- | --- |
| G1.1-01 | Creator is owner **and** approved participant; savings setup (target + weekly commitment) may be deferred; owner-only challenges allowed; inactive savings participation generates no missed commitments |
| G1.1-02 | Lifecycle states: Draft, Scheduled, Active, Completed, Cancelled (Cancelled terminal) |
| G1.1-03 | Weekly commitments are **mandatory** for active savings participation |
| G1.1-04 | Individual targets are **mandatory** before active savings participation |
| G1.1-05 | Eligible contribution defined (valid, authorised, non-reversed, active participant, in-period); self-reported only |
| G1.1-06 | Opt-out hides **amounts and targets**; visible aggregates are visible-member totals only |
| G1.1-07 | Invitation preview limited to name, description, dates, participant count |
| G1.1-08 | Personal progress milestones at 25%, 50%, 75%, 100% of individual target; streak milestones also recognised |
| G1.1-09 | Recovery is **automatic** on next eligible completed week; no separate recovery action |
| G1.1-10 | Target changes effective at start of **next weekly commitment period** |
| G1.1-11 | Pauses effective at start of **next weekly commitment period** |
| G1.1-12 | Completed challenges **read-only by default**; reopening requires separate approved process |
| G1.1-13 | Owner must transfer ownership before voluntarily leaving active/scheduled challenges |
| G1.1-14 | Invitation links expire **seven days** after creation by default; revocable |

---

## Approval Records

### Gate 1

| Field | Value |
| --- | --- |
| Milestone | Product Discovery |
| Version | 1.0 |
| Status | Approved |
| Approval date | 11 November 2026 |

The product owner approved the Gate 1 baseline items listed in PRS §20 (audience, vision, challenge model, privacy, commitments, MVP boundaries, no custody, etc.).

### Gate 1.1

| Field | Value |
| --- | --- |
| Gate | 1.1 — Product Rules Clarification |
| Status | Approved |
| Date | 11 November 2026 |
| Parent | `docs/product/specification-v1.md` |
| Amendment | `docs/product/amendments/gate-1-1-product-rules.md` |

The product owner approved all 14 rules (G1.1-01 … G1.1-14). The parent specification must remain unchanged.

---

## Change-Control Rule

Approved decisions must **not** be silently modified by AI agents.

Any proposed change requires a documented change request and explicit product-owner approval.

Related agent operating rules (Specification §17):

- No unauthorised scope changes.
- No silent modification of approved specifications.
- Agents must stop at approval gates.

---

## Proposed Tech Stack — NOT Approved (Provisional)

The following stack is **proposed, not yet technically approved**. Final technical decisions belong to **Gate 3 — Architecture**. Do not treat as implementation authority.

| Layer | Candidate |
| --- | --- |
| Frontend | React |
| Framework | Next.js App Router |
| Language | TypeScript |
| Database | PostgreSQL |
| Database hosting | Supabase |
| ORM | Drizzle |
| Authentication | Supabase Auth |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui and accessible primitives |
| Component documentation | Storybook |
| Unit testing | Vitest |
| Component testing | React Testing Library |
| E2E testing | Playwright |
| CI/CD | GitHub Actions |
| Monitoring | Sentry |
| Product analytics | PostHog |
| Subscription billing | Stripe, future phase |

No application scaffolding or implementation is authorised during Gate 2.

---

## Deferred / Open Decisions

Items below are **OPEN — requires product-owner approval.** They must not be silently invented. Gate 1.1 resolved some former PRS §19 items (noted); remaining opens come from Gate 1.1 §4 and unresolved PRS §19 entries.

### Resolved by Gate 1.1 (formerly open in PRS §19 / soft in PRS)

| Former open topic | Resolution |
| --- | --- |
| Invitation expiry duration | Seven days default (G1.1-14) |
| Invitation revocation | Owners may revoke before expiry (G1.1-14) |
| Challenge ownership transfer (voluntary leave) | Transfer required before leaving active/scheduled (G1.1-13) |
| Challenge cancellation (existence) | Cancelled lifecycle state defined (G1.1-02); detailed rules still open |
| Post-completion edits (default) | Read-only by default (G1.1-12); reopening still open |
| Exact achievement thresholds (progress %) | 25/50/75/100% personal progress (G1.1-08); streak thresholds still open |
| “Prospectively” timing | Next weekly commitment period start (G1.1-10, G1.1-11) |
| Recovery mechanism | Automatic on next eligible completed week (G1.1-09) |
| Weekly commitment / target optionality | Mandatory for active savings participation (G1.1-03, G1.1-04) |
| Opt-out scope vs targets | Hides amounts and targets (G1.1-06) |
| Invitation preview surface | Named allowed/forbidden fields (G1.1-07) |
| Owner participation model | Auto-approved; deferred setup allowed (G1.1-01) |
| Eligible contribution definition | Defined (G1.1-05); backdating/excess still open |

### Product (still open)

- Exact weekly commitment boundaries; partial first and final weeks.
- Contribution backdating limits; allocation across weeks; whether excess weekly savings carry forward.
- Commitment amount change rules.
- Pause duration and resumption.
- Streak milestone thresholds; correction and reversal effects on milestones; progress calculations after target changes.
- Challenge cancellation rules (beyond state existence); challenge activation conditions.
- Ownership fallback on account deletion / no eligible replacement.
- Post-completion reopening.
- Small-group aggregate privacy edge cases.
- Notification event requirements; profile field requirements.
- Maximum participants per challenge; maximum active challenges per user.
- Currency support beyond the initial market.

### UX (still open)

- Pause UX and messaging detail beyond prospective timing and nonpunitive recovery tone.
- How leavers appear in dashboards/feeds while preserving history.
- Self-reported labelling placement across contribution, totals, exports, feeds.
- Empty/loading copy for inactive owner savings participation.
- Detailed PROF-01 / NOTIF-01 acceptance elaboration.

### Architecture (still open — provisional until Gate 3)

- Idempotency implementation; database transaction boundaries.
- Time-zone and daylight-saving implementation.
- Monitoring and security controls (engineering detail).
- Proposed tech stack selection (PRS §16).

### Security / privacy ops (still open)

- Authentication and session policy.
- Data retention periods; account deletion workflow.
- Audit-log storage and access.
- Rate limits; privacy-safe API response contracts.
- Accessibility testing methodology; product analytics consent and event definitions.
- UK GDPR assessment execution before public beta (required activity, not a product-rule invention).

These decisions must be documented and approved before implementation of affected features.
