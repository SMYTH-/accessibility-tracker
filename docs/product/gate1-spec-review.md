# Gate 1 Spec Review — Accountability Tracker

Reviewer: Gate 1 completeness/consistency pass  
Primary source: `specification-v1.md` (PRS v1.0, Gate 1 Approved — Frozen Baseline)  
Derived docs consulted for flags only: `acceptance-criteria.md`, `decisions.md`, `product-rules.md`, `user-journeys.md`, `mvp-scope.md`, `requirements.md`, `roadmap.md`, `vision.md`  
Review date: 11 November 2026

---

## 1. Verdict

Gate 1 is a coherent, frozen product baseline: audience, challenge model, privacy defaults, MVP boundaries, and non-custody stance are clear and internally aligned. It is **not** yet a faithful-implementation-ready requirements pack — several P0 behaviours and acceptance criteria are thin or explicitly deferred in §19 / §8.4, which the PRS itself acknowledges must be resolved before affected implementation.

---

## 2. Contradictions / tensions

No hard logical contradictions found that overturn an approved §3 decision. Notable **tensions** (same document pulling in two directions, or AC citing rules that do not yet exist):

| Tension | Evidence |
| --- | --- |
| Correction / milestone rules referenced but not defined | SAVE-02 AC: milestones and commitment assessments updated “according to documented rules” (§5) while correction/reversal semantics and achievement thresholds remain deferred (§19). |
| Retention referenced but not defined | ACC-01 AC: delete/anonymise “according to documented retention requirements” (§5) while historical retention periods are deferred (§19). |
| Invitation expiry required; duration open | CHAL-02 requires an “expiry mechanism” (§5); §19 defers “Invitation expiry duration” / revocation behaviour. |
| Weekly commitments “can” vs streak mechanics that assume them | GOAL-02: participants “can define” a weekly commitment (§5); GAME-01 / §6 treat completed/missed/paused weeks as core MVP mechanics without stating whether a commitment is mandatory to participate. |
| Pre-approval challenge preview vs privacy | Journey B step 3: “Review challenge information” before approval (§9); CHAL-03 / §8.1: pending users cannot access private financial information — what non-financial preview is allowed is unspecified. |
| Owner as creator vs owner as saving participant | Creator becomes owner with invite/approve/settings powers (§4.2, CHAL-01); PRS never states whether the owner is automatically an approved participant with a target/commitment, or can remain non-saving admin. |
| Visible group totals vs visible group targets under opt-out | Private *contributions* are excluded from other members’ visible group totals (§3, §4.4, PRIV-01); whether opted-out members’ *targets* still enter “combined visible target” (§4.4) is not stated. |

Derived docs already flagged the SAVE-02 / ACC-01 / CHAL-02 / GOAL-02–GAME-01 thinness (`acceptance-criteria.md`); this review agrees and ties them to the owner-membership and preview tensions above.

---

## 3. Missing requirements / underspecified areas that would block faithful implementation later

These are **not** invented product decisions — they are behaviours the PRS assumes or names without enough rules to implement consistently:

1. **Owner participation model** — auto-membership, target/commitment obligation, and whether a challenge can exist with only an owner and no savers (§4.2, CHAL-01, Journey A).
2. **Challenge status model** — “Challenge status” is a required concept (§4.1, DASH-01) but states/transitions are only partially described (completion in §8.4; cancellation deferred in §19).
3. **Weekly commitment optionality** — required vs optional; behaviour of streaks/dashboard when unset (GOAL-02, GAME-01, §6).
4. **“Eligible” contribution / savings semantics** — used for group progress, commitment met, and completion summary (§4.4, GOAL-02, GAME-01, §8.4) without a definition (membership state, privacy, date bounds, corrections, overpayments).
5. **Join-time obligations order** — Journey B sequences visibility ack → privacy prefs → set target → join (§9); GOAL-01 only says approved participants *can* create a target — whether target (and commitment) are required before protected access is unclear.
6. **Pre-approval invitation surface** — what challenge metadata invitees see before approval (Journey B vs CHAL-02/CHAL-03 privacy).
7. **Progress milestones** — named as MVP gamification (§6.1, DASH-01, SOC-01) while “Exact achievement thresholds” are deferred (§19); no substitute definition of what a milestone *is*.
8. **Post-completion behaviour** — §8.4 explicitly requires rules for post-completion corrections and archival access before implementation.
9. **Ownership edge cases** — ownership transfer and owner-departure / owner account deletion called out as open (§4.2, §19); blocks complete membership lifecycle.
10. **Group aggregate privacy edge cases** — deferred in §19; needed to implement §4.4 / PRIV-01 without inventing totalisation rules (especially mixed visible/private members).

