# M2 — Challenge creation & lifecycle (plan only)

| Field | Value |
| --- | --- |
| Document | M2 challenge creation & lifecycle plan |
| Status | **For PO review** — planning only; no M2 implementation |
| Milestone | M2 — Create challenge + lifecycle (owner deferral) |
| IDs | CHAL-01, G1.1-01, G1.1-02 |
| Spec baseline | Gate 1 frozen — `docs/product/specification-v1.md` |
| Rules amendment | Gate 1.1 approved — `docs/product/amendments/gate-1-1-product-rules.md` |
| MVP plan | `docs/engineering/mvp-build-plan.md` § M2 (+ §3.3 activation row) @ `96f723d` / current |
| Architecture | `docs/engineering/m0-architecture.md` (§1.2–1.3 lifecycle sketch) |
| Design grounding | Wireframe create flow — `docs/design/wireframes/flows-overview.md` §1 (no dedicated create-challenge mid-fi screen) |
| M1 gate | **Parked** — final same-browser email-link test not closed |
| Implementation | **Not authorised by this document** |

---

## 0. Authority and stop

### Frozen inputs (read-only — do not edit)

| Source | Path |
| --- | --- |
| Product specification v1.0 | `docs/product/specification-v1.md` |
| Gate 1.1 product rules | `docs/product/amendments/gate-1-1-product-rules.md` |
| MVP build plan (M2 + §3.3) | `docs/engineering/mvp-build-plan.md` |
| M0 architecture | `docs/engineering/m0-architecture.md` |
| Wireframe create flow | `docs/design/wireframes/flows-overview.md` |

Mid-fi has **no** create-challenge screen; activation remains flagged OPEN in mid-fi README. Wireframe flow map is the UX grounding for Journey A.

### Explicit constraints

1. **Plan only.** This document does not authorise schema, API, UI, or migrations for M2.
2. **Frozen specs stay intact.** Do not amend Gate 1 / Gate 1.1 product docs from this planning pass.
3. **Keep other OPEN defaults OPEN.** Do not invent pause max, cancellation detail, currency catalogue beyond CHAL-01 fields, ownership-deletion fallback, post-completion reopen, or other §3.3 / Gate 1.1 §4 items here.
4. **M1 email gate is parked.** Do not treat M1 final inbox evidence as closed; do not unblock M2 coding on the back of this plan alone.
5. **M2 implementation requires a separate explicit PO approval** after activation (and any other blocking) decisions below are locked.

### Allowed next after this review

- PO decides activation / related M2 blockers in §6.
- Separate explicit authorisation to implement M2 (or to continue M1 gate first).

### Do not do on the back of this doc alone

- Challenge tables, services, routes, or UI.
- Lifecycle transition code.
- Edits to frozen product specs.
- Silently adopting the §3.3 activation recommendation without PO lock.

---

## 1. What the owner enters to create a challenge

Grounded in **CHAL-01** (PRS §5) and MVP plan M2 build list. Wireframe flow: Home → Create sheet → Name + description → Start / end + time zone → Review → Draft / Scheduled → optional invite; savings setup deferred (G1.1-01).

### Required fields

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

### Not collected at create (by design — G1.1-01 / G1.1-03 / G1.1-04)

- Personal savings target
- Weekly savings commitment
- Savings participation activation

Those belong to **M4** (savings setup). M2 must not require them to create, configure, or (once M3 exists) invite.

### Create outcomes (CHAL-01 + G1.1-01)

On successful atomic create:

1. Challenge is **private** (invitation-only; no public listing).
2. Creator becomes **owner**.
3. Creator is an **approved participant / member**.
4. Owner **savings participation** remains inactive until M4 setup completes.
5. Success lands on the **challenge overview**.
6. Invalid submissions produce clear error messages; end-before-start rejected.

A challenge may exist with **only its owner** before others join (G1.1-01).

---

## 2. When a challenge becomes Active

### Frozen (must not invent past this)

G1.1-02:

- States: Draft · Scheduled · Active · Completed · Cancelled (Cancelled terminal).
- Lifecycle status is distinct from individual savings participation status.
- “A challenge cannot become active for savings participation until its required configuration is valid.”
- Detailed transition validation (including cancellation and edge cases) **must be documented before implementation**.
- Gate 1.1 §4 lists **challenge activation conditions** as still OPEN.
- MVP plan §3.3 and m0 decision table both mark activation detail **OPEN** (recommended default only).

PRS §8.4: challenge reaches its end date → **Completed** (summary presentation; post-completion reopen still OPEN).

### Recommended MVP activation model (NOT approved — needs PO lock)

From MVP plan §3.3 (recommended default):

