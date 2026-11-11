# Gate 2.1 — Design Opportunities & Creative Territories

| Field | Value |
| --- | --- |
| Gate | 2.1 — Design Research |
| Status | Ready for product-owner review |
| Selection | **None selected** — three territories proposed for Gate 2.2 exploration |
| Creative preference (research) | Fintech clarity + social accountability |

---

## 1. Opportunity summary

Research across Monzo, Wise, Trading 212, Strava, and AllTrails shows a clear white space:

> **Friend-group savings accountability that feels as clear as a modern money app and as motivating as a social activity club — without looking like a bank terminal, a trading desk, or a generic SaaS dashboard.**

Accountability Tracker already owns the product mechanics (private challenges, individual targets, weekly commitments, self-reported contributions, privacy, streaks with recovery, progress milestones). Design opportunity is how those mechanics **feel** together.

### Opportunity themes (Observed → Recommendation)

| Theme | Observed elsewhere | Opportunity for Accountability Tracker |
| --- | --- | --- |
| Dual hierarchy | Fintech heroes a balance; Strava heroes a streak then a feed | Compose **personal money clarity** and **group energy** in one mobile viewport without dashboard clutter |
| Generated social | Activity cards need no essay | Treat eligible contributions / commitments / milestones as the feed engine |
| Honest labelling | Strong products name what numbers mean | Make “self-reported” and “visible members” feel premium-clear, not apologetic |
| Soft recovery | Streaks and pauses exist, but many UIs still punish | Visualise miss → recover → continue as a supportive arc |
| Distinctive hybrid | Pure fintech or pure fitness brands | Own a hybrid territory neither cluster fully occupies |

---

## 2. Constraints on all territories

Every territory below must:

- Honour PRS §15 and `/cursor/stores/self/docs/design/research/design-principles.md`
- Support Gate 1 / 1.1 behaviours (privacy, visible-member totals, milestones, recovery, pauses) without inventing requirements
- Combine fintech clarity **and** social accountability (not pick only one cluster)
- Avoid cloning Monzo coral, Wise green, Strava orange, Trading 212 cyan, AllTrails neon trail green, or generic AI-SaaS looks
- Remain mobile-first responsive web, not native-fitness or native-banking clones

---

## 3. Three proposed creative territories

> These are **directional creative frames** for Gate 2.2 moodboards and exploration. They are not final visual identities, not selected, and not product decisions.

---

### Territory A — “Clear Companions”

**One-line pitch:** Warm fintech clarity with friendship sitting beside every number.

**Fintech clarity inheritance**

- Large, calm personal amounts and commitment status (Monzo/Wise hierarchy discipline).
- Scarce accent on primary actions only (Trading 212 scarcity lesson, new accent).
- Generous whitespace; content greys for secondary labels.

**Social accountability inheritance**

- Challenge members and recent encouragement appear as a human strip near progress, not a separate “social product.”
- Feed is quiet and event-based (Strava loop), but cards look like clear receipts of effort rather than athletic maps.

**Atmosphere**

- Light, airy surfaces; soft photographic texture of friends/goals used sparingly as atmosphere (not inset cards in the hero).
- Typography: confident humanist sans for UI + a slightly warmer display for celebrations (not Inter-as-brand, not Monzo Sans).
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

**Fintech clarity inheritance**

- Metric grids with tabular numerals for amount, %, commitment state (Strava/Trading density without dark trading chrome).
- Explicit status chips (active, paused, recovered, private) with icon + text.

**Social accountability inheritance**

- Personal streak / commitment strip before the crew feed (Strava sequencing).
- Challenge feels like a crew board: shared purpose title, individual targets as roster rows, lightweight kudos-analogue.
- Achievement moments named like AllTrails/Strava titles (“Halfway to target”) with transparent rules.

**Atmosphere**

- Higher visual tempo: bolder accent blocks for challenge headers; rhythmic list of crew activity.
- Still light-mode default; accent used in headers and success states more bravely than Territory A, but not full-bleed brand colour behind balances.
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

**Fintech clarity inheritance**

- Dual readouts designed as one composition: *my path* (personal target progress) and *our horizon* (visible-member group progress), always labelled.
- Wise-like transition grammar for setup vs ongoing contribution flows.
- High-contrast, accessible colour roles planned from the start (AllTrails/Wise contrast discipline).

**Social accountability inheritance**

- Progress metaphor leans trail/journey (AllTrails spirit) without outdoor pastiche or map polylines.
- Milestones as waypoints (25/50/75/100%); streak as cadence along the path; recovery as rejoin, not restart shame.
- Social feed as “trail log” of permitted events.

**Atmosphere**

- Atmospheric backgrounds (subtle depth/gradient/texture) behind a full-bleed first-viewport composition: brand, one headline moment (challenge name or personal progress), one supporting line, CTA, dominant abstract/progress visual — avoiding dashboard clutter (aligns with project landing/composition preferences for branded surfaces; in-app screens stay task-focused).
- Colour: distinctive mid-tone accent + deep ink neutrals; avoid cream-serif and purple-gradient defaults.
- Motion: waypoint reveals; gentle path advance on contribution; reduce-motion static waypoints.

**What it optimises**

- Distinctive visual identity and emotional cohesion across marketing and product.
- Explaining unequal individual targets inside one shared challenge.

**Risks**

- Metaphor can become decorative and hurt Trust Before Decorations if amounts are secondary.
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

---

## 5. Recommended Gate 2.2 next steps (recommendations only)

1. **Product-owner picks** which territory (or hybrid axes) to explore first — research does **not** select.
2. Produce **moodboards + type/colour studies** for the chosen frame(s), still non-final.
3. Draft **mobile IA + key user flows** (create challenge, join, record contribution, dashboard, privacy) without visual lock-in.
4. Stress-test each exploration against the checklist in `design-principles.md` §3 and Gate 1.1 UI states (private member, missed→recovered, paused, visible-member total).
5. Only after owner approval of a direction, proceed to wireframes / mid-fi (still Gate 2 — not implementation).

---

## 6. Provenance

Informed by `/cursor/stores/self/docs/design/research/competitor-analysis.md`, `design-principles.md`, `references.md`, and read-only product baseline under `/cursor/stores/self/docs/product/`. No territory copies a competitor brand system.
