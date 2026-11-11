# Gate 2.2 — Moodboard C: Shared Horizon (alternative)

| Field | Value |
| --- | --- |
| Gate | 2.2 — Visual Identity Exploration |
| Status | Ready for product-owner direction review |
| Territory | **Legitimate alternative** — Shared Horizon (C) |
| Authority | Creative study only — not discarded; not selected |
| Accessibility | Plans against PRS §10.1 — **WCAG 2.2 AA** |
| Sample data | Same synthetic set as A+B · labelled self-reported |

---

## 1. Intent

Preserve **Shared Horizon** as a metaphor-led alternative: personal path and group horizon in one calm composition. Clarity and belonging share the first viewport without becoming a trail-map pastiche or decorative landscape that weakens Trust Before Decorations.

Role per `docs/design/research/opportunities.md` §5: available if A+B under-delivers on Distinctive Visual Identity or needs stronger dual-progress cohesion.

---

## 2. Shared sample content (identical to A+B)

| Element | Value |
| --- | --- |
| Challenge | Portugal 2027 |
| Purpose line | Save together for the trip |
| Viewer | Alex (you) |
| Personal progress | £1,240 of £2,000 · 62% · **Self-reported** |
| Weekly commitment | £50 |
| Streak (baseline) | 3 weeks |
| Visible-member total | £4,180 of £8,500 · **Visible members only** |
| Members | Alex (you), Sam, Riley, Jordan (**Private**) |
| Milestone in view | 50% — “Halfway to target” (G1.1-08) |

---

## 3. Visual artifacts

<img src="/cursor/stores/self/media/gate-2-2/moodboard-c-overview.jpg" alt="Shared Horizon moodboard: mist atmosphere, dual path/horizon progress, waypoint milestones" />

*Lighter C moodboard — dual composition, waypoints, recovery-as-rejoin.*

Comparable dashboard study: `/cursor/stores/self/media/gate-2-2/screen-dashboard-c.jpg` (see `docs/design/exploration/screens-dashboard.md`).

---

## 4. Working visual system (recommendation only — unlocked)

> Final logo, palette, type, and identity remain **open**.

### 4.1 Colour roles (proposed exploration tokens)

| Role | Working token | Hex (study) | Use |
| --- | --- | --- | --- |
| Mist | `surface.mist` | soft cool blue-grey atmosphere | Full-bleed first-viewport depth (not purple; not cream) |
| Path Ink | `text.primary` | `#1B2430` | Amounts, titles, path markers |
| Paper | `surface.content` | `#F7F9FB` | Content legibility over atmosphere |
| Waypoint Brass | `accent.waypoint` | `#8B7340` | Scarce milestone / CTA accent |
| Horizon Mute | `text.secondary` | `#5C6B7A` | Labels, visibility captions |
| Success / Caution / Privacy | semantic | aligned to WCAG pairs | Always icon + text |

**Deliberate non-clones:** not AllTrails neon greens or map polylines; not cream + terracotta serif; not purple-gradient SaaS.

### 4.2 Typography

| Tier | Working recommendation | Notes |
| --- | --- | --- |
| Display | Soft geometric with quiet character (e.g. **Outfit** display weights) | Challenge name / waypoint titles |
| UI / numerals | **Manrope** or **Source Sans 3** with tabular figures | Money stays clearest |

### 4.3 Spacing & composition

- First viewport as **one composition**: brand/challenge, personal path readout, one supporting line, CTA, dominant dual-progress visual
- Avoid dashboard clutter (stats strips, promo chips) in the hero
- Dual readouts always labelled: **My path** vs **Our horizon (visible members)**

### 4.4 Progress indicators

| Signal | Treatment (C) | Maps to |
| --- | --- | --- |
| Personal target | Path with waypoint marks at 25 / 50 / 75 / 100% | G1.1-08 |
| Visible-member total | Parallel “horizon” track, labelled | G1.1-06 |
| Weekly commitment | Cadence chip along the path | G1.1-03 |
| Recovery | “Rejoin” visual — new streak after miss; miss stays historical | G1.1-09 |
| Pause | Break in cadence marks — distinct from miss | G1.1-11 |

### 4.5 Status & milestone tone

- Same state vocabulary as A+B (Completed / Missed / Recovered / Paused / Private) with icon + text
- Milestones as **waypoints** with transparent rules
- Soft, inclusive tone — belonging without competitive ranking

### 4.6 Motion (planned)

- Waypoint reveal on milestone; gentle path advance on contribution
- Static waypoints when `prefers-reduced-motion` (PRS §10.1)

---

## 5. Risks called out for PO

- Metaphor can decorate over money if craft is weak — Trust Before Decorations must win
- Illustration system cost higher if overbuilt for MVP
- Atmosphere must never reduce contrast below WCAG 2.2 AA for text/amounts

---

## 6. Optional exploration only — not MVP

Encourage / kudos-analogue: same rule as A+B — **optional exploration only — not MVP** if shown.

---

## 7. Open items

- Whether C displaces or informs the A+B hybrid — **OPEN — requires product-owner approval.**
- Atmosphere intensity vs flat paper chrome — **OPEN — requires product-owner approval.**

---

## 8. Provenance

- `docs/design/research/opportunities.md` Territory C
- Same Gate 1 / 1.1 / research sources as `moodboard-ab.md` (read-only)
