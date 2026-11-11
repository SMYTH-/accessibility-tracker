# Gate 2.1 — Design Opportunities & Creative Territories

| Field | Value |
| --- | --- |
| Gate | 2.1 — Design Research |
| Status | Ready for product-owner review |
| Selection | **None selected** — three territories remain legitimate; no final identity |
| Creative preference (research) | Fintech clarity + social accountability |
| Gate 2.2 exploration priority (PO preference) | Hybrid of Territory A (foundation for financial clarity) + Territory B (foundation for social motivation); Territory C preserved as a legitimate alternative |
| Accessibility | PRS §10.1 — **WCAG 2.2 AA** |

---

## 1. Opportunity summary

Research across Monzo, Wise, Trading 212, Strava, and AllTrails suggests a **design hypothesis** (not validated market evidence):

> **Friend-group savings accountability that feels as clear as a modern money app and as motivating as a social activity club — without looking like a bank terminal, a trading desk, or a generic SaaS dashboard.**

This is a creative framing for Gate 2 exploration. It is **not** a claim that market research has proven an unmet competitive gap, demand size, or willingness-to-pay. Treat it as a hypothesis to test through design exploration and later product learning — not as evidence.

Accountability Tracker already owns the product mechanics (private challenges, individual targets, weekly commitments, self-reported contributions, privacy, streaks with recovery, progress milestones). Design opportunity is how those mechanics **feel** together.

### Opportunity themes (Observed → Recommendation)

| Theme | Observed elsewhere | Opportunity for Accountability Tracker |
| --- | --- | --- |
| Dual hierarchy | Fintech heroes a balance; Strava heroes a streak then a feed | Compose **personal money clarity** and **group energy** in one mobile viewport without dashboard clutter |
| Generated social | Activity cards need no essay | Treat eligible contributions / commitments / milestones as the feed engine (**approved MVP** events) |
| Honest labelling | Strong products name what numbers mean | Make “self-reported” and “visible members” feel premium-clear, not apologetic |
| Soft recovery | Streaks and pauses exist, but many UIs still punish | Visualise miss → recover → continue as a supportive arc |
| Distinctive hybrid | Pure fintech or pure fitness brands | Explore a hybrid territory neither cluster fully occupies (**design hypothesis**) |

---

## 2. Constraints and guidance on all territories

Every territory below must:

- Honour PRS §15 (including **Trust Before Decorations**) and `docs/design/research/design-principles.md`
- Meet accessibility expectations aligned to **WCAG 2.2 AA** (PRS §10.1) — not a higher or lower invented bar
- Support Gate 1 / 1.1 behaviours (privacy, visible-member totals, milestones, recovery, pauses) without inventing requirements or adding MVP features
- Combine fintech clarity **and** social accountability (not pick only one cluster)
- Remain mobile-first responsive web, not native-fitness or native-banking clones

**Creative recommendations (not binding product constraints):** Prefer originality over near-cloning competitor brand systems (e.g. Monzo coral, Wise green, Strava orange, Trading 212 cyan, AllTrails neon trail green) or generic AI-SaaS looks. Colour, typography, and atmosphere remain open for exploration within Distinctive Visual Identity — avoid treating “don’t use X hue” lists as locked product rules.

**Optional design explorations (not MVP):** Kudos-style reactions and one-tap encouragement may appear in moodboards as social-motivation probes. They are **not** MVP requirements and must not expand frozen product scope.

---

## 3. Three proposed creative territories

> These are **directional creative frames** for Gate 2.2 moodboards and exploration. They are not final visual identities, not selected, and not product decisions.

---

### Territory A — “Clear Companions”

**One-line pitch:** Warm fintech clarity with friendship sitting beside every number.

**Role in Gate 2.2 priority:** Preferred **foundation for financial clarity** in the A+B hybrid exploration (see §5).

**Fintech clarity inheritance**

