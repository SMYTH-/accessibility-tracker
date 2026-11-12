# M2 — Challenge creation & lifecycle (plan only)

| Field | Value |
| --- | --- |
| Document | M2 challenge creation & lifecycle plan |
| Status | **Activation locked for planning** — no M2 implementation |
| Milestone | M2 — Create challenge + lifecycle (owner deferral) |
| IDs | CHAL-01, G1.1-01, G1.1-02 |
| Spec baseline | Gate 1 frozen — `docs/product/specification-v1.md` |
| Rules amendment | Gate 1.1 approved — `docs/product/amendments/gate-1-1-product-rules.md` |
| MVP plan | `docs/engineering/mvp-build-plan.md` § M2 (+ activation lock) |
| Architecture | `docs/engineering/m0-architecture.md` (§1.2–1.3 lifecycle sketch; decision table) |
| Design grounding | Wireframe create flow — `docs/design/wireframes/flows-overview.md` §1 (no dedicated create-challenge mid-fi screen) |
| M1 gate | **Pending** — final same-browser email-link check not closed |
| Implementation | **Not authorised by this document** |

---

## 0. Authority and stop

### Frozen inputs (read-only — do not edit)

| Source | Path |
| --- | --- |
| Product specification v1.0 | `docs/product/specification-v1.md` |
| Gate 1.1 product rules | `docs/product/amendments/gate-1-1-product-rules.md` |
| MVP build plan (M2 + decisions) | `docs/engineering/mvp-build-plan.md` |
| M0 architecture | `docs/engineering/m0-architecture.md` |
| Wireframe create flow | `docs/design/wireframes/flows-overview.md` |

Mid-fi has **no** create-challenge screen. Wireframe flow map is the UX grounding for Journey A.

### Explicit constraints

1. **Plan only.** This document does not authorise schema, API, UI, or migrations for M2.
2. **Frozen specs stay intact.** Do not amend Gate 1 / Gate 1.1 product docs from this planning pass.
3. **Activation rules below are approved for planning** (PO lock this turn). Other OPEN defaults stay OPEN (pause max, cancellation detail, currency catalogue beyond “currency required”, ownership-deletion fallback, post-completion reopen, other MVP §3.3 items).
4. **Cancellation rules remain OPEN; cancel action is out of M2.**
5. **M1 email-link check is still pending.** Do not treat M1 final inbox evidence as closed.
6. **M2 implementation requires a separate explicit PO approval.** This planning lock is not an implementation go.

### Allowed next after this lock

- Separate explicit authorisation to implement M2 (or finish M1 gate first).
- Resolve remaining non-activation OPEN defaults when they block later milestones.

### Do not do on the back of this doc alone

- Challenge tables, services, routes, or UI.
- Lifecycle transition code.
- Edits to frozen product specs.
- Invented cancel UX or other still-OPEN product rules.

---

## 1. What the owner enters to create a challenge

Grounded in **CHAL-01** (PRS §5) and MVP plan M2 build list. Wireframe flow: Home → Create sheet → Name + description → Start / end + time zone → Review → Scheduled / Active → optional invite; savings setup deferred (G1.1-01).

### Required fields (CHAL-01 — including currency)

| Field | Rule | Notes |
| --- | --- | --- |
| Challenge name | Required; validated | PRS title / CHAL-01 “Challenge name” |
| Start date | Required | Challenge participation period start |
| End date | Required; **must follow** start | CHAL-01 acceptance |
| Currency | Required | Challenge currency for later targets/commitments (GOAL-01/02); catalogue beyond initial market remains OPEN |
| Time zone | Required | IANA challenge TZ; all later week assessment uses this zone (GOAL-02 / G1.1-03; ADR-G in m0) |

### Optional fields

| Field | Rule |
| --- | --- |
| Description | Optional |

### Optional at creation (not required)

- Invitations (M3)
- Owner personal savings target / weekly commitment / savings activation (M4; G1.1-01)

### Not collected as mandatory at create

- Personal savings target
- Weekly savings commitment
- Savings participation activation

Those belong to **M4** (savings setup). M2 must not require them to create or configure.

### Create outcomes (CHAL-01 + G1.1-01)

On successful atomic create:

1. Challenge is **private** (invitation-only; no public listing).
2. Creator becomes **owner**.
3. Creator is an **approved participant / member**.
4. Owner **savings participation** remains inactive until M4 setup completes.
5. Success lands on the **challenge overview**.
6. Invalid submissions produce clear error messages; end-before-start and **past starts** rejected.
7. Initial lifecycle status follows the **approved activation rules** in §2.

