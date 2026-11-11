# Wireframes — Contribution flow (mobile)

| Field | Value |
| --- | --- |
| Pass | A+B mobile wireframes — authorised structure pass |
| Fidelity | Low / annotated wireframe — **not** mid-fi |
| Direction | A+B |
| Viewport | Mobile only |
| Sample | Synthetic · self-reported · confirm beat reconciled |

---

## Artifacts

### Step A — Amount entry

<img src="../../media/wireframes/contribution-amount.jpg" alt="Record savings wireframe: £50 amount, date, self-reported labelling, Continue to confirm" />

Path: `media/wireframes/contribution-amount.jpg` (checkout); embed via `../../media/wireframes/contribution-amount.jpg`

| Element | Wireframe treatment |
| --- | --- |
| Title | Record savings |
| Challenge | Portugal 2027 |
| Amount | **£50** (primary) |
| Date | Within permitted period (sample date only) |
| Labelling | **Self-reported** · not a bank deposit |
| Helper | Updates personal progress + weekly commitment |
| Privacy note | Sharing-member totals update only for friends who share (G1.1-06) |
| Actions | Cancel · Continue to confirm |

No invented backdating / week-allocation UI (G1.1-05 open items remain open).

### Step B — Confirmation

<img src="../../media/wireframes/contribution-confirm.jpg" alt="Contribution confirm: Saved £50, personal £1,240/£2,000 at 62%, separate 50% Halfway already reached, Your streak 3, Done" />

Path: `media/wireframes/contribution-confirm.jpg` (checkout); embed via `../../media/wireframes/contribution-confirm.jpg`

### Confirm hierarchy (reconciled beat)

| # | Beat | Content |
| --- | --- | --- |
| 1 | Confirmation amount | Saved **£50** · **Self-reported** |
| 2 | Personal progress | Now **£1,240 of £2,000** · **Current 62%** (from £1,190) |
| 2b | Milestone (separate) | **50% Halfway milestone · already reached** — not conflated with 62% |
| 3 | Weekly commitment | Completed this week · **Your streak · 3 weeks** |
| 4 | Sharing-member note | Totals update for friends who share — distinct from personal figures |
| 5 | Tone | Supportive, non-punitive (placeholder copy in wireframe) |
| 6 | CTA | **Done** |

Encourage / kudos **omitted** (optional exploration only — not MVP).

---

## Flow

```
Home / Challenge → Record savings
  → Amount + date (within permitted period)
  → Confirm eligibility (G1.1-05)
  → Success (this confirm hierarchy)
  → Updates: personal progress, commitment assessment, milestones, activity (privacy-aware)
```

---

## Open

- Exact post-confirm navigation — **OPEN — requires product-owner approval.**
- Contribution backdating / week allocation — **OPEN — requires product-owner approval.**
