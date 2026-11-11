# Gate 2.1 — Research-Informed Design Principles

| Field | Value |
| --- | --- |
| Gate | 2.1 — Design Research |
| Status | Ready for product-owner review |
| Provenance | Extends PRS §15; informed by competitor analysis; does not replace Gate 1 |
| Authority | Research guidance for Gate 2 exploration — not a product-rules amendment |

---

## 1. Relationship to Gate 1 (PRS §15)

The frozen Product Requirements Specification already approves six design discovery principles:

1. **Trust Before Decrations**
2. **Social by Design**
3. **Reward Meaningful Progress**
4. **Distinctive Visual Identity**
5. **Accessible and Predictable**
6. **Mobile First**

This document **does not rewrite, weaken, or contradict** those principles. It adds research-informed **working interpretations** and **Gate 2 application notes** so visual exploration stays aligned with:

- Fintech clarity analogs (Monzo, Wise, Trading 212)
- Social accountability analogs (Strava, AllTrails)
- Approved product behaviours (including Gate 1.1), without inventing new requirements

| Source | Role |
| --- | --- |
| PRS §15 | Authoritative design discovery principles |
| This file | Research elaboration for Gate 2 |
| `competitor-analysis.md` / `references.md` | Evidence base |
| `opportunities.md` | Creative territories (unselected) |

---

## 2. Working principles (research-informed)

Each working principle below maps to one or more PRS §15 principles. **Observed** insights summarise competitor research; **Recommendation** states how to apply them in Gate 2 without selecting a final identity.

### P1 — Money must read as trustworthy first

**Maps to:** Trust Before Decorations; Accessible and Predictable

**Observed:** Monzo and Wise put a single primary amount at the top of attention; supporting context (goal, progress, labels) sits in a stable secondary tier. Trading 212 reserves accent colour for actions, not decoration. Wise documents accessible content greys and colour pairings.

**Recommendation:** Every screen that shows money should answer, in order: *what is this number?*, *whose is it?*, *is it self-reported?*, *who can see it?* Decoration, illustrations, and motion may support understanding but must never compete with the figure or its labels. Visible-member totals must be labelled as such (G1.1-06).

### P2 — Social proof is structural, not a bolt-on tab

**Maps to:** Social by Design; Mobile First

**Observed:** Strava’s home answers personal status before the community feed; challenges and clubs are first-class. AllTrails expands community activity as inspiration. Fintech products that treat “social” as a marketing badge feel empty.

**Recommendation:** Shared challenge context, permitted activity, and encouragement should appear inside core journeys (dashboard, contribution success, milestones). Social features follow privacy rules; they do not require composing posts to participate.

### P3 — Celebrate consistency, not comparative wealth

**Maps to:** Reward Meaningful Progress; Trust Before Decorations

**Observed:** Strava streaks and named achievements emphasise showing up; Monzo celebrates reaching a pot goal; competitive “who saved most” framing is common in finance social experiments and undermines peer support.

**Recommendation:** Visual and verbal rewards should emphasise weekly commitments kept, automatic recovery after misses, pauses without shame, and personal progress milestones (25/50/75/100%). Avoid leaderboards or motifs that rank friends by amount saved.

### P4 — One scarce accent; calm financial chrome

**Maps to:** Distinctive Visual Identity; Trust Before Decorations

**Observed:** Strava Orange, Trading 212 cyan, and Monzo coral work because they are scarce. Wise product UI is mostly white/neutral with green used for interaction. Over-colouring reads as marketing, not money trust.

**Recommendation:** Gate 2 territories should propose a **unique** primary accent (not coral / Wise green / Strava orange / Trading cyan) used for primary actions and key highlights. Surfaces that hold balances and commitments stay calm. Avoid generic SaaS purple gradients, cream-serif fintech clichés, and dark-mode-default trading UIs.

### P5 — Progress is a story with transparent rules

**Maps to:** Reward Meaningful Progress; Social by Design

**Observed:** Strava achievements state earning rules in plain language; Monzo shows goal + bar under balance; AllTrails explains difficulty in place. Opaque badges erode trust.

**Recommendation:** Progress visuals (bars, rings, tracks — medium TBD) must encode approved rules: personal target %, weekly commitment state, milestone thresholds, streak with recovery. Users should be able to explain a status chip in one sentence.