Items already listed in §19 (limits, backdating, DST, currency set, notification frequency, etc.) are acknowledged blockers for the affected features; they are not repeated in full here.

---

## 4. Ambiguities (interpretable more than one way)

| Topic | Ambiguity | PRS refs |
| --- | --- | --- |
| “Prospectively” | Pause / target-change effective at next second, next commitment period, or next calendar week in challenge TZ? | §3, GOAL-01, GAME-01, §6.4 |
| Recovery | “Users can recover from missed commitments” / “Recovery allows a new streak to begin” — automatic on next met week, explicit user action, or pause-then-resume? | GAME-01, §6.3, Journey E |
| Eligible / active-member totals | On leave/removal, contributions leave *current* active-member totals (§8.2) but remain in “minimum necessary history” — how dashboards and feeds present leavers is open. | §3, §8.2, §4.4 |
| Idempotency | SAVE-01 requires duplicate prevention via idempotency without defining key, window, or client contract. | SAVE-01, §10.3 |
| Activity feed contents | SOC-01 lists “Potential activity” — which events are P0-required vs optional. | SOC-01 |
| Profile “basic information” | PROF-01: display name + unspecified updatable fields; no uniqueness, avatar, or PII bounds. | PROF-01 |
| Self-reported labelling | “Clearly labelled as self-reported” — where (contribution, totals, exports, feeds)? | SAVE-01, DASH-01 |
| Challenge time zone mutability | Configured at create (CHAL-01); whether owners may change it later (and effect on historical assessments) unspecified. | CHAL-01, GOAL-02, §19 DST note |
| “Atomic” creation | Challenge creation atomic (CHAL-01) — failure/rollback scope vs invitation link issuance in Journey A unclear. | CHAL-01, Journey A |

---

## 5. Thin acceptance criteria (by ID)

| ID | Assessment |
| --- | --- |
| **PROF-01** | No acceptance-criteria list; capability statements only. |
| **NOTIF-01** | No AC list; P0 examples vs P1 optional reminders only — delivery, content, and failure behaviour unspecified. |
| **AUTH-01** | Present but qualitative (“sessions handled securely”; no MFA/session-lifetime/lockout expectations). |
| **DASH-01** | Present but non-testable as written (“Calculations are accurate”, “Layouts are responsive”) without defined calculation rules. |
| **SOC-01** | Thin; privacy/permission negatives only — no required event set or ordering. |
| **SAVE-02** | Partially solid; depends on missing “documented rules” for milestone/commitment updates (§19). |
| **ACC-01** | Depends on missing retention documentation (§19); export scope undefined beyond “authorised to receive”. |
| **CHAL-02** | Mechanism AC without duration/revocation detail (§19). |
| **GOAL-02** | Relies on undefined “eligible contributions” and deferred week boundaries (§19). |
| **GAME-01** | Determinism claimed; recovery, pause UX, and week boundaries not specified enough to test without further rules. |
| **CHAL-01 / CHAL-03 / GOAL-01 / SAVE-01 / PRIV-01** | Comparatively stronger; remaining gaps are mainly §19 dependencies (limits, ownership, aggregates) rather than absent AC lists. |

Aligned with the thin/deferred summary already in `acceptance-criteria.md`.

---

## 6. Deferred items already acknowledged (§19 etc.)

§19 correctly parks implementation-detail decisions (participant/challenge limits, invite expiry, ownership transfer, week boundaries, backdating, correction/reversal, overpayments, DST, cancellation, post-completion edits, retention, aggregate privacy edges, notification frequency, achievement thresholds, multi-currency, a11y test methodology, analytics consent/events).

**Additional insight:** several §5 acceptance criteria already *depend* on those deferred docs (notably SAVE-02, ACC-01, CHAL-02, GOAL-02/GAME-01). §8.4’s post-completion rules sit outside the §19 bullet list wording but are the same class of pre-implementation gate. Closing §19 is therefore not optional polish — it unblocks criteria the frozen PRS already asserts.

---

## 7. Out of scope for this review / confirmations

- **No edits** made to `specification-v1.md` or other Gate 1 baseline docs; this file is the only product-doc write for this review task.
- **Gate 2 not started** — no design research, wireframes, competitive analysis, or visual exploration performed.
- **No application code**, scaffolding, dependency installs, or GitHub/repo work.
- **No invented product decisions** or proposed “fixes” to gaps; findings are evidence-based callouts against the approved PRS.
- Tech stack (§16) noted as proposed/not approved; not evaluated as product completeness.

---

**This report is ready for product-owner review and is waiting further instructions.** Do not treat this review as authorisation to begin Gate 2 execution beyond whatever the product owner already approved in the PRS header/§20.