A challenge may exist with **only its owner** before others join (G1.1-01).

---

## 2. When a challenge becomes Active — **approved for planning**

### Frozen context (unchanged)

G1.1-02 states: Draft · Scheduled · Active · Completed · Cancelled (Cancelled terminal). Lifecycle ≠ individual savings participation. Detailed cancellation / edge rules beyond this lock stay documented before any cancel implementation.

### PO-approved activation rules (planning lock)

| Rule | Locked behaviour |
| --- | --- |
| Required config | **CHAL-01 fields, including currency** (name, start, end, currency, time zone; end after start). Invites and owner savings setup are **optional at creation**. |
| Future start (challenge TZ) | Valid create → **Scheduled** directly |
| Start date = **today** (challenge TZ) | Valid create → **Active** immediately |
| Past start | **Reject** |
| Scheduled → Active | **Automatically at local midnight on the start date** (challenge TZ) |
| Active → Completed | **At local midnight after the end date** (challenge TZ) — challenge remains Active through the entire end date |
| Owner savings | Owner may remain savings-inactive while challenge is Scheduled or Active (G1.1-01) |
| Recording savings | Requires **both** a valid **Active** challenge **and** an individually activated member (target + weekly commitment) |
| Cancel | Rules **OPEN**; **cancel action out of M2** (Cancelled state may exist in the model for later; no cancel UX/API in M2) |

### Draft

Draft remains a defined G1.1-02 state. Under this lock, a **valid** create does not enter Draft: it lands **Scheduled** or **Active** per start date. Incomplete/invalid create is rejected rather than saved as Draft unless a later PO decision adds an incomplete-save path.

### Instant semantics (locked with activation)

| Boundary | Instant in challenge TZ |
| --- | --- |
| Become Active (from Scheduled) | Local **midnight beginning the start date** |
| Create with start = today | **Active** immediately at create time |
| Become Completed | Local **midnight beginning the calendar day after the end date** |

---

## 3. Owner create before own savings (G1.1-01)

### Frozen rule

- Creator automatically becomes **owner** and **approved participant**.
- Owner has the same savings capabilities as others **plus** admin permissions.
- Owner is **not** required to set personal target or weekly commitment during initial create.
- Owner may create, configure, and invite **before** activating own savings participation.
- Owner without activated savings must **not** be counted completed or missed for weekly commitments.
- Challenge may exist with only its owner.

### M2 implications (plan)

| Behaviour | M2 expectation |
| --- | --- |
| Create without target/commitment fields | Required — do not show mandatory savings setup on create |
| Ownership vs savings status | Separate fields/statuses; admin rights do not imply savings-active |
| Assessment | No Completed/Missed week rows (or equivalent assessment) for savings-inactive owner |
| Record savings | Blocked until challenge is **Active** **and** member savings setup is complete (full setup in M4) |
| Configure / invite | Configure in M2; invite belongs to M3 but M2 must not force savings activation first |

G1.1-03 / G1.1-04 remain mandatory **for active savings participants**; they do not override G1.1-01 deferral for owners at create time.

---

## 4. Lifecycle states

Per **G1.1-02** (frozen):

| State | Meaning |
| --- | --- |
| **Draft** | Created but not yet ready for participation |
| **Scheduled** | Configured and awaiting the start date |
| **Active** | Within its configured participation period |
| **Completed** | Challenge period has ended |
| **Cancelled** | Explicitly terminated; **terminal** |

### Distinctions (must not collapse)

1. **Challenge lifecycle** (above) ≠ **membership status** (pending / approved / … — M3).
2. **Challenge lifecycle** ≠ **savings participation** (inactive until target + commitment activated — M4).
3. Every challenge has **exactly one** valid lifecycle status.
4. Invalid transitions rejected; transitions auditable where appropriate (m0: lifecycle transition audit).
5. **Completed** and **Cancelled** do not accept ordinary new contributions (G1.1-02; G1.1-12 read-only default for Completed — full read-only UX in M9).

### Approved transition map (planning lock)

```text
[Create, CHAL-01 valid + start in future] → Scheduled
[Create, CHAL-01 valid + start = today]   → Active
[Create, past start]                      → reject
Scheduled --(local midnight on start date, challenge TZ)--> Active
Active    --(local midnight after end date, challenge TZ)--> Completed
Cancelled / cancel action                 → OUT OF M2 (rules OPEN)
Completed → (none in MVP; reopen still OPEN / recommend none)
```