- Large, calm personal amounts and commitment status (Monzo/Wise hierarchy discipline).
- Scarce accent on primary actions only (Trading 212 scarcity lesson; exact accent open).
- Generous whitespace; content greys for secondary labels.

**Social accountability inheritance**

- Challenge members and recent social presence appear near progress, not as a separate “social product.”
- Feed is quiet and event-based (Strava loop), but cards look like clear receipts of effort rather than athletic maps.
- Lightweight encouragement (kudos-analogue) is an **optional design exploration only** if probed — not an MVP requirement.

**Atmosphere (creative recommendations)**

- Light, airy surfaces; soft photographic texture of friends/goals used sparingly as atmosphere (not inset cards in the hero).
- Typography: confident humanist sans for UI + a slightly warmer display for celebrations (families open; Inter-as-brand and Monzo Sans cloning are discouraged as creative guidance only).
- Motion: progress fills and soft confirmation pulses; milestone moments briefly lift type weight.

**What it optimises**

- Trust for users wary of “fintech cosplay.”
- Everyday friend groups saving for holidays/events.

**Risks**

- Could drift toward generic neobank friendliness if accent/type are weak.
- Social energy may under-read if member presence is too subtle.

**Best tested in Gate 2.2 via:** challenge dashboard first viewport; contribution confirmation; privacy labelling.

---

### Territory B — “Crew Momentum”

**One-line pitch:** Social-club energy first, with money treated as precise sports-stats clarity.

**Role in Gate 2.2 priority:** Preferred **foundation for social motivation** in the A+B hybrid exploration (see §5).

**Fintech clarity inheritance**

- Metric grids with tabular numerals for amount, %, commitment state (Strava/Trading density without dark trading chrome).
- Explicit status chips (active, paused, recovered, private) with icon + text.

**Social accountability inheritance**

- Personal streak / commitment strip before the crew feed (Strava sequencing).
- Challenge feels like a crew board: shared purpose title, individual targets as roster rows.
- Achievement moments named like AllTrails/Strava titles (“Halfway to target”) with transparent rules.
- Lightweight kudos-analogue recognition may be moodboarded as an **optional design exploration only** — **not** an MVP requirement.

**Atmosphere (creative recommendations)**

- Higher visual tempo: bolder accent blocks for challenge headers; rhythmic list of crew activity.
- Still light-mode default as a preference; accent used in headers and success states more bravely than Territory A, but not full-bleed brand colour behind balances.
- Motion: snappier success (Wise “snappy/fluid” lesson); badge/milestone focus moments (AllTrails carousel energy, different motif).

**What it optimises**

- Groups that want visible momentum and habitual check-ins.
- Motivation and retention via social presence.

**Risks**

- Can tip into competition or “fitness app with £ signs.”
- Noisier feeds if event concatenation is weak.
- Must guard Reward Meaningful Progress against amount-based ranking cues.

**Best tested in Gate 2.2 via:** home with streak + feed; challenge roster; milestone celebration.

---

### Territory C — “Shared Horizon”

**One-line pitch:** A calm progress landscape — personal path and group horizon — where clarity and belonging share one composition.

**Role in Gate 2.2 priority:** **Preserved as a legitimate alternative** — still available for exploration; not discarded. Not the current PO-preferred starting hybrid, but valid if A+B probes underperform or if metaphor-led cohesion is needed.

**Fintech clarity inheritance**

- Dual readouts designed as one composition: *my path* (personal target progress) and *our horizon* (visible-member group progress), always labelled.
- Wise-like transition grammar for setup vs ongoing contribution flows.
- High-contrast, accessible colour roles planned from the start against **WCAG 2.2 AA** (PRS §10.1), informed by contrast discipline Observed in AllTrails/Wise (their docs may cite WCAG 2.1 — Observed only).

**Social accountability inheritance**

- Progress metaphor leans trail/journey (AllTrails spirit) without outdoor pastiche or map polylines.
- Milestones as waypoints (25/50/75/100%); streak as cadence along the path; recovery as rejoin, not restart shame.
- Social feed as “trail log” of permitted events (**approved MVP** event types).