> **Scheduled** when required config valid + start in future; auto **Active** at start in challenge TZ; owner may remain savings-inactive.

Proposed interpretation for review (still OPEN until PO says yes):

| Condition | Proposed behaviour |
| --- | --- |
| Required challenge config valid | Name, start, end (end after start), currency, time zone all valid |
| Start **in the future** (challenge TZ) | Lifecycle → **Scheduled** (awaiting start) |
| Start **reached** (challenge TZ clock) | Auto transition → **Active** |
| Owner savings setup | **Not** required for challenge Active; owner may stay savings-inactive (G1.1-01) |
| End reached while Active | → **Completed** (PRS §8.4 / G1.1-12 read-only default — reopen OPEN) |

### OPEN product decisions (activation) — flag for PO

| # | Question | Recommendation | Blocks coding? |
| --- | --- | --- | --- |
| A1 | Exact **Draft → Scheduled** gate: is “required config valid” = CHAL-01 fields only, or anything else? | **CHAL-01 fields only** for M2. Membership count, invites, and owner savings setup are **not** required. | **Yes — M2** |
| A2 | Can create land directly in **Scheduled** (skip Draft) when config is valid and start is future? | **Yes** — wireframe Review → Draft / Scheduled; prefer create → Scheduled when valid + future start; keep Draft for incomplete/incomplete-config saves if M2 supports save-incomplete, else omit Draft entry path until needed. | **Yes — M2** |
| A3 | If start date is **today** (or already in the past) at create time, in challenge TZ? | **Today → Active immediately** after valid create; **past start → reject** on create (end-after-start already required; past start is a separate validation). | **Yes — M2** |
| A4 | Is **Active** automatic at start boundary, or does owner manually “start”? | **Automatic** at start in challenge TZ (per §3.3 recommendation). | **Yes — M2** |
| A5 | Does challenge **Active** require any member with activated savings? | **No** — challenge lifecycle ≠ savings participation; owner-only, savings-inactive challenges may be Active. | **Yes — M2** (clarifies G1.1-02 “active for savings participation” vs challenge Active) |
| A6 | What does G1.1-02 “cannot become active for **savings participation** until required configuration is valid” bind to? | Bind to **member savings activation** (target + weekly commitment — G1.1-03/04 / M4), **not** to challenge lifecycle Active. Challenge Active still requires valid CHAL-01 config. | **Yes — M2/M4 boundary** |
| A7 | Cancellation: who can cancel, from which states, with what side effects? | State **Cancelled** exists and is terminal (G1.1-02). **Detailed cancellation rules remain OPEN** (Gate 1.1 §4) — do not invent; if M2 must represent Cancelled, only allow an explicitly PO-approved minimal path or stub transitions until rules land. | **Yes if M2 ships cancel UX**; else park cancel action behind later decision |
| A8 | Completed → any reopen / un-complete? | **None in MVP** (MVP §3.3 recommendation); remains OPEN as product rule — do not implement reopen. | M9 more than M2 |
| A9 | DST / exact instant of start/end in challenge TZ | Follow m0 ADR-G (store IANA TZ; compute in that zone). Exact start-of-day vs inclusive timestamp edge — confirm **start = date at 00:00:00 in challenge TZ; end = end date through 23:59:59.999** unless PO picks otherwise. | **Yes — M2** if dates are date-only |

**Stop for review:** A1–A6 (and A9 if date-only) should be locked before M2 coding. A7 can stay OPEN if Cancelled is modelled but cancel action is out of M2 scope. A8 stays OPEN / deferred.

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
| Record savings | Blocked until M4 setup (surface may be stub/disabled in M2; full enforcement in M4) |
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

### Proposed transition map for PO review (not approved)

```text
[Create, config incomplete] → Draft
[Create/update, config valid + start in future] → Scheduled
[Create/update, config valid + start reached/today] → Active
Scheduled --(start instant in challenge TZ)--> Active
Active    --(end instant in challenge TZ)--> Completed
Draft | Scheduled | Active --(explicit cancel, rules OPEN)--> Cancelled
Cancelled → (none)
Completed → (none in MVP; reopen OPEN / recommend none)
```

Invalid examples (reject): Cancelled → Active; Completed → Active; Active → Draft; Cancelled → Scheduled.

**Cancellation rules** (who, when, member notification, contribution freeze) remain **OPEN** — listed in §6; do not invent in M2 code.

---

## 5. Acceptance checks for M2

Trace to MVP plan M2 checklist + CHAL-01 / G1.1-01 / G1.1-02. Planning acceptance only — evidence collected after authorised implementation.

### Create & ownership

