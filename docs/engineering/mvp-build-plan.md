# Accountability Tracker — MVP Build Plan

| Field | Value |
| --- | --- |
| Document | MVP build plan (planning only) |
| Status | **PO decisions recorded** — §3.1 contribution timing **approved**; §3.2 superseded by G1.1-06-R1; **M2 activation approved for planning**; M2 implementation **not** authorised; M1 email gate pending |
| Mid-fi sign-off reference | A+B mid-fi at `6a1461e` |
| Spec baseline | Gate 1 frozen — `docs/product/specification-v1.md` |
| Rules amendment | Gate 1.1 approved — `docs/product/amendments/gate-1-1-product-rules.md` |
| Design direction | Clear Companions (A) + Crew Momentum (B); Shared Horizon (C) labelling retained |
| Working accents | Deep Sea `#1A6B7C` · Honey Amber `#C9842A` — **working only** |
| Still open (identity) | Logo · final palette · type licensing / families |
| Implementation | **Not authorised by this document** |

---

## 0. Authority and stop conditions

### Sources (read-only — do not modify)

| Source | Path |
| --- | --- |
| Product specification v1.0 | `docs/product/specification-v1.md` |
| Gate 1.1 product rules | `docs/product/amendments/gate-1-1-product-rules.md` |
| Mid-fi walkthrough / README | `docs/design/mid-fi/` |
| Wireframes | `docs/design/wireframes/` |
| Exploration decision | `docs/design/exploration/decision-summary.md` |

### Explicit constraints

1. **Frozen specs stay intact.** Agents must not edit Gate 1 / 1.1 product docs while executing this plan.
2. **This plan does not authorise implementation.** Scaffolding, databases, auth, deploys, and product-app code require a **separate PO approval** after architecture (Gate 3) and any blocking product decisions below.
3. **Logo / final palette / type remain open.** Use working Deep Sea + Honey Amber accents and provisional type lean only; do not treat them as locked brand tokens.
4. **Do not invent** unresolved product rules (pause duration, excess carry, small-group privacy edges, other §3.3 defaults, etc.) during build — resolve via the PO decision section first, or park behind an approved amendment. Contribution timing (§3.1) and G1.1-06-R1 (`m0-architecture.md` §4) are **approved**; do not reopen superseded backdate / create-in-closed-week ideas.

### Prerequisite gates before coding

| Gate | Must complete before |
| --- | --- |
| Gate 3 — Technical Architecture | Any scaffolding or persistence work |
| PO decisions in §3 (esp. contribution timing + aggregate privacy) | Milestones that touch SAVE / GAME / PRIV aggregates |
| Separate implementation authorisation | Milestone M1 onward (app code) |

---

## 1. Signed-off experience grounding

Build sequence follows the mid-fi / wireframe flows PO already walked, not a greenfield IA invent.

| Prototype path | What it proves | Primary requirements |
| --- | --- | --- |
| **A — Record £50** | Home £1,190→£1,240 / 62%; confirm hierarchy; sharing-member total £3,030→£3,080; **Your streak**; 50% Halfway ≠ current % | SAVE-01, DASH-01, G1.1-05, G1.1-06, G1.1-08 |
| **B — Challenge activity** | Streak strip before roster/feed; Private chip; Sharing members only; nav **Home · Challenge · Activity · Profile**; **no Leaderboard** | DASH-01, SOC-01, G1.1-06, GAME-01 |
| **C — Privacy opt-out** | One monetary opt-out; cannot-undo warning; other-member view hides amount+target; self still sees own; totals exclude opted-out | PRIV-01, G1.1-06 |
| **D — Join disclosure** | Disclosure **before** join; invite preview has no amounts; Continue disabled until ack | CHAL-02/03, PRIV-01, G1.1-07, G1.1-14 |

Wireframe create / invite / join / setup flows additionally ground CHAL-01, G1.1-01…04, GOAL-01/02.

Canonical sample (locked for acceptance fixtures): Portugal 2027 · Alex £1,240 of £2,000 · £50 week · Your streak 3 · Sharing members only £3,080 of £5,500 · Jordan Private.

---

## 2. Build sequence and milestones

Milestones are ordered by dependency. Acceptance checks cite requirement / G1.1 IDs. Each milestone is **done** only when its checks pass and Gate 1 quality gates (§10.6) that apply are met.

### M0 — Architecture & foundation decisions (no product UI)

**Intent:** Approve stack, tenancy, money arithmetic, auth approach, env strategy (Gate 3). Align with proposed direction in PRS §16 without treating it as already approved.

