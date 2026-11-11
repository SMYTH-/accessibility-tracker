# Mid-fidelity mobile prototype — index

| Field | Value |
| --- | --- |
| Pass | Mid-fi re-review after PO gaps on `58957a4` (wireframes `fe206ee`) |
| Status | **Ready for PO re-review** — stop here |
| Fidelity | Interactive mid-fi click-through (plain HTML/CSS/JS) |
| Direction | **Clear Companions (A) + Crew Momentum (B)**; Shared Horizon (C) retained for personal vs sharing-member labelling |
| Accents | Deep Sea `#1A6B7C` · Honey Amber `#C9842A` — **working only** |
| Still open | Logo · final palette · type licensing / families |

---

## 1. How to open

Open the interactive prototype in a browser (no install):

`/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/docs/design/mid-fi/index.html`

Or serve the folder locally, e.g. `python3 -m http.server` from `docs/design/mid-fi/`.

Deep links: `#home` · `#challenge` · `#activity` · `#profile` · `#record` · `#confirm` · `#privacy` · `#join`

---

## 2. Deliverables

### Docs (`docs/design/mid-fi/`)

| File | Absolute path |
| --- | --- |
| `README.md` | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/docs/design/mid-fi/README.md` |
| `walkthrough.md` | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/docs/design/mid-fi/walkthrough.md` |
| `index.html` | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/docs/design/mid-fi/index.html` |
| `styles.css` | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/docs/design/mid-fi/styles.css` |
| `app.js` | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/docs/design/mid-fi/app.js` |

### Media (`media/mid-fi/`)

| Screen | Absolute path |
| --- | --- |
| Dashboard (before £50) | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/mid-fi/dashboard.png` |
| Dashboard (after £50) | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/mid-fi/dashboard-after.png` |
| Challenge activity | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/mid-fi/challenge-activity.png` |
| Challenge · approved-member view (Alex opted out) | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/mid-fi/challenge-member-view.png` |
| Record savings | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/mid-fi/record-savings.png` |
| Contribution confirm | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/mid-fi/contribution-confirm.png` |
| Privacy settings | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/mid-fi/privacy-settings.png` |
| Join disclosure | `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/mid-fi/privacy-disclosure-join.png` |

---

## 3. Connected flows

| # | Flow | Screens in prototype |
| --- | --- | --- |
| 1 | Dashboard | Starts **£1,190 / 60%** · separate **50% Halfway** · after Done **£1,240 / 62%** · Sharing members only £3,030→£3,080 |
| 2 | Challenge activity | Roster (Alex / Sam **65%** / Riley 43% / Jordan Private) · sharing-member total · feed · no Leaderboard |
| 3 | Record savings | Fixed £50 · Confirm (was £1,190 → £1,240) · required sharing-member copy · Done updates Home |
| 4 | Privacy | Opt-out Save → **simulated approved-member view** (Alex Private · £1,840/£3,500) · self still sees own figures · Join disclosure |

Working bottom nav: **Home · Challenge · Activity · Profile** — **no Leaderboard**. Exact labels/count remain open.

---

## 4. Required copy / UX locked in this pass

- **Your streak** (never “Best streak” / “Challenge streak”)
- Confirm: *“Your contribution is included in the sharing-member total if you share monetary information.”*
- **50% Halfway** kept distinct from current % (60% before / 62% after)
- Fixed £50 beat: dashboard **£1,190 → £1,240** after confirm Done
- Join: privacy disclosure **before** joining; acknowledgement prerequisite (Continue disabled until checked)
- Opt-out warning: **cannot undo what others already saw**
- Opt-out **Save** connects to simulated approved-member challenge view
- Sharing-member total labelling per **G1.1-06** (not full-group total)
- No Leaderboard tab
- Encourage / kudos omitted (not MVP)

---

## 5. OPEN — requires product-owner approval

Flagged in-prototype and below (do not invent):

- Exact IA tab labels / count
- Progress control metaphor (bar vs path) — bar used as working mid-fi only
- Contribution backdating / week allocation (G1.1-05)
- Exact post-confirm navigation
- Pause duration / resume (G1.1-11) — status only here
- Streak milestone thresholds (G1.1-08)
- Small-group aggregate privacy edge cases (G1.1-06)
- Challenge activation conditions (G1.1-02)
- Exact join / setup step count
- Feed concatenation for noisy join events
- Logo · final palette · type families / licensing
- WCAG 2.2 AA verification methodology for Honey Amber pairs

---

## 6. Sources (read-only)

- `docs/product/specification-v1.md`
- `docs/product/amendments/gate-1-1-product-rules.md`
- `docs/design/wireframes/` (signed-off at `fe206ee`)
- `docs/design/exploration/decision-summary.md`

---

## 7. Explicit stop

**Mid-fi prototype complete — return for PO review.**

| Allowed next (after PO approval) | Do **not** do now |
| --- | --- |
| Application implementation (separate approval) | Amend frozen product docs |
| Identity lock (logo / palette / type) | npm / Next.js / product-app scaffolding |
| Resolve OPEN product rules | Invent pause resume, backdating, or edge-case privacy UI |

Local watched-folder re-sync: **coordinator-dispatched**.