**Atmosphere (creative recommendations)**

- Atmospheric backgrounds (subtle depth/gradient/texture) behind a full-bleed first-viewport composition: brand, one headline moment (challenge name or personal progress), one supporting line, CTA, dominant abstract/progress visual — avoiding dashboard clutter (aligns with project landing/composition preferences for branded surfaces; in-app screens stay task-focused).
- Colour: distinctive mid-tone accent + deep ink neutrals; prefer avoiding cream-serif and purple-gradient defaults as creative guidance.
- Motion: waypoint reveals; gentle path advance on contribution; reduce-motion static waypoints.

**What it optimises**

- Distinctive visual identity and emotional cohesion across marketing and product.
- Explaining unequal individual targets inside one shared challenge.

**Risks**

- Metaphor can become decorative and hurt **Trust Before Decorations** if amounts are secondary.
- Abstract journey visuals may feel vague without strong type/metric craft.
- Heavier illustration system cost if overbuilt for MVP.

**Best tested in Gate 2.2 via:** personal vs visible-group progress pairing; waypoint milestones; empty/paused/recovered states.

---

## 4. Comparison matrix (for review — no selection)

| Criterion | A Clear Companions | B Crew Momentum | C Shared Horizon |
| --- | --- | --- | --- |
| Fintech clarity signal | Strong | Medium-strong | Strong (if metrics stay primary) |
| Social energy signal | Medium | Strong | Medium-strong |
| Distinctiveness risk | May feel neobank-generic | May feel fitness-generic | May feel metaphor-heavy |
| Privacy labelling fit | Excellent | Good (needs care in roster) | Excellent |
| Consistency-over-wealth fit | Excellent | Good with guardrails | Excellent |
| Motion personality | Soft confirmations | Snappy crew feedback | Waypoint reveals |
| Likely MVP build complexity | Lower | Medium | Medium-higher (metaphor system) |
| Gate 2.2 exploration role | Clarity foundation (preferred hybrid) | Motivation foundation (preferred hybrid) | Legitimate alternative (preserved) |

---

## 5. Gate 2.2 creative direction (document only — do not start Gate 2.2 here)

**PO preference for next-stage exploration (not a final identity selection):**

1. **Prioritise a hybrid of Territory A + Territory B**
   - **A (Clear Companions)** as the foundation for **financial clarity** (amount hierarchy, calm chrome, honest labelling).
   - **B (Crew Momentum)** as the foundation for **social motivation** (crew presence, streak-before-feed sequencing, habit energy).
2. **Preserve Territory C (Shared Horizon)** as a **legitimate alternative** path if hybrid probes need a metaphor-led composition or if A+B explorations under-deliver on Distinctive Visual Identity.
3. **Do not select a final identity** in Gate 2.1 or at the start of Gate 2.2. Moodboards and studies remain exploratory until the product owner explicitly approves a direction.

**Recommended Gate 2.2 next steps (recommendations only — not started in this gate):**

1. Produce **moodboards + type/colour studies** for the A+B hybrid first, with at least a light C alternative board kept available — still non-final.
2. Draft **mobile IA + key user flows** (create challenge, join, record contribution, dashboard, privacy) without visual lock-in.
3. Stress-test each exploration against the checklist in `design-principles.md` §3 and Gate 1.1 UI states (private member, missed→recovered, paused, visible-member total), including **WCAG 2.2 AA** planning.
4. Keep kudos-style / one-tap encouragement labelled as **optional design exploration only** if probed.
5. Only after owner approval of a direction, proceed to wireframes / mid-fi (still Gate 2 — not implementation).

---

## 6. Provenance

Informed by `docs/design/research/competitor-analysis.md`, `design-principles.md`, `references.md`, and read-only product baseline under `docs/product/` (including `specification-v1.md` §15 and §10.1). No territory copies a competitor brand system; visual restrictions above are creative recommendations unless they restate frozen product rules.