**Acceptance checks**

- [ ] Architecture decision record approved by PO (stack, hosting, secrets, environments).
- [ ] Money stored and computed in minor units (integer) — PRS §10.3 / SAVE-01.
- [ ] Server-side authorisation model sketched for membership + privacy — PRIV-01, G1.1-06.
- [ ] Idempotency and audit strategy named for contributions — SAVE-01/02, §7.4.
- [ ] Explicit written **go / no-go** for implementation start (this plan alone is insufficient).

**Blocks:** All later milestones.

---

### M1 — App shell, auth, profile, essential notifications

**Journeys:** Journey A/B entry · mid-fi Profile shell  
**IDs:** AUTH-01, PROF-01, NOTIF-01 (P0 emails), ACC-01 (surface account controls entry; full export/delete can complete in M10)

**Build**

- Mobile-first shell with working nav proposal: **Home · Challenge · Activity · Profile** (labels/count still OPEN — ship proposal until PO locks).
- Register, email verify, sign-in/out, password recovery.
- Display name + basic profile.
- Essential emails: verify, recovery (membership emails land with M3).

**Acceptance checks**

- [ ] Unauthenticated users cannot open protected challenge routes — AUTH-01.
- [ ] Invalid credentials denied; recovery is time-limited — AUTH-01.
- [ ] Profile exposes no unnecessary financial data — PROF-01.
- [ ] Verify + recovery emails deliver in non-prod — NOTIF-01.
- [ ] Responsive shell usable on small screens — §10.2.
- [ ] Working accents only; no claim of final brand identity — §0.

---

### M2 — Create challenge + lifecycle (owner deferral)

**Journeys:** Wireframe create flow · Journey A  
**IDs:** CHAL-01, G1.1-01, G1.1-02

**Build**

- Create private challenge: name, start/end, **currency**, time zone, optional description (CHAL-01 — currency required).
- Creator becomes **owner + approved member**; may defer personal target / weekly commitment; invites optional at creation.
- Lifecycle states: Draft · Scheduled · Active · Completed · Cancelled — transitions per **approved activation lock** (`m2-challenge-plan.md` §2 / §3.3 row below).
- Valid future start → create **Scheduled**; start = today → create **Active**; **reject past starts**.
- Scheduled → **Active at local midnight on start date** (challenge TZ); Active → **Completed at local midnight after end date** (challenge TZ).
- Savings recording requires Active challenge **and** individually activated member (target + weekly commitment) — member setup in M4.
- **Cancel action out of M2** (cancellation rules remain OPEN).

**Acceptance checks**

- [ ] Required fields validated (incl. currency); end after start; past start rejected; creator is owner — CHAL-01, G1.1-01.
- [ ] Challenge is private; success lands on challenge overview — CHAL-01.
- [ ] Owner can configure/invite without activating savings — G1.1-01.
- [ ] Owner without activated savings is **not** assessed missed/completed weeks — G1.1-01.
- [ ] Future start → Scheduled; today → Active; midnight transitions per activation lock — G1.1-02.
- [ ] One valid lifecycle status; invalid transitions rejected — G1.1-02.
- [ ] Completed rejects ordinary new contributions — G1.1-02, G1.1-12 (read-only behaviour completed in M9); no cancel UX in M2.

---

### M3 — Invitations, membership, join disclosure

**Journeys:** Wireframe invite/join · mid-fi Path D · Journey B  
**IDs:** CHAL-02, CHAL-03, PRIV-01 (disclosure), G1.1-07, G1.1-14, NOTIF-01 (approve/decline)

**Build**

- Owner invite links: default **7-day expiry**, revocable — G1.1-14.
- Invite preview fields **only**: name, description, start, end, participant count — G1.1-07.
- Financial privacy disclosure **before** request-join; cannot-undo warning; Continue disabled until acknowledgement — mid-fi Path D / PRIV-01.
- Request → owner approve/decline; pending users see no protected financials.
- Leave / remove; immediate access revoke; no duplicate memberships.

**Acceptance checks**

- [ ] Expired/revoked/invalid links cannot create requests or leak financials — CHAL-02, G1.1-14, G1.1-07.
- [ ] Invite never bypasses approval or disclosure — CHAL-02, G1.1-07.
- [ ] Pending members cannot read amounts, targets, totals, or financial activity — G1.1-07, CHAL-03.
- [ ] Disclosure + ack prerequisite before join request — PRIV-01 / mid-fi Path D.
- [ ] Approve grants access; decline does not — CHAL-03.
- [ ] Remove/leave revokes access immediately; active-member totals adjust — CHAL-03, §8.2.
- [ ] Approval/rejection emails sent — NOTIF-01.