Invalid examples (reject): Cancelled → Active; Completed → Active; Active → Draft; Cancelled → Scheduled; past-start create.

**Cancellation rules** (who, when, member notification, contribution freeze) remain **OPEN** — cancel action stays **out of M2**.

---

## 5. Acceptance checks for M2

Trace to MVP plan M2 checklist + CHAL-01 / G1.1-01 / G1.1-02 + this activation lock. Planning acceptance only — evidence collected after authorised implementation.

### Create & ownership

- [ ] Required fields validated (name, start, end, **currency**, time zone) — CHAL-01
- [ ] End date after start date; clear errors on invalid submit — CHAL-01
- [ ] Past start rejected — activation lock
- [ ] Creation atomic; creator is owner — CHAL-01, G1.1-01
- [ ] Creator is approved member; challenge may be owner-only — G1.1-01
- [ ] Challenge is private — CHAL-01
- [ ] Success lands on challenge overview — CHAL-01

### Owner deferral (G1.1-01)

- [ ] Owner can create/configure without personal target or weekly commitment
- [ ] Invites optional at creation; M2 must not require savings activation
- [ ] Ownership permissions distinct from savings participation status
- [ ] Owner without activated savings is **not** assessed missed/completed weeks
- [ ] Owner cannot record savings until challenge is Active **and** individual participation setup is complete (enforce or clearly gate; full setup in M4)

### Lifecycle (G1.1-02 + activation lock)

- [ ] Exactly one valid lifecycle status at all times
- [ ] Status shown consistently in UI
- [ ] Valid future start → create **Scheduled**; start today → create **Active**
- [ ] Scheduled → Active at local midnight on start date (challenge TZ)
- [ ] Active → Completed at local midnight after end date (challenge TZ)
- [ ] Only approved transitions allowed; invalid transitions rejected
- [ ] Transitions auditable where appropriate
- [ ] Completed rejects ordinary new contributions (Cancelled behaviour when cancel rules land later; no cancel action in M2)
- [ ] No cancel UX/API in M2

### Explicit non-goals for M2 acceptance

- Cancel challenge action — **out of M2** (rules OPEN)
- Invite link expiry / revoke / join disclosure — **M3**
- Target + commitment activation UI — **M4**
- Contributions, streaks, privacy aggregates, activity feed — **M5+**
- Final brand identity — still open; working accents only

---

## 6. Decision table — status after PO activation lock

| ID | Decision | Status | Locked / remaining |
| --- | --- | --- | --- |
| D1 | Challenge activation conditions (G1.1-02) | **Approved for planning** | See §2 |
| D2 | Create → Scheduled when future start | **Approved for planning** | Skip Draft on valid create |
| D3 | Start today / past start at create | **Approved for planning** | Today → Active; past → reject |
| D4 | Savings vs challenge Active | **Approved for planning** | Savings need Active challenge **and** member target + weekly commitment |
| D5 | Start/end midnight semantics | **Approved for planning** | Active at midnight on start; Completed at midnight after end |
| D6 | Challenge cancellation rules | **OPEN** | Cancel action **out of M2** |
| D7 | Post-completion reopening | **OPEN** | None recommended for MVP; no reopen in M2 |
| D8 | Currency catalogue / initial market | **OPEN** beyond “currency required” | CHAL-01 requires a currency value; allowed set still OPEN |
| D9 | Max challenges per user / max participants | **OPEN** | No silent caps |
| D10 | Ownership deletion fallback | **OPEN** | Not M2 |
| D11 | Other MVP §3.3 defaults (pause, streak thresholds, IA labels, etc.) | **OPEN** | Not M2 blockers |

**M2 coding still requires a separate implementation go.** Activation planning blockers D1–D5 are locked; D6 cancel stays out of M2.

---

## 7. Explicit stops / handoffs

| Item | Status |
| --- | --- |
| This document | Planning lock recorded — **activation approved for planning** |
| M2 implementation | **Not authorised** — needs separate PO go |
| M1 final email-link / same-browser gate | **Pending** |
| Frozen Gate 1 / 1.1 specs | **Intact** — not modified |
| Cancellation | **OPEN** — out of M2 |
| Other OPEN product defaults | **Remain open** |

**Stop. No M2 application code. Planning-only update.**
