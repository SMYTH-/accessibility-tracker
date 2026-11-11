# A+B mobile wireframes — index & review notes

| Field | Value |
| --- | --- |
| Pass | Authorised design pass after Gate 2.2 A+B approval |
| Status | **Ready for PO review** — stop here |
| Fidelity | Mobile wireframes only (grayscale / lightly annotated) |
| Not authorised yet | Mid-fi polish · implementation · components · installs |
| Direction | **Clear Companions (A) + Crew Momentum (B)**; **Shared Horizon (C)** retained as personal vs sharing-member reference |
| Accents | Deep Sea / Honey Amber may be noted lightly later — **logo, final palette, type remain open** |

---

## 1. Deliverables

### Docs (`docs/design/wireframes/`)

| File | Contents |
| --- | --- |
| `README.md` | This index + review notes |
| `dashboard.md` | Home / personal-first dashboard |
| `challenge-activity.md` | Roster + sharing-member total + feed |
| `contribution-flow.md` | Amount entry + confirmation |
| `privacy-flow.md` | Settings (one opt-out) + join disclosure |
| `flows-overview.md` | Create / invite / join / record / privacy map |

### Media (`media/wireframes/`)

| File | Checkout path |
| --- | --- |
| `dashboard-home.jpg` | `media/wireframes/dashboard-home.jpg` |
| `challenge-activity.jpg` | `media/wireframes/challenge-activity.jpg` |
| `contribution-amount.jpg` | `media/wireframes/contribution-amount.jpg` |
| `contribution-confirm.jpg` | `media/wireframes/contribution-confirm.jpg` |
| `privacy-settings.jpg` | `media/wireframes/privacy-settings.jpg` |
| `privacy-disclosure-join.jpg` | `media/wireframes/privacy-disclosure-join.jpg` |

---

## 2. Canonical sample (locked)

| Element | Value |
| --- | --- |
| Challenge | Portugal 2027 |
| Personal (Alex) | **£1,240 of £2,000** · **Current 62%** · Self-reported |
| Milestone (separate) | **50% Halfway · reached** — not merged into 62% |
| Weekly commitment | **£50** · Completed this week |
| Streak | **Your streak · 3 weeks** |
| Sharing-member total | **£3,080 of £5,500** · **Sharing members only** |
| Roster | Alex / Sam £980 of £1,500 / Riley £860 of £2,000 (43%) / Jordan **Private** |
| Privacy default | Visible to **approved challenge members**; **opt-out** hides amounts **and** target |

---

## 3. Hierarchy annotations (review checklist)

- [x] Personal progress primary
- [x] **50% milestone** shown separately from **62% current**
- [x] Weekly commitment + **Your streak**
- [x] Sharing-member aggregate labelled (not full-group total)
- [x] Privacy cues (Private lock; default ≠ private-by-default)
- [x] Synthetic **self-reported** labelling
- [x] Pause treated as status-only — no invented duration/resume
- [x] Encourage / kudos omitted (non-MVP)
- [x] Frozen product docs **not** modified

---

## 4. Sources respected (read-only)

- `docs/product/specification-v1.md`
- `docs/product/amendments/gate-1-1-product-rules.md` (esp. G1.1-06, 08, 09, 11)
- `docs/design/exploration/` (decision-summary, screens-*, flows-navigation, states-accessibility)
- `docs/design/research/`

---

## 5. Explicit stop

**Wireframes complete — return for PO review.**

| Allowed next (after PO approval) | Do **not** do now |
| --- | --- |
| Mid-fi / interactive prototype | Mid-fi polish in this pack |
| Identity refinement (logo/type/palette) | Application code, deps, components |
| Resolve open IA / pause / backdating questions | Amend Gate 1 / 1.1 product docs |

Local watched-folder re-sync: **coordinator-dispatched** after Context lands — not from this worker.

---

## 6. Artifact caveats (for reviewers)

Wireframe images are structure studies. Prefer markdown hierarchy tables when an image label drifts (e.g. “Best streak” → **Your streak**; non-canonical bottom-nav icons; illustrative join step counts). Content authority for sample figures and privacy copy is this pack’s markdown + Gate 2.2 reconciled set.