---

### M4 — Savings setup (target + weekly commitment)

**Journeys:** Journey B setup · G1.1 owner deferral  
**IDs:** GOAL-01, GOAL-02, G1.1-03, G1.1-04

**Build**

- Approved members configure positive individual target + positive weekly commitment before recording savings.
- Activation of savings participation is explicit (requires Active challenge + member target/commitment per M2 activation lock).
- Prospective target-change effective dating (full rewrite rules may complete with M8) — G1.1-10 baseline recorded.

**Acceptance checks**

- [ ] Cannot activate savings without valid target **and** weekly commitment — G1.1-03, G1.1-04.
- [ ] Cannot record savings until setup complete — G1.1-01, G1.1-04.
- [ ] Missing setup does not create missed commitments — G1.1-01, G1.1-03, G1.1-04.
- [ ] Targets/commitments positive, challenge currency; cannot edit others’ — GOAL-01/02.
- [ ] Assessment uses challenge time zone — GOAL-02, G1.1-03.

---

### M5 — Record contributions + corrections

**Journeys:** Mid-fi Path A · Journey C · contribution wireframes  
**IDs:** SAVE-01, SAVE-02, G1.1-05  
**Depends on:** Approved §3.1 contribution timing (`m0-architecture.md` §3); separate M1+ implementation go

**Build**

- Record self-reported contribution (amount, date within permitted rules, audit metadata).
- Idempotent create; minor-unit arithmetic; label **Self-reported**.
- Confirm screen hierarchy per mid-fi: Saved amount → personal progress (was→now) → separate milestone beat → commitment/streak → sharing-member explainer → Done.
- Corrections with audit history; recalculation of affected progress / commitments / milestones per approved rules.

**Acceptance checks**

- [ ] Only own contributions; positive amounts; duplicates prevented — SAVE-01.
- [ ] Eligible-only entries affect progress (non-reversed, authorised, in-period) — G1.1-05.
- [ ] Confirm beat matches Path A sample math (£1,190→£1,240 / 62%; sharing £3,030→£3,080) — mid-fi Path A.
- [ ] Copy states contribution is included in sharing-member total **only if** user shares monetary info — mid-fi locked copy.
- [ ] Corrections preserve prior values; progress recalculates; no silent destroy — SAVE-02.
- [ ] Backdating / week allocation behaviour matches **approved §3.1** — G1.1-05 open items closed.

---

### M6 — Personal dashboard + sharing-member totals

**Journeys:** Mid-fi Home · Journey D · dashboard wireframe  
**IDs:** DASH-01, G1.1-06, G1.1-08 (display)  
**Depends on:** Approved G1.1-06-R1 acceptance suite (`m0-architecture.md` §4) before exposing sharing totals

**Build**

- Home hierarchy: personal progress primary → separate milestone recognition → weekly commitment + **Your streak** → **Sharing members only** aggregate → activity preview → Record savings CTA.
- Never bare “Group total”; never merge Halfway milestone into current %.
- Empty / loading / error states; responsive layouts.

**Acceptance checks**

- [ ] Personal figures accurate and labelled self-reported — DASH-01.
- [ ] **50% Halfway** distinct from current % — G1.1-08 / mid-fi.
- [ ] Label is **Your streak** (not Best/Challenge streak) — mid-fi locked copy.
- [ ] Visible aggregate = sharing members only; private amounts/targets excluded — G1.1-06, PRIV-01.
- [ ] Totals labelling states visibility scope — G1.1-06.
- [ ] Private amounts not exposed via UI — DASH-01, G1.1-06.
- [ ] Aggregate / API behaviour matches **approved §3.2** (no reliable inference of hidden amounts).

---

### M7 — Privacy opt-out end-to-end

**Journeys:** Mid-fi Path C · privacy wireframes  
**IDs:** PRIV-01, G1.1-06

**Build**

- One control: **Hide monetary information (opt-out)**; default OFF (visible to approved members).
- Opt-out hides **amounts and target** from others; excludes user from sharing-member aggregates.
- Warning: opting out cannot undo what others already saw.
- Server-side enforcement on reads (dashboard, roster, feed, exports, notifications).
- Self always sees own authorised figures.

**Acceptance checks**

