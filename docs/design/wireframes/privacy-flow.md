# Wireframes — Privacy settings & disclosure (mobile)

| Field | Value |
| --- | --- |
| Pass | A+B mobile wireframes — correction before PO sign-off |
| Fidelity | Low / annotated wireframe — **not** mid-fi |
| Rule | G1.1-06 (privacy / sharing-member totals); G1.1-07 (invite preview constraints) |
| Viewport | Mobile only |

---

## Artifact A — Privacy settings (one monetary control)

<img src="../../../media/wireframes/privacy-settings.jpg" alt="Privacy settings: default visible, opt-out OFF, warning cannot undo prior visibility, Home Challenge Activity Profile nav" />

Path: `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/wireframes/privacy-settings.jpg`

### Structure

| Block | Treatment |
| --- | --- |
| Default copy | Monetary information is visible to **approved challenge members** by default |
| Control | **One** toggle: **Hide monetary information (opt-out)** — default **OFF** |
| **Warning** | **Opting out cannot undo what others already saw.** |
| When ON | Hides **amounts AND individual target**; excludes member from **Sharing members only** aggregates |
| Self view | User always sees own authorised financial information |
| Preview | Default: Alex · £1,240 of £2,000 · Self-reported · Opted out: Alex · Private · no amount · no target |
| Totals labelling | **Sharing members only** — not full group |
| Save | Applies across feed, exports, notifications (product rule) |
| Bottom nav | **Home · Challenge · Activity · Profile** only — **no Leaderboard** |

### Must not

- Say “private by default” or imply opt-in-to-share as the default
- Offer separate toggles for amounts vs targets
- Show a Leaderboard tab
- Invent small-group aggregate edge-case UI (open product question)

---

## Artifact B — Financial privacy disclosure **before joining**

<img src="../../../media/wireframes/privacy-disclosure-join.jpg" alt="Financial privacy before join: disclosures, cannot-undo warning, acknowledgement prerequisite, Continue to request join disabled until checked" />

Path: `/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/wireframes/privacy-disclosure-join.jpg`

### Structure

| Block | Treatment |
| --- | --- |
| Placement | **Before joining** (after invite preview; before request join) |
| Context | Challenge name only (Portugal 2027) — invite preview never exposed amounts (G1.1-07) |
| Disclosure 1 | Default: amounts + target visible to approved challenge members after you join |
| Disclosure 2 | Opt-out **Hide monetary information** hides amounts **and** target; excludes from Sharing members only totals |
| Disclosure 3 | You always see your own figures |
| **Warning** | **Opting out cannot undo what others already saw.** |
| Ack | Checkbox: I understand how monetary visibility works — **prerequisite** |
| Primary | **Continue to request join** — **disabled until acknowledgement is checked** |
| Secondary | Cancel / back to invite preview |

### Image correction note

Any multi-step progress indicator is **illustrative only**. Exact join/setup step count remains **OPEN — requires product-owner approval.**

---

## Flow

```
Profile → Privacy
  → Default copy (approved challenge members)
  → Single opt-out: Hide monetary information
  → Warning: opting out cannot undo what others already saw
  → Explainer + roster/total preview
  → Save

Invite preview (G1.1-07 — no amounts)
  → Financial privacy disclosure (BEFORE joining)
  → Acknowledgement required (Continue disabled until checked)
  → Request join → Owner approval
  → Configure personal target + weekly commitment
  → Then recording savings is allowed
```
