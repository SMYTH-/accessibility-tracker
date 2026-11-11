# Mid-fidelity mobile prototype — index

| Field | Value |
| --- | --- |
| Pass | Authorised mid-fi after signed-off A+B wireframes (`fe206ee`) |
| Status | **Ready for PO review** — stop here |
| Fidelity | Interactive mid-fi click-through (plain HTML/CSS/JS) |
| Direction | **Clear Companions (A) + Crew Momentum (B)**; Shared Horizon (C) retained for personal vs sharing-member labelling |
| Accents | Deep Sea `#1A6B7C` · Honey Amber `#C9842A` — **working only** |
| Still open | Logo · final palette · type licensing / families |

---

## 1. How to open

Open the interactive prototype in a browser (no install) from this checkout:

`docs/design/mid-fi/index.html`

Or serve the folder locally, e.g. `python3 -m http.server` from `docs/design/mid-fi/`.

Sibling assets (`./styles.css`, `./app.js`) resolve relative to that folder. Screen captures live at `media/mid-fi/` (repo root) with a `docs/media/mid-fi/` mirror for `../../media/mid-fi/` embeds from under `docs/`.

Deep links: `#home` · `#challenge` · `#activity` · `#profile` · `#record` · `#confirm` · `#privacy` · `#join`

---

## 2. Deliverables

### Docs (`docs/design/mid-fi/`)

| File | Checkout path |
| --- | --- |
| `README.md` | `docs/design/mid-fi/README.md` |
| `walkthrough.md` | `docs/design/mid-fi/walkthrough.md` |
| `index.html` | `docs/design/mid-fi/index.html` |
| `styles.css` | `docs/design/mid-fi/styles.css` |
| `app.js` | `docs/design/mid-fi/app.js` |

### Media (`media/mid-fi/`)

| Screen | Checkout path |
| --- | --- |
| Dashboard | `media/mid-fi/dashboard.png` |
| Challenge activity | `media/mid-fi/challenge-activity.png` |
| Record savings | `media/mid-fi/record-savings.png` |
| Contribution confirm | `media/mid-fi/contribution-confirm.png` |
| Privacy settings | `media/mid-fi/privacy-settings.png` |
| Join disclosure | `media/mid-fi/privacy-disclosure-join.png` |

---

## 3. Connected flows

| # | Flow | Screens in prototype |
| --- | --- | --- |
| 1 | Dashboard | Home — personal £1,240/£2,000 · **Current 62%** · separate **50% Halfway** · **Your streak** · Sharing members only £3,080/£5,500 |
| 2 | Challenge activity | Roster (Alex / Sam **65%** / Riley 43% / Jordan Private) · sharing-member total · feed · no Leaderboard |
| 3 | Record savings | Amount entry → Confirm (required sharing-member copy) |
| 4 | Privacy | Settings (one opt-out + cannot-undo warning) · Join disclosure (before joining · ack prerequisite) |

Working bottom nav: **Home · Challenge · Activity · Profile** — **no Leaderboard**. Exact labels/count remain open.

---

## 4. Required copy / UX locked in this pass

- **Your streak** (never “Best streak” / “Challenge streak”)
- Confirm: *“Your contribution is included in the sharing-member total if you share monetary information.”*
- **50% Halfway** kept distinct from **62% current**
- Join: privacy disclosure **before** joining; acknowledgement prerequisite (Continue disabled until checked)
- Opt-out warning: **cannot undo what others already saw**
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