- [ ] Required fields validated (name, start, end, currency, time zone) — CHAL-01
- [ ] End date after start date; clear errors on invalid submit — CHAL-01
- [ ] Creation atomic; creator is owner — CHAL-01, G1.1-01
- [ ] Creator is approved member; challenge may be owner-only — G1.1-01
- [ ] Challenge is private — CHAL-01
- [ ] Success lands on challenge overview — CHAL-01

### Owner deferral (G1.1-01)

- [ ] Owner can create/configure without personal target or weekly commitment
- [ ] Owner can proceed toward invite/configure without activating savings (invite UX may land in M3; M2 must not require savings activation)
- [ ] Ownership permissions distinct from savings participation status
- [ ] Owner without activated savings is **not** assessed missed/completed weeks
- [ ] Owner cannot record savings until individual participation setup is complete (enforce or clearly gate; full setup in M4)

### Lifecycle (G1.1-02)

- [ ] Exactly one valid lifecycle status at all times
- [ ] Status shown consistently in UI
- [ ] Only approved transitions allowed; invalid transitions rejected
- [ ] Transitions auditable where appropriate
- [ ] Completed / Cancelled reject ordinary new contributions (deeper read-only UX completes in M9)

### Activation (only after PO locks §6)

- [ ] Draft / Scheduled / Active behaviour matches **approved** activation rules (not the recommendation alone)
- [ ] Auto or manual start behaviour matches PO decision A4
- [ ] Challenge Active allowed while owner savings-inactive if PO confirms A5

### Explicit non-goals for M2 acceptance

- Invite link expiry / revoke / join disclosure — **M3**
- Target + commitment activation UI — **M4**
- Contributions, streaks, privacy aggregates, activity feed — **M5+**
- Final brand identity — still open; working accents only

---

## 6. Decision table — PO approval before M2 coding

| ID | Decision | Status | Recommended MVP option | Must approve before M2 code? |
| --- | --- | --- | --- | --- |
| D1 | Challenge activation conditions (G1.1-02) | **OPEN** | Scheduled when CHAL-01 valid + future start; auto Active at start in challenge TZ; owner may remain savings-inactive | **Yes** |
| D2 | Draft entry path vs create→Scheduled skip | **OPEN** | Prefer create→Scheduled when valid+future; Draft only if incomplete save is in scope | **Yes** |
| D3 | Start today / past start at create | **OPEN** | Today → Active; past start → reject | **Yes** |
| D4 | “Active for savings participation” vs challenge Active | **OPEN** | Savings activation gated by G1.1-03/04 (M4); challenge Active independent | **Yes** |
| D5 | Start/end instant semantics in challenge TZ | **OPEN** | Date-only → start 00:00:00.000 / end 23:59:59.999 in challenge TZ | **Yes** |
| D6 | Challenge cancellation rules | **OPEN** | State exists; detailed who/when/effects deferred — no invented cancel UX in M2 unless PO supplies rules | **Yes if cancel ships in M2**; else park action |
| D7 | Post-completion reopening | **OPEN** | None in MVP | No for M2 create; confirm no reopen API |
| D8 | Currency catalogue / initial market | **OPEN** beyond “currency required” | Ship single initial currency (e.g. GBP) as working default only if PO names it; otherwise keep field with PO-named MVP set | **Yes** (at least MVP allowed values) |
| D9 | Max challenges per user / max participants | **OPEN** | Out of M2 invent-scope; no silent caps | No invent; optional later |
| D10 | Ownership deletion fallback | **OPEN** | Not M2 | No |
| D11 | Other MVP §3.3 defaults (pause, streak thresholds, IA labels, etc.) | **OPEN** | Leave open | No — not M2 blockers |

**M2 coding gate:** D1–D5 (+ D6 if cancel in scope, + D8 currency values) require explicit PO approval. Recommendations above are **not** approval.

---

## 7. Explicit stops / handoffs

| Item | Status |
| --- | --- |
| This document | Planning only — **for review** |
| M2 implementation | **Requires separate approval** after §6 locks |
| M1 final email-link / same-browser gate | **Parked** — not closed by this plan; do not couple M2 coding to an assumed M1 pass |
| Frozen Gate 1 / 1.1 specs | **Intact** — not modified |
| Other OPEN product defaults | **Remain open** |

### Review ask

1. Approve or amend activation answers **A1–A6 / A9** (and A7 if cancel in M2).
2. Confirm G1.1-01 deferral behaviour in §3 is acceptable as M2 scope boundary vs M4.
3. Explicitly authorise (or withhold) **M2 implementation** in a separate go — this plan alone is insufficient.
4. Keep M1 parked email evidence on its own track.

**Stop for review. No M2 application code.**
