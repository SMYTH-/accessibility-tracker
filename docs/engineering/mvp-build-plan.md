# Accountability Tracker — MVP Build Plan

| Field | Value |
| --- | --- |
| Document | MVP build plan (planning only) |
| Status | **Draft for PO / coordinator review** — stop here |
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
4. **Do not invent** unresolved product rules (backdating, pause duration, small-group privacy edges, etc.) during build — resolve via the PO decision section first, or park behind an approved amendment.

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

- Create private challenge: name, start/end, currency, time zone, optional description.
- Creator becomes **owner + approved member**; may defer personal target / weekly commitment.
- Lifecycle states: Draft · Scheduled · Active · Completed · Cancelled (transitions per approved activation rules — see §3).

**Acceptance checks**

- [ ] Required fields validated; end after start; creator is owner — CHAL-01, G1.1-01.
- [ ] Challenge is private; success lands on challenge overview — CHAL-01.
- [ ] Owner can configure/invite without activating savings — G1.1-01.
- [ ] Owner without activated savings is **not** assessed missed/completed weeks — G1.1-01.
- [ ] One valid lifecycle status; invalid transitions rejected — G1.1-02.
- [ ] Completed/cancelled reject ordinary new contributions — G1.1-02, G1.1-12 (read-only behaviour completed in M9).

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
- Activation of savings participation is explicit (ties to §3 activation decision).
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
**Depends on:** §3.1 Contribution timing PO decision

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
**Depends on:** §3.2 Aggregate privacy PO decision

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

Items below block named milestones. Each includes a **recommended option** for PO approval (recommendation ≠ authority).

### 3.1 Contribution timing (backdating, week allocation) — **priority**

| | |
| --- | --- |
| **Why open** | G1.1-05 explicitly defers backdating, allocation across weeks, excess carry-forward, and week boundaries |
| **Blocks** | M5 (SAVE-01/02), M8 (GAME-01 streaks), any commitment assessment tests |
| **Also touches** | Partial first/final weeks; correction effects on week assessment |

**Recommended option (for PO approval)**

1. **Week boundary:** Weeks run **Monday 00:00:00 → Sunday 23:59:59.999** in the **challenge time zone** (DST: use zone-aware calendar dates, not fixed UTC offsets).
2. **Contribution date:** User-selectable calendar date; **no future dates**; must fall within `[challenge.start, min(today, challenge.end)]` in challenge TZ.
3. **Backdating limit:** Date may be at most **14 days** before “today” in challenge TZ, and never before challenge start. (Corrections of existing rows follow audit rules, not this create window.)
4. **Week allocation:** Entire contribution amount applies to the **single week that contains the contribution date** — no split across weeks.
5. **Excess over weekly commitment:** Counts fully toward **personal target / milestones**; does **not** carry forward to future weeks’ commitment progress.
6. **Partial first/final weeks:** Assessed as normal weeks on the same Monday–Sunday grid; commitment amount is **not** pro-rated in MVP (meet full weekly commitment if the participant is active that week).
7. **Post-completion:** No ordinary creates (G1.1-12); out-of-period rejected as ineligible (G1.1-05).

**Alternatives considered:** (a) Sunday-start weeks; (b) no backdating (today-only); (c) pro-rate partial weeks. Rejected for MVP simplicity / UK-familiar Monday weeks / Path A assumes dated contributions within a week.

---

### 3.2 Sharing-member totals vs inferring private amounts — **priority**

| | |
| --- | --- |
| **Why open** | G1.1-06 requires hidden values cannot be reconstructed via aggregates or other exposed data; “small-group aggregate privacy edge cases” still listed open |
| **Blocks** | M6 dashboard aggregates, M7 privacy, M9 feed/roster, security review |
| **Risk** | Opt-out deltas, roster+% leakage, API field combinations, historical aggregate snapshots |

**Recommended option (for PO approval) — “Exclude + no leakage channels”**

