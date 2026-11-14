# User Journeys

Sources:

- Product Specification v1.0 (Gate 1 Approved, 11 November 2026) — §8, §9
- Gate 1.1 Product Rules Amendment (Approved, 11 November 2026) — G1.1-01 … G1.1-14

**Precedence:** Amendment governs where more specific than the parent PRS for behaviours it addresses.

Status: reconciled to Gate 1.1. Implementation is **not authorised**.

---

## Journey A — Create a Challenge

| Step | Action |
| --- | --- |
| 1 | Register or sign in. |
| 2 | Select Create Challenge. |
| 3 | Enter challenge information (name, start/end, currency, time zone; optional description). |
| 4 | Confirm the details. |
| 5 | Create the challenge. |
| 6 | Receive an invitation link (default expiry: seven days — G1.1-14). |
| 7 | Share it with friends. |

**Optional deferred step (not required at creation — G1.1-01):** Owner may later complete personal savings setup (individual target + weekly commitment) before recording savings. Setup is required before the owner can record contributions or be assessed for commitments.

**Success:** A private challenge exists; the creator is owner and approved participant; the owner can invite participants. The challenge may exist with only its owner (G1.1-01). Lifecycle status is one of Draft / Scheduled / Active / Completed / Cancelled as appropriate (G1.1-02).

**Related requirements:** AUTH-01, CHAL-01, CHAL-02.

**Trace:** PRS Journey A, §4.2, CHAL-01; G1.1-01, G1.1-02, G1.1-14.

---

## Journey B — Join a Challenge

| Step | Action |
| --- | --- |
| 1 | Open invitation link (must be valid, non-expired, non-revoked — G1.1-14). |
| 2 | Sign in or register. |
| 3 | Review **permitted invitation preview only**: challenge name, description, start date, end date, participant count (G1.1-07). No financial data. |
| 4 | Request membership. |
| 5 | Wait for owner approval. |
| 6 | Review visibility information and acknowledge disclosure. |
| 7 | Choose privacy preferences (default: share amounts; opt-out hides amounts **and** targets — G1.1-06). |
| 8 | Set an individual savings target **and** a positive weekly commitment (mandatory before active savings participation — G1.1-03, G1.1-04). |
| 9 | Join the challenge experience as an active savings participant. |

**Success:** The participant can access protected challenge information after approval, and can record savings only after target + weekly commitment setup.

**Related requirements:** AUTH-01, CHAL-02, CHAL-03, PRIV-01, GOAL-01, GOAL-02.

**Lifecycle note (Joining — PRS §8.1 + G1.1):** Pending users cannot access private financial information. Financial privacy disclosures are presented before active participation. Invitation does not bypass owner approval (G1.1-07).

**Trace:** PRS Journey B, §8.1; G1.1-03, G1.1-04, G1.1-06, G1.1-07, G1.1-14.

---

## Journey C — Record Savings

| Step | Action |
| --- | --- |
| 1 | Open an **Active** challenge (G1.1-02). |
| 2 | Confirm personal savings participation is active (target + weekly commitment configured). |
| 3 | Select Record Savings. |
| 4 | Enter an amount. |
| 5 | Confirm the contribution. |
| 6 | View updated personal progress (eligible contributions only — G1.1-05). |
| 7 | See the relevant permitted activity. |

**Success:** The contribution is recorded exactly once, is labelled self-reported, and calculations use only eligible contributions.

**Guards:** Owner or member without completed setup cannot record (G1.1-01, G1.1-04). Completed/cancelled challenges do not accept ordinary new contributions (G1.1-02, G1.1-12).

**Related requirements:** SAVE-01, DASH-01, SOC-01, PRIV-01, GOAL-01, GOAL-02.

**Lifecycle note:** Corrections (SAVE-02) preserve audit history and are not part of the happy-path recording journey. Backdating / excess allocation rules remain **OPEN — requires product-owner approval.**

**Trace:** PRS Journey C; G1.1-01, G1.1-02, G1.1-05, G1.1-12.

---

## Journey D — Review Group Progress

| Step | Action |
| --- | --- |
| 1 | Open a challenge. |
| 2 | View personal progress (including own private amounts if opted out). |
| 3 | Review visible member progress (amounts and targets only for sharing members — G1.1-06). |
| 4 | Review group activity (privacy-respecting). |
| 5 | View milestones (25/50/75/100% personal progress — G1.1-08) and commitments. |

**Success:** The user understands how the group is progressing without seeing private financial information. Visible totals are labelled as **visible-member totals**, not complete group totals (G1.1-06).

**Related requirements:** DASH-01, SOC-01, PRIV-01, GAME-01, GOAL-02.

**Lifecycle note:** Members who leave or are removed have contributions excluded from current active-member totals (PRS §8.2–8.3). Private members may still appear in participant lists without exposing monetary values (G1.1-06).

**Trace:** PRS Journey D, §4.4; G1.1-06, G1.1-08.

---

## Journey E — Recover from a Missed Week

| Step | Action |
| --- | --- |
| 1 | Open the challenge. |
| 2 | See the missed commitment (historical record preserved). |
| 3 | Review progress; optional supportive actions such as continue contributing or schedule a **prospective** pause (G1.1-11). |
| 4 | Continue contributing. |
| 5 | On the next eligible completed weekly commitment, a **new streak begins automatically** — no separate recovery / streak-reset action (G1.1-09). |

**Success:** The user can resume participation without historical information being falsified. Missed periods remain recorded.

**Related requirements:** GAME-01, GOAL-02, SAVE-01.

**Lifecycle note:** Pauses apply prospectively at the start of the next weekly commitment period (G1.1-11). Completed, missed and paused periods remain distinguishable. Messaging is supportive and nonpunitive.

**Trace:** PRS Journey E, §6.3; G1.1-09, G1.1-11.

---

## Lifecycle Clarifications (Cross-Cutting)

### Leave (PRS §8.2 + G1.1-13)

When a non-owner member leaves: active membership ends; access is revoked; contributions are excluded from current active-member totals; minimum necessary historical information is retained.

When the **owner** of an active or scheduled challenge wishes to leave voluntarily: ownership must be transferred to another eligible approved member first (G1.1-13). Owner account deletion / no eligible replacement fallback is **OPEN — requires product-owner approval.**

### Remove (PRS §8.3)

Challenge owners can remove participants. Removal must immediately revoke access.

### Complete (PRS §8.4 + G1.1-12)

A challenge reaches its end date and transitions to **Completed**. Completed challenges are read-only by default: ordinary contributions, target changes and commitment changes are disabled. Post-completion reopening is **OPEN — requires product-owner approval.**

### Cancel (G1.1-02)

**Cancelled** is a terminal lifecycle state. Detailed cancellation transition rules are **OPEN — requires product-owner approval.**

### Gaps / Deferred

- Exact weekly commitment boundaries, pause UX duration/resume, and streak milestone thresholds — **OPEN** (Gate 1.1 §4).
- Challenge activation conditions and cancellation edge cases — **OPEN**.
- Post-completion archival access detail beyond read-only default — **OPEN**.
