# Wireframes — Flows overview (mobile)

| Field | Value |
| --- | --- |
| Pass | A+B mobile wireframes — correction before PO sign-off |
| Fidelity | Flow map tying wireframe screens — **not** mid-fi |
| IA labels | Working proposals only |

---

## Working mobile shell (proposal)

| Tab | Job |
| --- | --- |
| Home | Personal status + active challenges (“How am I doing?” first) |
| Challenge | Roster, sharing-member totals, rules |
| Activity | Event-generated feed (privacy-filtered) |
| Profile | Settings, **one** monetary privacy control, account |

Exact labels and tab count — **OPEN — requires product-owner approval.**

---

## Hierarchy reminder

| Moment | Personal progress | Weekly commitment / Your streak | Sharing-member aggregate | Activity / privacy |
| --- | --- | --- | --- | --- |
| Home / Dashboard | Primary (£1,240/£2,000 · **62%**) + separate **50% Halfway** | Strip | Secondary, labelled | Preview |
| Challenge | Roster row | Strip before feed | Labelled total | Full feed |
| After contribution | Updated hero | Chip state · streak 3 | May update for sharers | New event |
| Privacy | Self always sees own | — | Scope labelled Sharing members only | Opt-out control |

Retain **Shared Horizon (C)** naming intuition: personal path vs sharing-member aggregate — without adopting C chrome.

---

## 1. Create challenge

```
Home → Create (new sheet)
  → Name + description
  → Start / end dates + time zone
  → Review → Draft / Scheduled (G1.1-02)
  → Optional: invite friends
  → Owner may defer personal target / weekly commitment (G1.1-01, G1.1-03, G1.1-04)
```

Owner without activated savings participation is **not** assessed for missed commitments (G1.1-01). Activation conditions — **OPEN**.

---

## 2. Invite / join

```
Owner: Challenge → Invite → private link (expires 7 days default — G1.1-14)
Invitee preview (G1.1-07) may show ONLY:
  name · description · start · end · participant count
Must NOT show: targets, amounts, financial totals, member financial activity
→ Financial privacy disclosure BEFORE joining (see privacy-flow.md)
  · Warning: opting out cannot undo what others already saw
  · Acknowledgement is a prerequisite (Continue disabled until checked)
→ Request join → Owner approval
→ Configure personal target + weekly commitment before recording savings
```

---

## 3. Record contribution

```
Home / Challenge → Record savings
  → Amount + date (see contribution-flow.md Step A)
  → Confirm (Step B)
  → Updates personal progress, commitment, milestones, privacy-aware activity
```

Canonical confirm sample: Saved £50 → personal **£1,240 of £2,000 (62%)** · separate **50% Halfway already reached** · **Your streak 3**.

Both contribution screens explain **whose contributions** are in the sharing-member total: **Alex, Sam, Riley** included; **Jordan** excluded (Sharing members only).

Backdating / week allocation — **OPEN**.

---

## 4. Privacy

```
Invite preview → Financial privacy disclosure BEFORE joining
  → Acknowledgement prerequisite → Request join → …
Profile → Privacy (one monetary control)
  → Warning: opting out cannot undo what others already saw
```

Default = visible to approved challenge members; **opt-out** hides amounts **and** target; aggregates = **sharing members only** (G1.1-06). Bottom nav: **no Leaderboard**.

---

## 5. Pause (status only)

Product allows prospective pauses (G1.1-11). Wireframes may show a **Paused** status chip distinct from Completed / Missed elsewhere in states work.

**Do not** invent: max pause duration, resume scheduling, auto-resume, retroactive pause.

---

## Screen map

| Flow step | Wireframe doc | Media |
| --- | --- | --- |
| Dashboard / Home | `dashboard.md` | `media/wireframes/dashboard-home.jpg` |
| Challenge roster + activity | `challenge-activity.md` | `media/wireframes/challenge-activity.jpg` |
| Record → amount | `contribution-flow.md` | `media/wireframes/contribution-amount.jpg` |
| Record → confirm | `contribution-flow.md` | `media/wireframes/contribution-confirm.jpg` |
| Privacy settings | `privacy-flow.md` | `media/wireframes/privacy-settings.jpg` |
| Join disclosure | `privacy-flow.md` | `media/wireframes/privacy-disclosure-join.jpg` |