- [ ] Default = visible to approved challenge members; not private-by-default — PRIV-01, G1.1-06.
- [ ] Opt-out hides amount **and** target from other members — G1.1-06.
- [ ] Opted-out member excluded from others’ visible aggregates — G1.1-06 / Path C (£1,840 of £3,500 sample).
- [ ] Self view retains own figures while excluded from sharing total — Path C.
- [ ] Unauthorised API cannot retrieve hidden amounts — PRIV-01.
- [ ] Feeds / exports / notifications respect visibility — PRIV-01, G1.1-06.
- [ ] Cannot-undo warning shown on settings + join disclosure — mid-fi / wireframes.

---

### M8 — Commitments, streaks, miss → recover, pause status

**Journeys:** Journey E · GAME-01 · states exploration  
**IDs:** GAME-01, GOAL-02, G1.1-08, G1.1-09, G1.1-10, G1.1-11  
**Depends on:** §3.1 week boundaries; pause duration decision (or ship status-only)

**Build**

- Deterministic weekly assessment in challenge TZ: Completed / Missed / Paused distinct.
- Streak = consecutive completed weeks; after miss, next completed week starts new streak automatically — G1.1-09.
- Personal progress milestones at 25 / 50 / 75 / 100% — G1.1-08.
- Prospective pauses (status chip); **no invented max/resume** until PO decides — G1.1-11.
- Prospective target changes audited; historical weeks not silently rewritten — G1.1-10.

**Acceptance checks**

- [ ] Week completion when eligible savings meet commitment — GAME-01, G1.1-05.
- [ ] Missed preserved; auto new streak on next completed week; no manual reset — G1.1-09.
- [ ] Paused ≠ completed ≠ missed; pauses not retroactive — G1.1-11.
- [ ] Milestone awards deterministic; privacy governs others’ milestone activity — G1.1-08.
- [ ] Supportive, non-punitive miss messaging — §6.3 / G1.1-09.
- [ ] No wealth leaderboard / penalties / wagering — §6.5 / mid-fi no Leaderboard.

---

### M9 — Challenge activity feed + completion / ownership basics

**Journeys:** Mid-fi Path B · SOC-01 · G1.1-12/13  
**IDs:** SOC-01, G1.1-12, G1.1-13 (MVP-safe subset)

**Build**

- Challenge screen: streak/commitment strip **before** roster + feed.
- Roster: sharing members show permitted figures; Private chip with no amount/target/% bar that leaks money.
- Privacy-filtered activity (joins, contributions, commitments, milestones, completion).
- Completed challenges read-only by default — G1.1-12.
- Voluntary owner leave blocked until ownership transfer to eligible approved member — G1.1-13 (deletion fallback may remain documented OPEN if not yet decided).

**Acceptance checks**

- [ ] Feed cannot bypass membership or privacy — SOC-01, G1.1-06.
- [ ] Hidden amounts never appear in feed — SOC-01.
- [ ] Strip → roster → feed order per Path B.
- [ ] No ordinary contributions/target/commitment edits after completion — G1.1-12.
- [ ] Owner cannot leave active/scheduled challenge without valid transfer — G1.1-13.
- [ ] Encourage/kudos omitted — non-MVP.

---

### M10 — Account controls, retention hooks, hardening

**IDs:** ACC-01, §7.5–7.6, §10.4–10.5

**Build**

- Export personal authorised data; request deletion; access revoke on delete.
- Retention/anonymisation hooks consistent with documented rules (periods may still be OPEN — do not invent silently).
- Security pass: authz matrix, rate limits, dependency review, Sentry/monitoring as architecture approved.
- Automated coverage for money math, streaks, privacy, membership, e2e Journeys A–E.

**Acceptance checks**

- [ ] Export limited to authorised personal data — ACC-01.
- [ ] Deletion revokes access; history handled per retention rules — ACC-01, §8.2.
- [ ] Privacy/security tests cover cross-user leakage and privilege escalation — §10.5.
- [ ] Feature complete only per §10.6 quality gates.

---

### M11 — Independent QA, security review, private-beta readiness

**Gates:** 6 then 7

**Acceptance checks**

- [ ] Independent QA on stable build (Playwright journeys A–E + Paths A–D behaviours).
- [ ] Accessibility review toward WCAG 2.2 AA (methodology may still be OPEN — §3).
- [ ] Security reviewer sign-off on authz + privacy aggregates.
- [ ] PO release/beta authorisation — Gate 7.

---

## 3. PO decisions required before development

Items below block named milestones. §3.1 and §3.2 are **locked** (see statuses). **M2 challenge activation within §3.3 is locked for planning**; other §3.3 rows remain recommendations only until PO approves.

