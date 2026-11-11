# Roadmap

Sources:

- Product Specification v1.0 (Gate 1 Approved, 11 November 2026) — frozen baseline
- Gate 1.1 Product Rules Amendment (Approved, 11 November 2026) — G1.1-01 … G1.1-14

**Precedence:** Amendment governs where more specific than the parent PRS for behaviours it addresses.

Status: reconciled to Gate 1.1 documentation. Implementation is **not authorised**. Technical architecture remains **provisional** until Gate 3.

---

## Delivery Gates (1–8)

Progression between gates requires explicit product-owner approval.

| Gate | Milestone | Status |
| --- | --- | --- |
| 1 | Product Discovery | Approved |
| 1.1 | Product Rules Clarification | Approved (amendment) |
| 2 | Design Discovery | Planning |
| 3 | Technical Architecture | Not started |
| 4 | Design System and Foundation | Not started |
| 5 | MVP Implementation | Not started |
| 6 | Independent QA and Security Review | Not started |
| 7 | Private Beta | Not started |
| 8 | Monetisation Validation | Not started |

Gate 1.1 is a clarification amendment to the frozen Gate 1 PRS. It does **not** authorise implementation or Gate 2 execution by itself beyond the design-planning activities already named for Gate 2.

---

## Product Phases (1–4)

### Phase 1 — MVP

Validate whether social accountability improves engagement with personal savings goals.

**Core capabilities:** private challenges (lifecycle states per G1.1-02), individual goals and mandatory weekly commitments for active participation (G1.1-03, G1.1-04), manual eligible contributions (G1.1-05), shared visible-member progress (G1.1-06), commitment streaks with automatic recovery (G1.1-09), progress milestones 25/50/75/100% (G1.1-08), privacy controls (amounts + targets), invitation expiry/revoke (G1.1-14), ownership transfer rules (G1.1-13), completed read-only default (G1.1-12).

### Phase 2 — Social Engagement

Potential additions: reactions, encouragement messages, achievement badges, challenge templates, improved reminders, expanded social challenges.

### Phase 3 — Verified Savings

Potential additions: read-only Open Banking, verified contribution detection, connected savings accounts, automated progress updates, reconciliation between reported and verified amounts.

Requires additional security, commercial and regulatory assessment.

### Phase 4 — Monetisation

Explore freemium subscriptions. Potential premium features: unlimited challenges, advanced analytics, enhanced accountability tools, premium challenge formats, bank verification where commercially viable, household and group subscriptions.

Pricing and willingness to pay must be validated. MVP monetisation: no paid subscriptions. Future freemium model is to be validated (not approved as MVP scope).

---

## Gate 2 — Authorised vs Not Authorised

**Current milestone (per specification header):** Gate 2 — Design Discovery (planning).

### Authorised activities

- Competitive research.
- UX research and analysis.
- Visual identity exploration.
- Information architecture.
- User-flow documentation.
- Wireframing.
- Design-system planning.
- Component research.
- Design validation.

### Not authorised

- Application scaffolding.
- Database implementation.
- Production component development.
- Authentication implementation.
- Deployment configuration.
- Subscription integration.

No application scaffolding or implementation is authorised during Gate 2. Final technical decisions belong to Gate 3 — Architecture. Proposed tech stack (PRS §16) is **not approved**.

---

## Stop Note

**Gate 2 must not be started or executed by documentation agents without explicit product-owner approval beyond the design-planning activities already named in the specification.**

This documentation set records the frozen Gate 1 baseline plus approved Gate 1.1 clarifications only. It does **not** authorise or perform:

- Competitive research.
- Wireframes or visual exploration.
- Design-system execution beyond naming the Gate 2 plan in the roadmap.
- Any implementation or scaffolding.

Gate 1 and Gate 1.1 are closed for product-rules discovery. Gate 2 is open for design planning and research only when the product owner explicitly progresses that work — this documentation effort does not execute Gate 2.

---

## Gaps / Deferred

- Phase 2–4 items are directional future roadmap, not approved MVP requirements.
- Monetisation details (pricing, willingness to pay) are unvalidated.
- Open Banking / verified savings require separate regulatory and integration assessment before any commitment.
- Open product/UX/architecture/security items listed in Gate 1.1 §4 and `decisions.md` remain **OPEN — requires product-owner approval** and must not be treated as approved implementation behaviour.
