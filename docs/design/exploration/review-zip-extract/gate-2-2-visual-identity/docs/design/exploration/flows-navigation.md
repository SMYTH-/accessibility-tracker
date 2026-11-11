# Gate 2.2 — Lightweight navigation & flow sketches

| Field | Value |
| --- | --- |
| Gate | 2.2 — Visual Identity Exploration |
| Fidelity | Lightweight sketches — **not** wireframe package / mid-fi |
| Direction | A+B approved |
| IA labels | Working proposals only |

---

## 1. Visual sketch

<img src="../../media/gate-2-2/flows-navigation-sketch.jpg" alt="Bottom nav and four flows including single monetary privacy toggle" />

---

## 2. Working mobile shell (proposal)

| Tab | Job | Notes |
| --- | --- | --- |
| Home | Personal status + active challenges | “How am I doing?” first |
| Challenge | Roster, sharing-member totals, rules | First-class |
| Activity | Event-generated feed | Privacy-filtered |
| Profile | Settings, **one** monetary privacy control, account | Target setup; pause entry exists in product — **no invented resume/max-duration flow** |

Exact labels and tab count — **OPEN — requires product-owner approval.**

---

## 3. Flow sketches

Transition cue (creative): **upward / new sheet** = new task; **sideways** = continuation; **sheet** = supplementary edit.

### 3.1 Create challenge

```
Home → Create (new)
  → Name + description
  → Start / end dates + time zone
  → Review → Draft / Scheduled (G1.1-02)
  → Optional: invite friends
  → Owner may defer personal target / weekly commitment (G1.1-01, G1.1-03, G1.1-04)
```

Owner without activated savings participation is **not** assessed for missed commitments (G1.1-01).

Activation conditions — **OPEN — requires product-owner approval.**

### 3.2 Invite / join

```
Owner: Challenge → Invite → share private link (expires 7 days default — G1.1-14)
Invitee preview (G1.1-07) may show ONLY:
  name · description · start · end · participant count
Must NOT show: targets, amounts, financial totals, member financial activity
→ Request join → Owner approval → Financial privacy acknowledgement
→ Configure personal target + weekly commitment before recording savings
```

### 3.3 Record contribution

```
Home / Challenge → Record savings (primary)
  → Amount + date (within permitted period)
  → Confirm (eligibility — G1.1-05)
  → Success (see screens-contribution-confirm.md)
  → Updates: personal progress, commitment assessment, milestones, activity (privacy-aware)
```

Backdating / week allocation — **OPEN — requires product-owner approval** (do not invent).

### 3.4 Privacy settings — **one** monetary control (G1.1-06)

```
Profile → Privacy
  → Single toggle: Share monetary information
  → Explainer: when off, hides amounts AND individual target from others;
    excludes you from others’ sharing-member aggregates
  → Preview: how roster / totals appear to friends
  → Save → applied across feed, exports, notifications
```

- Do **not** offer separate toggles for amounts vs targets  
- Self always sees own authorised financial information  

### 3.5 Pause (status only — no invented behaviour)

Product allows prospective pauses (G1.1-11). Exploration may show a **Paused** status chip distinct from Completed/Missed.

**Do not** invent or mock:

- Maximum pause duration  
- Resume scheduling / auto-resume rules  
- Retroactive pause  

Those remain **OPEN — requires product-owner approval.**

---

## 4. Hierarchy reminder

| Moment | Personal progress | Weekly commitment | Sharing-member aggregate | Activity |
| --- | --- | --- | --- | --- |
| Home | Primary | Strip | Secondary, labelled | Preview |
| Challenge | Roster row | Strip / history | Labelled total | Full feed |
| After contribution | Updated hero | Chip state | May update for sharers | New event |

---

## 5. Explicit stop

No wireframes / mid-fi in this pack. See `decision-summary.md` for approved A+B direction and open identity items.
