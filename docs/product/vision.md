# Vision

Sources:

- Product Specification v1.0 (Gate 1 Approved, 11 November 2026) — frozen baseline §§1–2, §15
- Gate 1.1 Product Rules Amendment (Approved, 11 November 2026) — behavioural clarifications do not change vision/mission; they refine how shared commitments and privacy operate in MVP

**Precedence:** Amendment governs where more specific than the parent PRS for behaviours it addresses.

Status: reconciled to Gate 1.1 (no vision/mission change). Implementation is **not authorised**.

---

## Vision

Make saving money more motivating by turning individual financial goals into shared commitments, friendly challenges and measurable progress.

## Mission

Help friends build sustainable saving habits by creating an environment where financial commitments are visible, progress is celebrated and participants encourage one another to reach their goals.

## Value Proposition

Accountability Tracker combines:

- Individual savings targets.
- Shared group challenges.
- Social accountability.
- Transparent progress tracking.
- Commitment-based gamification.
- Positive reinforcement.
- Privacy controls.

The product should feel like a motivating social experience rather than a traditional financial dashboard.

**Gate 1.1 alignment (non-vision-changing):** Active savings participation requires both an individual target and a weekly commitment (G1.1-03, G1.1-04). Privacy opt-out hides monetary amounts **and** targets from other members while preserving visible-member progress labels (G1.1-06). Gamification celebrates consistency (automatic streak recovery, progress milestones) without encouraging users to save beyond their means (G1.1-08, G1.1-09; PRS §6).

## Primary Audience

Groups of friends who want to save money together or encourage one another to develop better financial habits.

Example scenarios include:

- Friends saving for a holiday.
- Groups saving for festivals or events.
- Friends completing a 90-day savings challenge.
- Individuals encouraging each other to build emergency funds.
- Friends working towards different personal savings goals within a shared challenge.

Secondary audiences (couples, households, university students, workplace groups, online communities) are potential future audiences and are not primary MVP audiences.

## Positioning vs Budgeting Apps

Unlike conventional budgeting applications, Accountability Tracker focuses on behavioural motivation and accountability, rather than expense categorisation or financial management.

## No-Custody Principle

Users save money in their own external bank accounts. The application does not hold, transfer, invest, manage or custody funds.

The initial MVP uses manually recorded, self-reported savings contributions (eligible contributions only — G1.1-05). Future versions may introduce read-only Open Banking integrations to verify savings progress through regulated providers; that work is out of MVP scope and must not be treated as approved implementation behaviour.

## Design Principles

Approved design discovery principles (Specification §15):

| Principle | Intent |
| --- | --- |
| Trust Before Decoration | Financial information must be clear, reliable and easy to interpret. |
| Social by Design | Shared progress and accountability should be central to the experience. |
| Reward Meaningful Progress | Gamification should celebrate consistency rather than wealth. |
| Distinctive Visual Identity | Avoid generic SaaS dashboards, excessive gradients and interchangeable component patterns. |
| Accessible and Predictable | Use established interaction patterns and accessibility principles, including relevant Material Design 3 guidance, without adopting a generic visual aesthetic. |
| Mobile First | Core journeys should feel natural on mobile browsers while scaling to desktop. |

## Open / Deferred

- Exact visual identity, IA and wireframes belong to Gate 2 and are not defined here — **do not begin design exploration in this documentation pass**.
- Secondary audience expansion is not part of the Gate 1 MVP audience decision.
- Technical architecture remains **provisional** until Gate 3 (PRS §16 stack not approved).