### P6 — Recognition stays lightweight and opt-in to intensity

**Maps to:** Social by Design; Reward Meaningful Progress

**Observed:** Kudos-style one-tap recognition sustains feeds without forcing commentary. Heavy composition feeds raise friction and noise.

**Recommendation:** Design for a low-effort encouragement pattern on eligible activity. Escalation (comments, longer messages) can be secondary if product scope already allows activity discussion — do not invent new social product requirements here.

### P7 — Motion explains change; silence is an accessibility feature

**Maps to:** Accessible and Predictable; Distinctive Visual Identity

**Observed:** Wise motion is snappy but not nauseating, with pause controls for long auto-motion; Monzo respects reduce-motion; AllTrails uses motion to focus selected achievements.

**Recommendation:** Use short, purposeful motion for contribution confirmation, progress fill, and milestone celebration. Honour `prefers-reduced-motion` with equivalent non-animated feedback. Never flash status colours rapidly.

### P8 — Predictable patterns, non-generic skin

**Maps to:** Accessible and Predictable; Distinctive Visual Identity; Mobile First

**Observed:** Wise transition grammar (new flow vs continuation) reduces disorientation; AllTrails pairs explicit and advanced gestures; Material-like components aid predictability when restyled.

**Recommendation:** Prefer established mobile patterns (bottom nav, sheets, clear back stacks) informed by Material Design 3 behaviour where helpful, while the visual system remains brand-owned. Core journeys must work on mobile browsers first and scale to desktop without a second information architecture.

### P9 — Privacy is a visible design material

**Maps to:** Trust Before Decorations; Social by Design

**Observed:** Strava activity visibility controls; Monzo hide/lock pots; Wise stash explorations emphasise visibility friction. Social finance fails when privacy is buried.

**Recommendation:** Privacy opt-out (amounts **and** targets hidden from others; exclusion from others’ visible aggregates — G1.1-06) should have clear, calm UI states. Private members remain people in the group, not missing data bugs. Design must prevent reliable inference of hidden amounts.

### P10 — Self-reported honesty over faux-bank chrome

**Maps to:** Trust Before Decorations; Distinctive Visual Identity

**Observed:** Banks and investment apps imply custody and verification through dense “secure terminal” aesthetics. Accountability Tracker explicitly does not hold money; MVP contributions are self-reported.

**Recommendation:** Visual language should feel trustworthy and motivating without mimicking regulated banking terminals or portfolio traders. Prefer human, social, clear finance — not vault iconography that implies custody.

---

## 3. Principle checklist for Gate 2.2 exploration

When territories, moodboards, or flows are proposed, each concept should pass:

| Check | Pass if… |
| --- | --- |
| §15 intact | No principle above conflicts with the six PRS §15 statements |
| Trust | Primary amounts remain the clearest element |
| Social | Challenge/shared progress is not optional chrome |
| Consistency | Celebrations emphasise habits/milestones over wealth rank |
| Distinctive | Accent/type/atmosphere are not clones of Monzo/Wise/T212/Strava/AllTrails or generic AI-SaaS looks |
| Accessible | Contrast, focus, labels, reduce-motion, and non-colour status are planned |
| Mobile first | Thumb-reach primary actions; desktop is an expansion, not a redesign |
| Spec-safe | No new product requirements smuggled in as “design needs” |

---

## 4. Explicit non-goals (this gate)

- Final logo, colour tokens, or type licensing decisions
- Component libraries, wireframes, or UI kits (Gate 2.2+)
- Changes to PRS, Gate 1.1, or reconciled product docs
- Selecting a single creative territory (`opportunities.md` proposes three)

---

## 5. Provenance note

Authored for Gate 2.1 from:

- `/cursor/stores/self/docs/product/specification-v1.md` §15 (authoritative)
- `/cursor/stores/self/docs/product/vision.md` (aligned restatement)
- `/cursor/stores/self/docs/product/amendments/gate-1-1-product-rules.md` (behaviour constraints affecting UI states)
- `/cursor/stores/self/docs/design/research/competitor-analysis.md`
- `/cursor/stores/self/docs/design/research/references.md`
