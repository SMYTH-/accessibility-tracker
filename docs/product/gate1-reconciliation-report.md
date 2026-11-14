# Gate 1 Documentation Reconciliation Report

| Field | Value |
| --- | --- |
| Project | Accountability Tracker |
| Gate | 1 → 1.1 documentation reconciliation |
| Date | 11 November 2026 |
| Authoritative sources | `specification-v1.md` (frozen); `amendments/gate-1-1-product-rules.md` (approved) |
| Status | Complete — stop; do not proceed to Gate 2 |

---

## 1. Remaining contradictions between derived documents

**No hard contradictions** remain among the reconciled derived documents (`requirements.md`, `acceptance-criteria.md`, `product-rules.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md`, `vision.md`).

Known **parent-PRS wording tensions** (frozen baseline vs amendment) are resolved for derived docs by amendment precedence; they are **not** re-litigated here and were **not** “fixed” by editing the PRS:

| Tension | Handling in derived docs |
| --- | --- |
| PRS §4.1 “multiple participants” vs owner-only challenges | Derived docs follow G1.1-01 (owner-only allowed). |
| PRS GOAL-01/02 “can” vs mandatory for active participation | Derived docs follow G1.1-03/04. |
| PRIV-01 “amounts” vs amounts + targets | Derived docs follow G1.1-06. |
| Journey E “recovery actions” vs automatic streak restart | Derived journeys follow G1.1-09. |
| §3 “recovery … options” soft phrasing | Clarified as automatic recovery + optional pause/continue UX (G1.1-09/11). |

These are documentation-precedence resolutions, not new product inventions.

---

## 2. Open decisions (grouped)

All items below are **OPEN — requires product-owner approval.** They must not be treated as approved implementation behaviour.

### Product

- Exact weekly commitment boundaries; partial first and final weeks.
- Contribution backdating limits; allocation across weeks; excess weekly savings carry-forward.
- Commitment amount change rules.
- Pause duration and resumption.
- Streak milestone thresholds; correction/reversal effects on milestones; progress calculations after target changes.
- Challenge cancellation transition rules (beyond Cancelled state existence); challenge activation conditions.
- Ownership fallback on account deletion / no eligible replacement.
- Post-completion reopening process.
- Small-group aggregate privacy edge cases.
- Notification event requirements; profile field requirements.
- Maximum participants per challenge; maximum active challenges per user.
- Currency support beyond the initial market.

### UX

- Pause UX and messaging detail beyond prospective timing and nonpunitive recovery tone.
- How leavers appear in dashboards/feeds while preserving history.
- Self-reported labelling placement across contribution, totals, exports, feeds.
- Empty/loading patterns for inactive owner savings participation.
- Detailed PROF-01 and NOTIF-01 acceptance elaboration.
- Exact visual identity / IA / wireframes (Gate 2 — not started by this pass).

### Architecture (provisional until Gate 3)

- Idempotency implementation; database transaction boundaries.
- Time-zone and daylight-saving implementation.
- Monitoring and security controls (engineering detail).
- Proposed tech stack selection (PRS §16 — **not approved**).

### Security / privacy operations

- Authentication and session policy.
- Data retention periods; account deletion workflow.
- Audit-log storage and access.
- Rate limits; privacy-safe API response contracts.
- Accessibility testing methodology; product analytics consent and event definitions.
- UK GDPR assessment execution before public beta (required activity; not a invented product rule).

---

## 3. Traceability matrix — Gate 1.1 rules → derived docs

