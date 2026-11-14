# MVP Scope

Sources:

- Product Specification v1.0 (Gate 1 Approved, 11 November 2026) — frozen baseline
- Gate 1.1 Product Rules Amendment (Approved, 11 November 2026) — G1.1-01 … G1.1-14

**Precedence:** Amendment governs where more specific than the parent PRS for behaviours it addresses.

Implementation status: **Not authorised.**

---

## In-Scope MVP Capabilities

Validate whether social accountability improves engagement with personal savings goals (Phase 1 — MVP).

Core capabilities:

| Capability | Related requirements / rules |
| --- | --- |
| Private challenges with lifecycle states | CHAL-01, CHAL-02, CHAL-03; G1.1-02 |
| Owner auto-membership; deferred savings setup | G1.1-01 |
| Individual goals (mandatory for active participation) | GOAL-01; G1.1-04 |
| Mandatory weekly commitments for active participation | GOAL-02; G1.1-03 |
| Manual eligible contributions + corrections | SAVE-01, SAVE-02; G1.1-05 |
| Shared progress (visible-member totals) | DASH-01, SOC-01; G1.1-06 |
| Commitment streaks + automatic recovery | GAME-01; G1.1-09, G1.1-11 |
| Progress milestones 25/50/75/100% | G1.1-08 |
| Privacy controls (amounts + targets) | PRIV-01; G1.1-06, G1.1-07 |
| Invitation expiry (7 days default) + revoke | CHAL-02; G1.1-14 |
| Ownership transfer before owner leave | G1.1-13 |
| Completed challenges read-only by default | G1.1-12 |
| Authentication and profiles | AUTH-01, PROF-01 |
| Account controls | ACC-01 |
| Essential notifications (P0) | NOTIF-01 |

Supporting product model constraints (approved Gate 1 + Gate 1.1):

- Mobile-first responsive web application.
- Individual savings targets within shared challenges; **mandatory** before active savings participation (G1.1-04).
- Private, invitation-only challenges with owner membership approval.
- Invitation preview limited to non-financial fields (G1.1-07); default expiry seven days (G1.1-14).
- Custom challenge start and end dates; lifecycle Draft / Scheduled / Active / Completed / Cancelled (G1.1-02).
- Manually recorded, self-reported **eligible** contributions (G1.1-05).
- Default visibility of savings amounts to challenge members; opt-out hides amounts **and** targets from others (G1.1-06).
- Private monetary values excluded from other members’ visible-member group totals (labelled as such).
- Weekly savings commitments **mandatory** for active participation; assessed in the challenge time zone (G1.1-03).
- Missed commitments with **automatic** streak recovery; prospective pauses at next period start (G1.1-09, G1.1-11).
- Contribution corrections with audit history.
- Prospective target changes effective at next weekly period start (G1.1-10).
- Membership exit: access revoked; active-member totals adjusted; owner transfer required for active/scheduled leave (G1.1-13).
- No money held, transferred or invested.
- No paid subscriptions in MVP.

---

## Explicit Exclusions (Specification §11)

The following are explicitly excluded from MVP:

- Open Banking.
- Bank account integrations.
- Money transfers.
- Custody of funds.
- Payment processing.
- Cash prizes.
- Financial penalties.
- Public challenges.
- Public leaderboards.
- Direct messaging.
- Real-time group chat.
- AI-generated financial advice.
- Native mobile applications.
- Subscription billing.
- Employer programmes.
- Financial product recommendations.

Any proposed addition requires scope review.

Additional MVP exclusions from gamification rules (§6.5):

- Real-money wagering.
- Public wealth rankings.
- Punitive financial scoring.
- Pressure to save unaffordable amounts.

---

## Success Metrics (Hypotheses)

Initial beta targets are **hypotheses, not established benchmarks** (Specification §13). Metrics should be reviewed after early user research and private beta.

| Metric | Initial Target |
| --- | --- |
| User activation | 60% create or join a challenge |
| Social activation | 50% of challenges have 2+ members |
| First contribution | 60% within 7 days of joining |
| Four-week retention | 35% of activated users |
| Repeat engagement | 40% contribute in 3 of their first 4 weeks |

Qualitative feedback should assess:

- Whether the social experience increases motivation.
- Whether sharing amounts feels comfortable.
- Whether progress is easy to understand.
- Whether gamification is encouraging.
- Whether participants would recommend the product.
- Whether users would pay for premium features.

---

## Implementation Status

- **Not authorised** at Gate 1 / Gate 1.1 documentation close.
- Gate 2 (Design Discovery) is open for design planning and research only when explicitly progressed — see `roadmap.md`.
- No application scaffolding, database implementation, production component development, authentication implementation, deployment configuration, or subscription integration is authorised during Gate 2.
- Final technical decisions belong to Gate 3 — Architecture. The proposed tech stack in Specification §16 is **not approved** (provisional only).
- Deferred / open items in Gate 1.1 §4 and remaining PRS §19 must **not** be treated as approved implementation behaviour.

---

## Gaps / Deferred

Open product, UX, architecture and security decisions — see `decisions.md` and `product-rules.md` Gaps section. Do not invent resolutions in derived docs or implementation.