### 3.1 Contribution timing (backdating, week allocation) — **approved**

| | |
| --- | --- |
| **Status** | **Approved** — see canonical Examples A–D in `docs/engineering/m0-architecture.md` §3 |
| **Blocks** | Still gates M5 / M8 implementation detail; **M1+ coding still needs separate go** |

**Approved rules (aligned to `m0-architecture.md` §3)**

1. **Week boundary:** Monday 00:00:00 → Sunday 23:59:59.999 in challenge TZ.
2. **Ordinary create = today-only** in challenge TZ (no free-form backdated create).
3. **Authorised corrections (MVP):** **amend or reverse** an existing entry only — **may not create** a missing entry in a closed week.
4. Ordinary attempts to date into a closed week are rejected; empty Missed weeks **stay Missed** if no row exists to amend/reverse.
5. **Week allocation:** Entire amount → single week containing the contribution date (ordinary creates → current open week).
6. **Streak:** Recompute affected weeks/streaks from the corrected sequence; preserve audit history.
7. **Milestones:** Historical milestone announcements stay distinct from current progress (other §3.3 milestone defaults remain OPEN).
8. **Late join / activation assessment start (challenge TZ):**
   - **Monday** activation → assess **current** week.
   - **Tuesday–Sunday** activation → first assessed week = **following Monday** (W46 Tue–Sun example → **Monday 16 November 2026**).
9. Savings before the first assessed week → **personal target / progress milestones only**.
10. **Post-completion:** No ordinary creates (G1.1-12); out-of-period rejected (G1.1-05).
11. **Excess / no-carry and other §3.3 defaults:** Remain **OPEN**.

**Withdrawn / not MVP:** Free-form ≤14-day backdated create; creating a new contribution in a closed week (including via “correction”); treating all late joins as “always next Monday” without the Monday-activation exception.

---

### 3.2 Sharing-member totals vs inferring private amounts — **superseded by approved G1.1-06-R1**

| | |
| --- | --- |
| **Status** | **Superseded** — see approved **G1.1-06-R1** in `docs/engineering/m0-architecture.md` §4 |
| **Blocks** | M6 dashboard aggregates, M7 privacy, M9 feed/roster, security review (acceptance suite must pass before M6 exposes shared totals) |

**Approved direction (do not re-litigate the old §3.2 proposal list):**

1. Visible totals = **current sharers only**; label **Sharing members only**.
2. Opt-out delta may restate **only** figures the **same viewer** was already authorised to see.
3. Post-privacy invariance: subject create / correct / reverse / target change must leave other members’ totals, roster monetary fields, and feed unchanged.
4. No historical sharing-total APIs; harden against **stale responses** and viewers who never saw the private member’s figures.
5. Private roster omits amount/target/%; omit monetary API fields (not zero).
6. Small-group k-anonymity suppression remains **OPEN** (still recommend reject for MVP).

Full acceptance checklist: `m0-architecture.md` §4.5 (M6 prerequisite table).

---

### 3.3 Other decisions

**Challenge activation (G1.1-02) — approved for planning** (canonical detail: `m2-challenge-plan.md` §2). Remaining rows in this table are still recommendations only until PO approves.

| Decision | Blocks | Status / MVP option |
| --- | --- | --- |
| Challenge activation conditions (G1.1-02) | M2 | **Approved for planning:** CHAL-01 fields incl. currency; future start → create **Scheduled**; today → create **Active**; reject past starts; Scheduled → Active at **local midnight on start date** (challenge TZ); Completed at **local midnight after end date**; invites + owner savings optional at create; savings need Active challenge **and** activated member (target + weekly commitment); **cancel out of M2** (rules OPEN) |
| Exact IA tab labels / count | M1 shell | **OPEN** — Keep **Home · Challenge · Activity · Profile** (4 tabs); no Leaderboard |
| Post-confirm navigation | M5 | **OPEN** — **Done → Home (dashboard)** with updated figures (mid-fi Path A behaviour) |
| Pause duration / resume (G1.1-11) | M8 | **OPEN** — MVP: pause **indefinite until manual resume**, resume effective **next week start**; max duration deferred |
| Streak milestone thresholds (G1.1-08) | M8 | **OPEN** — Recognise streaks at **3, 6, 12** completed weeks (progress % milestones already 25/50/75/100) |
| Join / setup step count | M3–M4 | **OPEN** — **Invite preview → disclosure+ack → request → (wait) approve → target+commitment setup → home** — no decorative step chrome required |
| Ownership fallback on owner account deletion | M9–M10 | **OPEN** — If no eligible transferee: **auto-cancel** challenge after grace notification window (details in amendment); block silent orphan |
| Post-completion reopening | M9 | **OPEN** — **None in MVP** — read-only; corrections only via future approved process |
| Excess / correction vs milestones | M5/M8 | **OPEN** — Recalculate current progress; **do not remove** historically announced milestones if progress later dips; do not re-announce duplicates |
| WCAG methodology | M11 | **OPEN** — Manual WCAG 2.2 AA checklist + axe on core journeys; Honey Amber pairs verified before lock |
| Logo / final palette / type | Visual polish | **Remain open**; ship working Deep Sea `#1A6B7C` + Honey Amber `#C9842A` accents only |
| Challenge cancellation rules | M2+ | **OPEN** — Cancelled state exists (G1.1-02); **cancel action out of M2** |