1. **Composition rule (already approved):** Visible totals include **only** members who currently share monetary info; label **Sharing members only** — never imply full-group total (G1.1-06).
2. **Roster for Private members:** Show display name + **Private** affordance only — **no** amount, target, progress %, or money-sized bar.
3. **Hide all monetary fields** for opted-out members from others: reported total, target, weekly commitment amount, contribution amounts in feed. Allowed non-monetary: membership presence, non-amount events (e.g. “joined”), and streak **count** only if it does not reveal commitment size (recommend: show “Streak · N weeks” / Completed|Missed|Paused **without** £ amounts).
4. **No full-group or “including private as zero” totals** anywhere (UI, CSV, notifications, APIs).
5. **API contract:** Other-member payloads omit monetary fields when opted out (fields absent, not zeroed). Aggregates computed server-side from sharers only; do not return per-private addends.
6. **Opt-out cannot-undo:** Keep warning. Do **not** expose a queryable time series of past sharing-member totals that makes systematic reconstruction easy. Prior client-side memory is accepted residual risk (disclosed).
7. **Small-group MVP stance:** Do **not** suppress the sharing-member total when sharer count is low. Sharers already consented to member visibility; private members are absent from the sum, so the total does not encode their hidden amounts. (k-anonymity suppression would mainly hide **sharers’** combined figure, which conflicts with default visibility / mid-fi.)
8. **Acceptance probe:** With Alex opted out, other-member view matches Path C (£1,840 of £3,500 from Sam+Riley only); subtracting known sharer roster figures must **not** yield Alex’s private numbers because Alex is excluded (and Alex’s fields are absent).

**Alternative (stricter):** Hide sharing-member aggregate when fewer than 3 sharing members. **Not recommended for MVP** — contradicts signed-off mid-fi labelling and default sharer visibility; revisit only if user research shows inference anxiety among sharers.

---

### 3.3 Other decisions (recommended defaults)

| Decision | Blocks | Recommended MVP option |
| --- | --- | --- |
| Exact IA tab labels / count | M1 shell | Keep **Home · Challenge · Activity · Profile** (4 tabs); no Leaderboard |
| Post-confirm navigation | M5 | **Done → Home (dashboard)** with updated figures (mid-fi Path A behaviour) |
| Challenge activation conditions (G1.1-02) | M2 | **Scheduled** when required config valid + start in future; auto **Active** at start in challenge TZ; owner may remain savings-inactive |
| Pause duration / resume (G1.1-11) | M8 | MVP: pause **indefinite until manual resume**, resume effective **next week start**; max duration deferred |
| Streak milestone thresholds (G1.1-08) | M8 | Recognise streaks at **3, 6, 12** completed weeks (progress % milestones already 25/50/75/100) |
| Join / setup step count | M3–M4 | **Invite preview → disclosure+ack → request → (wait) approve → target+commitment setup → home** — no decorative step chrome required |
| Ownership fallback on owner account deletion | M9–M10 | If no eligible transferee: **auto-cancel** challenge after grace notification window (details in amendment); block silent orphan |
| Post-completion reopening | M9 | **None in MVP** — read-only; corrections only via future approved process |
| Excess / correction vs milestones | M5/M8 | Recalculate current progress; **do not remove** historically announced milestones if progress later dips; do not re-announce duplicates |
| WCAG methodology | M11 | Manual WCAG 2.2 AA checklist + axe on core journeys; Honey Amber pairs verified before lock |
| Logo / final palette / type | Visual polish | **Remain open**; ship working Deep Sea `#1A6B7C` + Honey Amber `#C9842A` accents only |

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

### Recommended decisions (short)

1. **Contribution timing:** Monday–Sunday weeks in challenge TZ; date within challenge and ≤14-day backdate; whole amount to that week; no excess carry-forward; no partial-week pro-rate.
2. **Private-amount inference:** Sharing-members-only totals; Private roster with no money/%; omit monetary API fields; no aggregate history that enables opt-out reconstruction; **no** k-anonymity hide of totals for MVP.

### Allowed next (after PO approval)

- Resolve §3 decisions (amendment or decision record).
- Gate 3 architecture approval.
- **Separate** authorisation to implement M1+.

### Do not do on the back of this doc alone

- App scaffolding / npm product app / schema implementation.
- Edits to Gate 1 / 1.1 frozen specs.
- Inventing pause max, backdating, or privacy edge behaviour in code.

---

## 8. Document control

| Field | Value |
| --- | --- |
| Authoring mode | Planning only |
| Implementation authorised | **No** |
| Spec files modified | **None** |
| Next stop | PO / coordinator review of plan + §3 recommendations |