| Rule | Topic | Primary home | Also reflected |
| --- | --- | --- | --- |
| G1.1-01 | Owner participation / deferred setup | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md` |
| G1.1-02 | Lifecycle states | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md` |
| G1.1-03 | Mandatory weekly commitments | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md`, `vision.md` |
| G1.1-04 | Mandatory individual targets | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md`, `vision.md` |
| G1.1-05 | Eligible contributions | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md`, `vision.md` |
| G1.1-06 | Privacy + visible-member totals | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md`, `vision.md` |
| G1.1-07 | Invitation preview | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md` |
| G1.1-08 | Progress milestones 25/50/75/100% | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md`, `vision.md` |
| G1.1-09 | Automatic recovery | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md`, `vision.md` |
| G1.1-10 | Prospective target changes (next period) | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `mvp-scope.md`, `decisions.md` |
| G1.1-11 | Prospective pauses (next period) | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md` |
| G1.1-12 | Completed = read-only default | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md` |
| G1.1-13 | Ownership transfer before leave | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md` |
| G1.1-14 | Invitation expiry 7 days | `product-rules.md` | `requirements.md`, `acceptance-criteria.md`, `user-journeys.md`, `mvp-scope.md`, `decisions.md`, `roadmap.md` |

**Confirmation:** Every approved Gate 1.1 rule (G1.1-01 … G1.1-14) is reflected in the relevant documentation with rule-ID traceability. Acceptance criteria cover mandatory targets, weekly commitments, privacy (amounts + targets), challenge lifecycle, invitation expiry, and membership/ownership rules.

---

## 4. Authoritative sources unmodified

Verified SHA-256 hashes after reconciliation (unchanged from pre-task baseline recorded at task start):

| File | SHA-256 | Bytes |
| --- | --- | --- |
| `/cursor/stores/self/docs/product/specification-v1.md` | `a09c660d8753a0592501b7c678d313b1b4c4cb8bac5299728c7a48fa34419936` | 31454 |
| `/cursor/stores/self/docs/product/amendments/gate-1-1-product-rules.md` | `0c419a615252bb5cae1d78b1b31682e7546949befbd9d25f081f61e76125adc8` | 14351 |

**Confirmed:** Neither authoritative document was modified.

---

## 5. Summary of changes per derived file

| File | What changed |
| --- | --- |
| `product-rules.md` | Full rewrite as primary Gate 1.1 home: all 14 rules with AC-aligned statements, PRS §6–8 sections updated for mandatory participation, privacy+targets, lifecycle, ownership, 7-day invites; open items marked OPEN. |
| `requirements.md` | Source/precedence header; Gate 1.1 clarifications under CHAL/GOAL/SAVE/DASH/SOC/GAME/PRIV/ACC; mandatory target/commitment; eligible contributions; privacy+targets; lifecycle; ownership; 7-day invites; completed read-only. |
| `acceptance-criteria.md` | Merged PRS §5 AC with each G1.1 acceptance-criteria set; mandatory targets/commitments/privacy/lifecycle/invite expiry/membership/ownership called out; thin PROF-01/NOTIF-01 and remaining opens marked. |
| `user-journeys.md` | Journey A owner deferred setup + 7-day invite; Journey B preview surface + mandatory target/commitment; Journey C active-participation guards; Journey D visible-member totals + milestones; Journey E automatic recovery; leave/complete/cancel clarifications. |
| `mvp-scope.md` | In-scope table and constraints updated for all 14 rules; deferred items must not be treated as implementation behaviour; tech stack provisional. |
| `decisions.md` | Gate 1.1 clarification table; dual approval records; “resolved by G1.1” vs still-open lists grouped by product/UX/architecture/security; stack remains not approved. |
| `roadmap.md` | Gate 1.1 row; Phase 1 capabilities aligned to amendment; stop note retains no Gate 2 execution by this pass. |
| `vision.md` | Source/precedence; non-vision-changing Gate 1.1 alignment notes (mandatory commitments/targets, privacy+targets, eligible contributions); Gate 2 not started. |

**Created this pass:** `gate1-reconciliation-report.md` (this file).

**Not modified:** `specification-v1.md`, `amendments/gate-1-1-product-rules.md`, application code, scaffolds, DB schemas. Prior review artifacts (`gate1-spec-review.md`, internal notes) left untouched.

---

## 6. Stop

Gate 1 documentation reconciliation is complete. **Do not continue into Gate 2** (no design exploration, competitive research, wireframes, or implementation).