---

## 4. Visual identity during build

| Token | Status |
| --- | --- |
| Direction A+B | Approved for UX structure |
| Shared Horizon (C) | Reference for personal vs sharing-member naming only |
| Deep Sea / Honey Amber | **Working accents only** |
| Logo | Open |
| Final palette | Open |
| Type families / licensing | Open (Manrope + Syne lean is provisional) |

Implementation UI may use working accents and mid-fi hierarchy. Brand lock is a separate PO track and must not gate correct money/privacy behaviour.

---

## 5. Out of scope (MVP exclusions reminder)

Do not schedule: Open Banking, custody/transfers, public challenges, leaderboards, DMs/chat, native apps, subscriptions, cash prizes/penalties, Encourage/kudos, AI financial advice — PRS §11 / mid-fi non-MVP notes.

---

## 6. Traceability map (milestone → requirements)

| Milestone | Requirement / rule IDs |
| --- | --- |
| M0 | §10.3–10.4, §16–18 |
| M1 | AUTH-01, PROF-01, NOTIF-01 |
| M2 | CHAL-01, G1.1-01, G1.1-02 |
| M3 | CHAL-02, CHAL-03, PRIV-01, NOTIF-01, G1.1-07, G1.1-14 |
| M4 | GOAL-01, GOAL-02, G1.1-03, G1.1-04, G1.1-10 |
| M5 | SAVE-01, SAVE-02, G1.1-05 |
| M6 | DASH-01, G1.1-06, G1.1-08 |
| M7 | PRIV-01, G1.1-06 |
| M8 | GAME-01, G1.1-08, G1.1-09, G1.1-10, G1.1-11 |
| M9 | SOC-01, G1.1-12, G1.1-13 |
| M10 | ACC-01, §7, §10.4–10.6 |
| M11 | Gates 6–7, §10.1, §10.5 |

---

## 7. Review ask / stop

**MVP build plan drafted for review. No application code written. Frozen product specs not modified.**

### Locked decisions (short)

1. **Contribution timing — approved:** Today-only creates; corrections = amend/reverse only (**no create-in-closed-week**); streak recompute + audit; historical milestones ≠ current progress; Mon activation → current week, Tue–Sun → following Monday (**16 Nov 2026** in the W46 example); pre-assessment savings → personal target/milestones only. Canonical text: `m0-architecture.md` §3.
2. **G1.1-06-R1 — approved** (`m0-architecture.md` §4). Prior §3.2 proposal list superseded.
3. **M0 architecture:** Approved **for planning** at `1f543e6` — not an implementation go.
4. **M2 challenge activation — approved for planning:** CHAL-01 incl. currency; future → Scheduled; today → Active; reject past; midnight start/end transitions in challenge TZ; invites + owner savings optional at create; savings need Active challenge + activated member; cancel out of M2. Canonical text: `m2-challenge-plan.md` §2.

### Allowed next

- Resolve remaining **§3.3 OPEN** defaults as needed (separate review).
- Finish **M1** email-link gate (still pending).
- **Separate** explicit authorisation to implement M2 — this activation lock is **not** an M2 coding go.

### Do not do on the back of this doc alone

- App scaffolding / npm product app / schema implementation.
- Edits to Gate 1 / 1.1 frozen specs.
- Inventing pause max, create-in-closed-week, or privacy edge behaviour in code.

---

## 8. Document control

| Field | Value |
| --- | --- |
| Authoring mode | Planning only |
| Implementation authorised | **No** |
| Spec files modified | **None** |
| Next stop | PO / coordinator review of plan + §3 recommendations |
