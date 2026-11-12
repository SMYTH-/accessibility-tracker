# Accountability Tracker — M0 Architecture Plan (Gate 3)

| Field | Value |
| --- | --- |
| Document | Gate 3 / M0 technical architecture (planning only) |
| Status | **Ready for PO review** — stop here |
| Spec baseline | Gate 1 frozen — `docs/product/specification-v1.md` |
| Rules amendment | Gate 1.1 approved — `docs/product/amendments/gate-1-1-product-rules.md` |
| Build sequence | `docs/engineering/mvp-build-plan.md` (commit `05d918e`) |
| Mid-fi sign-off | A+B mid-fi at `6a1461e` |
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
| MVP build plan | `docs/engineering/mvp-build-plan.md` |
| Mid-fi | `docs/design/mid-fi/` |
| Wireframes | `docs/design/wireframes/` |

### Explicit constraints

1. **Frozen Gate 1 / 1.1 specs stay intact.** This plan does not edit them.
2. **No product-app implementation** (scaffolding, schema migrations in product DB, auth wiring, deploys) without a **separate** PO go for M1+.
3. **Do not treat MVP plan §3 recommendations as approved.** Contribution timing, G1.1-06 inference hardening, and §3.3 defaults remain proposals until PO decides.
4. **Logo / final palette / type remain open.** Working accents only.

### Prerequisite gates before coding

| Gate | Must complete before |
| --- | --- |
| This Gate 3 architecture review | Any scaffolding or persistence work |
| PO decisions on contribution timing + G1.1-06 aggregate rule (§§3–4 below) | M5 (SAVE), M6 aggregates, M7 privacy, M8 streaks |
| Separate implementation authorisation | Milestone M1 onward |

---

## 1. Proposed architecture (M0)

### 1.1 System overview

Mobile-first **responsive web app** (PRS §3, §10.2) with a single deployable Next.js application: UI + server-side API routes / server actions that enforce membership and privacy. PostgreSQL is the system of record. Auth is session-based via a managed identity provider. No money custody, transfers, or Open Banking in MVP (PRS §11).

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser (mobile-first)                                      │
│  React / Next.js App Router · Tailwind (working accents)     │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS session cookie
┌───────────────────────────▼─────────────────────────────────┐
│  Application server (Next.js)                                │
│  • Auth session validation                                   │
│  • Authorisation (membership + privacy)                      │
│  • Domain services: Challenge, Membership, Savings,          │
│    Commitment/Streak, Privacy Aggregate, Activity, Audit     │
│  • Email adapters (verify, recovery, approve/decline)        │
└───────┬───────────────────────────────┬─────────────────────┘
        │                               │
┌───────▼────────┐              ┌───────▼────────┐
│  PostgreSQL    │              │  Auth provider │
│  (e.g. Supabase│              │  (e.g. Supabase│
│   Postgres)    │              │   Auth)        │
│  + object/audit│              └────────────────┘
│    retention   │
└────────────────┘
```

**Why this shape:** Matches the provisional PRS §16 direction, keeps one deployable unit for a small MVP, and puts **all** financial reads/writes behind server-side checks (PRIV-01, G1.1-06, §7.3).

### 1.2 Major components (aligned to M0–M11)

| Component | Responsibility | First milestone |
| --- | --- | --- |
| **App shell & nav** | Home · Challenge · Activity · Profile (labels OPEN) | M1 |
| **Identity & session** | Register, verify, sign-in/out, recovery | M1 |
| **Profile** | Display name; privacy settings entry | M1, M7 |
| **Challenge lifecycle** | Create/configure; Draft→Scheduled→Active→Completed/Cancelled | M2 |
| **Invitations & membership** | Links (7-day default), approve/decline, leave/remove | M3 |
| **Join disclosure** | Financial visibility ack before request-join | M3 |
| **Savings setup** | Individual target + weekly commitment activation | M4 |
| **Contributions** | Create/correct self-reported amounts; idempotency; audit | M5 |
| **Personal dashboard** | Progress, milestones display, Your streak, sharing totals | M6 |
| **Privacy enforcement** | Opt-out; field omission; aggregate composition | M6–M7 |
| **Commitment engine** | Week assessment, streaks, pauses (prospective) | M8 |
| **Activity / roster** | Privacy-filtered feed + Private chip roster | M9 |
| **Account controls** | Export, deletion hooks, retention | M10 |
| **Hardening & QA** | Authz matrix, rate limits, monitoring, e2e | M10–M11 |

### 1.3 Data model sketch (entities / relationships)

Aligned to frozen Gate 1 + G1.1 — sketch only, not a migration.

```text
User ─┬─ Profile
      ├─ owns * Challenge
      └─ * Membership ── Challenge
              │
              ├─ MembershipStatus: pending | approved | declined | left | removed
              ├─ share_monetary_info: boolean (default true among approved)
              ├─ SavingsParticipation (optional until activated)
              │     ├─ target_minor (positive)
              │     ├─ weekly_commitment_minor (positive)
              │     ├─ activated_at
              │     └─ pause schedule (prospective)
              ├─ * Contribution
              │     ├─ amount_minor, contribution_date, currency
              │     ├─ status: active | reversed
              │     ├─ idempotency_key
              │     └─ * ContributionRevision (audit)
              ├─ * WeekAssessment (per challenge week)
              │     └─ Completed | Missed | Paused
              └─ * MilestoneAward (progress % / streak)

Challenge
  ├─ name, description?, start, end, currency, time_zone
  ├─ lifecycle: Draft | Scheduled | Active | Completed | Cancelled
  ├─ owner_user_id
  ├─ * Invitation (token, expires_at, revoked_at)
  └─ * ActivityEvent (privacy-filtered projections)

AuditEvent (append-only): actor, entity, action, before/after, at
```

**Money:** Store and compute in **integer minor units** only (pence for GBP). No floating-point arithmetic (PRS §10.3, SAVE-01).

**Tenancy:** Challenge is the tenancy boundary. All financial rows are scoped by `challenge_id` + `membership_id`. No cross-challenge leakage.

**Eligibility (G1.1-05):** Progress and commitment math use only valid, authorised, non-reversed, in-period contributions for active savings participants. Precise backdating / week allocation remain **awaiting approval** (§3).

### 1.4 API / service boundaries

Prefer **server-owned domain services** called from Next.js route handlers or server actions — not a separate microservice fleet for MVP.

| Boundary | Owns | Must enforce |
| --- | --- | --- |
| `AuthSession` | Identity cookie / JWT validation | Unauthenticated → no protected challenge data |
| `ChallengeService` | Lifecycle transitions | G1.1-02; reject ordinary creates when Completed/Cancelled |
| `MembershipService` | Invite, request, approve, leave, remove | G1.1-07/14; pending see no financials |
| `SavingsSetupService` | Target + commitment activation | G1.1-01/03/04 |
| `ContributionService` | Create/correct; idempotency | SAVE-01/02; G1.1-05 |
| `CommitmentEngine` | Week grid, streak, pause | GAME-01; G1.1-09/11 (pause duration OPEN) |
| `PrivacyAggregateService` | Sharing-member totals | G1.1-06; §4 recommendation |
| `ActivityService` | Feed + roster projections | Omit monetary fields for opted-out |
| `AuditService` | Append-only audit | §7.4; protect audit access |
| `AccountService` | Export / delete | ACC-01 |

**Read contract (privacy-safe):** For other members with `share_monetary_info = false`, monetary fields are **absent** (not zero). Aggregates are computed server-side from current sharers only. Never return “full group including private as zero.”

### 1.5 Auth and session

| Topic | Proposal | Status |
| --- | --- | --- |
| Provider | Supabase Auth (email/password + verify + recovery) | **Architecture — for review** |
| Session | HTTP-only secure cookie; server validates on every sensitive request | **Architecture — for review** |
| Authorisation | Server-side: `user → membership(challenge) → permission` before any financial read/write | Required by PRIV-01 / §7.3 |
| Pending members | Authenticated but **no** financial challenge payloads | G1.1-07 |
| Rate limits | Auth + contribution + invite endpoints | OPEN detail; required by §10.4 |

### 1.6 Privacy-sensitive data handling

| Class | Examples | Handling |
| --- | --- | --- |
| Financial PII | amounts, targets, commitments, contribution dates | Confidential (§7.1); encrypt in transit; DB at rest via host; least privilege |
| Membership / privacy flags | `share_monetary_info`, membership status | Server-enforced; audited on change |
| Audit trail | contribution revisions, privacy toggles, ownership transfers | Append-only; restricted access (§7.4) |
| Never collect (MVP) | bank credentials, account numbers, cards, ID docs | §7.5 |

**Opt-out (approved product behaviour):** Hides amounts **and** target from others; excludes from others’ visible aggregates; self still sees own; cannot-undo warning for previously viewed data (G1.1-06, PRIV-01, mid-fi Path C).

### 1.7 Event / audit needs

| Event | Audit? | Notes |
| --- | --- | --- |
| Contribution create | Yes | actor, amount, date, idempotency key, challenge |
| Contribution correct / reverse | Yes | previous + new values (SAVE-02) |
| Privacy share flag change | Yes | before/after; timestamp; challenge scope |
| Target / commitment change | Yes | effective dating per G1.1-10 (commitment amount-change rules still OPEN) |
| Membership approve/decline/leave/remove | Yes | access revoke timing |
| Ownership transfer | Yes | G1.1-13 |
| Challenge lifecycle transition | Yes | G1.1-02 |
| Week assessment recompute | Traceable | Deterministic inputs; store assessment outcomes |

Activity feed events are **projections** filtered by viewer membership + privacy — not a bypass channel.

### 1.8 Mid-fi screens → modules

| Mid-fi screen / path | Module(s) | Milestone |
| --- | --- | --- |
| `#home` dashboard (£1,190→£1,240; Sharing members only; Your streak; 50% Halfway ≠ %) | Dashboard + PrivacyAggregate + Commitment display | M6, M8 |
| `#record` / `#confirm` Path A | ContributionService + confirm UI | M5 |
| `#challenge` Path B (strip → roster → feed; Private chip; no Leaderboard) | Challenge + Activity + Privacy | M9 |
| `#activity` | ActivityService | M9 |
| `#profile` + `#privacy` Path C | Profile + Privacy settings | M1, M7 |
| `#join` Path D disclosure | Membership + disclosure gate | M3 |
| Create / invite / setup (wireframes) | Challenge + Invite + SavingsSetup | M2–M4 |

Canonical acceptance fixture (locked for tests): Portugal 2027 · Alex £1,240 of £2,000 · £50 week · Your streak 3 · Sharing members only £3,080 of £5,500 · Jordan Private.

### 1.9 Tech choices (pragmatic) and open tech decisions

**Recommended stack (for architecture review — not implementation authority):**

| Layer | Recommendation | Rationale |
| --- | --- | --- |
| App | Next.js App Router + TypeScript + React | Mobile-first web; server authz colocated; matches PRS §16 provisional |
| DB | PostgreSQL | Relational integrity for membership, money, audit |
| Hosting / Auth | Supabase (Postgres + Auth) | Fast path for AUTH-01 without custom IdP |
| ORM | Drizzle | Typed SQL-friendly; fine control over transactions |
| UI | Tailwind v4 + accessible primitives (shadcn-style) | Speed; a11y primitives; working accents only |
| Test | Vitest + RTL + Playwright | Matches §10.5 pyramid |
| CI | GitHub Actions | Repo already on GitHub |
| Monitor | Sentry | Error visibility before beta |
| Analytics | PostHog (defer until consent model decided) | OPEN product/privacy ops |

**Open tech decisions (need PO / architecture approval, separate from product rules):**

- Confirm Supabase vs alternative Postgres + Auth split.
- Environment strategy (local / staging / prod) and secret management.
- Email provider for NOTIF-01.
- Exact session lifetime / refresh policy.
- Audit log retention storage (same DB vs append-only store).
- Whether server actions vs REST-only public API surface for mobile web.
- PostHog / analytics consent and event taxonomy.
- WCAG methodology detail (checklist + axe) — also listed in MVP plan §3.3.

**Identity:** Logo, final palette, and type remain **OPEN**. Implementation UI may use working Deep Sea / Honey Amber only.

---

## 2. Architecture decisions for review (ADRs-lite)

Each item is **proposed**. Product rules in Gate 1 / 1.1 stay authoritative; unapproved product decisions are not locked here.

### ADR-A — Application shape: modular monolith (Next.js)

| | |
| --- | --- |
| **Context** | MVP needs strong server-side authz for money/privacy without ops overhead of many services. |
| **Options** | (1) Next.js modular monolith · (2) Separate API + SPA · (3) Multiple microservices |
| **Recommendation** | **(1)** Modular monolith with clear domain service modules. |
| **Blocks if deferred** | M1 scaffolding choice; hosting and CI layout. |

### ADR-B — Persistence: PostgreSQL + integer minor units

| | |
| --- | --- |
| **Context** | SAVE-01 / §10.3 require precise money math and transactional corrections. |
| **Options** | (1) Postgres minor-unit integers · (2) Decimal/numeric types only · (3) Client-side floats (reject) |
| **Recommendation** | **(1)** Store `bigint`/`integer` minor units; compute in integer arithmetic; transactions around contribution + progress side effects. |
| **Blocks if deferred** | All of M4–M8 money correctness. |

### ADR-C — Auth: managed email auth + server session checks

| | |
| --- | --- |
| **Context** | AUTH-01 + private challenges; no social IdP required for MVP. |
| **Options** | (1) Supabase Auth · (2) Auth.js / custom · (3) Defer auth to later (reject — blocks everything) |
| **Recommendation** | **(1)** Supabase Auth with HTTP-only cookies; every financial route re-checks membership. |
| **Blocks if deferred** | M1 and all protected routes. |

### ADR-D — Authorisation model: membership + privacy capability checks

| | |
| --- | --- |
| **Context** | PRIV-01 / G1.1-06/07 require server enforcement; client hide is insufficient. |
| **Options** | (1) Central `authorize(viewer, challenge, action)` + privacy projection layer · (2) Ad-hoc checks per route · (3) RLS-only without app checks |
| **Recommendation** | **(1)** App-level authorisation service **plus** defense-in-depth DB policies where practical. Privacy projection omits fields for non-sharers. |
| **Blocks if deferred** | M3 join, M6 totals, M7 opt-out, M9 feed. |

### ADR-E — Idempotency and audit for contributions

| | |
| --- | --- |
| **Context** | SAVE-01 duplicate prevention; SAVE-02 / §7.4 auditability. |
| **Options** | (1) Client idempotency key unique per user+challenge · (2) Debounce-only UI · (3) Natural-key dedupe on amount+date (fragile) |
| **Recommendation** | **(1)** Required idempotency key on create; append-only revisions on correct; never silent delete. |
| **Blocks if deferred** | M5 acceptance; money reliability (§10.3). |

### ADR-F — Aggregates computed server-side from current sharers

| | |
| --- | --- |
| **Context** | G1.1-06 visible totals = sharing members only; must not reconstruct hidden values. |
| **Options** | (1) On-read aggregate from sharers · (2) Cached materialised total with privacy-aware invalidation · (3) Client-sum of roster (rejects — leaks / race) |
| **Recommendation** | **(1)** for MVP; optional **(2)** later if perf requires, with same composition rules. Pair with §4 privacy rule. |
| **Blocks if deferred** | M6 dashboard aggregates. |

### ADR-G — Time: challenge time zone for all week boundaries

| | |
| --- | --- |
| **Context** | GOAL-02 / G1.1-03: assessments use challenge TZ; DST-safe calendar needed. |
| **Options** | (1) Store IANA TZ on challenge; compute weeks in that zone · (2) Store everything UTC-only weeks · (3) User-local TZ per member (rejected for shared challenge fairness) |
| **Recommendation** | **(1)**. Exact Monday–Sunday grid remains a **product** decision (§3) — architecture only commits to zone-aware engine. |
| **Blocks if deferred** | M5/M8 scheduling correctness. |

### ADR-H — Environments and secrets

| | |
| --- | --- |
| **Context** | §10.4 secret management; private beta readiness. |
| **Options** | (1) local + staging + prod with host secret store · (2) prod-only · (3) secrets in repo (reject) |
| **Recommendation** | **(1)** Three environments; no secrets in git; staging used for M11 QA. |
| **Blocks if deferred** | M1 deploy path; M11 beta. |

---

## 3. Contribution timing — worked examples (proposals only)

**Do not treat as approved.** Frozen G1.1-05 requires documentation of backdating, allocation, excess, and week boundaries **before** implementation. Recommendations below follow MVP plan §3.1 as **proposals** and show concrete outcomes for PO review.

**Assumed proposal (for examples only):**

1. Weeks = **Monday 00:00:00 → Sunday 23:59:59.999** in **challenge TZ**.
2. Contribution date: user-selectable; **no future**; within `[challenge.start, min(today, challenge.end)]`.
3. Backdate create window: at most **14 days** before today (challenge TZ); never before challenge start.
4. Whole amount → **single week containing the date**; no split.
5. Excess over weekly commitment counts to **personal target / milestones**; **no** carry into future weeks’ commitment progress.
6. Partial first/final calendar weeks: **not** pro-rated (full commitment if participant is active that week).

Challenge TZ for all examples: `Europe/London`. Weekly commitment: **£50**. Target: **£2,000**.

---

### Example A — Backdated entry into a missed week

**Setup**

| Item | Value |
| --- | --- |
| Today | Wednesday **12 Nov 2026** |
| Week W44 | Mon 27 Oct – Sun 2 Nov |
| Week W45 | Mon 3 Nov – Sun 9 Nov |
| Week W46 | Mon 10 Nov – Sun 16 Nov (current) |
| Prior state | W44 Completed · W45 **Missed** (eligible sum £0) · W46 not yet complete |
| Streak before | **0** (broken after W45 miss); earlier streak had been 2 ending W44 |
| Personal saved | £1,190 |

**Action:** On 12 Nov, Alex records **£50** dated **Friday 7 Nov 2026** (falls in W45; within 14-day backdate; not future).

**After (under §3.1 proposal)**

| Field | Before | After |
| --- | --- | --- |
| W45 eligible sum | £0 | £50 |
| W45 status | Missed | **Completed** (correction of assessment via eligible contribution) |
| W46 | In progress | Unchanged |
| Current streak | 0 | **1** (W45 completed; G1.1-09: next completed week after miss starts new streak — here the completed week *is* the recovered week) |
| Personal saved | £1,190 | £1,240 |
| Milestone 50% | Already reached at £1,000 | Still reached (no re-announce) |

**Recommendation:** Allow the backdated create within the 14-day window; allocate entirely to W45; reassess W45 to Completed; start streak at 1 from W45; audit the create. Aligns with G1.1-05 (eligible in-period) and G1.1-09 (miss remains historical until legitimate contribution changes that period).

**Still for PO to approve:** 14-day limit; Monday week start; whether recovering a missed week via backdate is allowed vs today-only; messaging copy for “miss cleared by late entry.”

---

### Example B — Later correction that changes streak or milestone status

**Setup**

| Item | Value |
| --- | --- |
| Today | Wednesday **12 Nov 2026** |
| Commitment | £50 / week |
| W45 (3–9 Nov) | Recorded £50 on 8 Nov → **Completed**; streak became **3** (W43–W45) |
| Personal saved | £1,000 exactly → **50% Halfway** awarded |
| W46 | No contribution yet |

**Action:** Alex corrects the 8 Nov contribution from **£50 → £40** (still active row; audit revision; not a delete).

**After (under §3.1 proposal + MVP plan §3.3 milestone stance as proposal)**

| Field | Before | After |
| --- | --- | --- |
| W45 eligible sum | £50 | £40 |
| W45 status | Completed | **Missed** |
| Streak | 3 | **0** (deterministic recompute; miss preserved) |
| Personal saved | £1,000 | £990 |
| Current progress % | 50% | 49.5% → display per rounding rules (OPEN detail) |
| 50% Halfway award | Announced | **Retain historical announcement**; do **not** strip badge solely because progress dipped (MVP plan §3.3 proposal) |

**Recommendation:** Corrections recalculate affected week assessments and streak from eligible sums; preserve audit of £50→£40; keep historically announced progress milestones visible as history even if current % drops; do not re-announce if they climb back through the same threshold later (proposal).

**Still for PO to approve:** Milestone retention vs revoke-on-dip; streak recompute on correction (strongly implied by G1.1-05/09 but confirm); rounding of progress display; whether commitment-amount changes use same engine.

---

### Example C — Participant who joins late in a week

**Setup**

| Item | Value |
| --- | --- |
| Challenge weeks | Monday–Sunday grid (proposal) |
| Week W46 | Mon 10 Nov – Sun 16 Nov |
| Join | Riley approved **Thursday 13 Nov 2026** 18:00 London |
| Setup | Completes target £1,500 + weekly £50 and **activates** savings Friday 14 Nov |
| Contributions in W46 | None yet by Sunday |

**Before activation:** No week assessments; not Completed/Missed (G1.1-01/03/04 — inactive savings participation generates no misses).

**After Sunday 16 Nov with £0 eligible in W46 (under §3.1 proposal: no pro-rate)**

| Field | Outcome |
| --- | --- |
| W46 assessment | **Missed** (active for part of week; full £50 commitment applied; £0 recorded) |
| Streak | 0 |
| Partial-week pro-rate | None (proposal) |

**Alternate if PO prefers kinder onboarding:** Treat first partial week as **Paused** or **unassessed** until next Monday — **not** in Gate 1/1.1; would need explicit approval (conflicts with current §3.1 “no pro-rate / assess normal weeks” proposal).

**Recommendation for MVP proposal:** Assess W46 as a normal week once participation is active; if PO wants join-week grace, approve that as an explicit amendment (e.g. first week unassessed or commitment waived) before M8 tests.

**Still for PO to approve:** Late-join / first partial week policy; whether activation mid-week starts assessment immediately; interaction with owner deferred setup (G1.1-01) when owner activates mid-week.

---

## 4. G1.1-06 privacy inference analysis

### 4.1 Approved baseline (frozen)

- Opt-out hides **amounts and target** from others.
- Private values **excluded** from other members’ visible aggregates.
- Label totals as sharing / visible-member totals — never full-group.
- Hidden values must not be reconstructable via aggregates or other exposed data (G1.1-06 AC).
- Cannot-undo: previously viewed information cannot be made unseen (PRIV-01 / mid-fi).

### 4.2 Before / after opt-out attack (canonical sample)

Portugal challenge — approved member **Sam** watching aggregates. Jordan already Private (excluded).

| Moment | Sharing-member saved | Sharing-member target | Roster (Sam’s view) |
| --- | --- | --- | --- |
| **T0 — Alex still sharing** | **£3,080** | **£5,500** | Alex £1,240 / £2,000 visible; Sam+Riley make up the rest; Jordan Private |
| **T1 — Alex opts out** | **£1,840** | **£3,500** | Alex shows **Private** (no amount/target/% bar); Jordan Private |

**Delta:** saved £3,080 − £1,840 = **£1,240**; target £5,500 − £3,500 = **£2,000**.

| Kind | What Sam learns from the delta |
| --- | --- |
| **Previously visible** | Alex’s £1,240 and £2,000 were already on the roster/dashboard while Alex shared. The opt-out delta restates **already disclosed** figures. Covered by cannot-undo warning — residual risk, not a new product leak channel if we do not add more. |
| **New disclosure (must prevent)** | Any signal that reveals **post-opt-out** private monetary movement or amounts that were **never** in the sharing set for that viewer. |

### 4.3 New-disclosure probes (architecture must fail these)

1. **Private contribution after opt-out:** Alex (opted out) records +£100. Sam’s sharing total must remain **£1,840** (unchanged). If it moves by £100, the aggregate disclosed a private amount.
2. **Private correction after opt-out:** Alex corrects £1,240→£900 while opted out. Sam’s total must **not** move. (Alex was already removed at T1; further personal changes stay invisible.)
3. **Historical aggregate API / charts:** Serving `[…, 3080, 1840, …]` after the fact enables systematic reconstruction beyond live residual memory. **Do not ship** queryable sharing-total history for MVP.
4. **Roster math:** Private members must omit amount, target, and progress % (no zeroed placeholders that encode “hidden but present in sum”).
5. **Feed:** No contribution amounts for opted-out members; non-monetary events only where they do not encode £ size.
6. **k-anonymity hide when sharer count &lt; 3:** **Not recommended for MVP** (MVP plan §3.2) — would hide consented sharers’ combined figure and fights mid-fi labelling. Sharers consented; private members are absent from the sum.

### 4.4 Recommended testable rule (proposal — awaiting approval)

**Rule G1.1-06-R1 — Live sharers only; no private delta leakage**

1. **Composition:** `visible_saved` / `visible_target` = sum of eligible saved / targets for members with `share_monetary_info = true` **at read time** only. Label: **Sharing members only**.
2. **Transition residual:** When a member flips true→false, they drop out of the next read’s aggregate. Observers may infer the drop equals that member’s last shared figures — treat as **previously visible** residual; keep cannot-undo warning. Do not add APIs that replay historical totals.
3. **Post-privacy invariance (testable):** For any viewer ≠ subject, after subject has `share_monetary_info = false`, mutations of subject’s monetary rows (create/correct/reverse/target change) must **not** change viewer-visible aggregates, roster monetary fields, or feed amounts.
4. **API shape:** Opted-out other-member payloads **omit** monetary keys (not `0`). Aggregates never include private addends. No “including private as zero” total.
5. **Prerequisite for M6:** Automated tests for probes (1)–(5) above **pass before** first exposing sharing-member totals in a deployed build. M7 opts into the same suite for the Path C fixture (£1,840 of £3,500).

**Aligns with** MVP plan §3.2 direction as a **proposal**, refined explicitly against the before/after opt-out attack.

**Still open until PO approves:** Exact acceptance wording for residual vs forbidden leakage; whether re-opt-in is allowed later; small-group suppression (recommended **no** for MVP); streak display without £ leakage (recommend streak count / status without commitment £).

### 4.5 Privacy checks = prerequisites for M6

| Check | Required before M6 exposes sharing totals |
| --- | --- |
| Server composition = current sharers only | Yes |
| Path C fixture: Alex Private → £1,840 / £3,500 for others | Yes |
| Post-opt-out contribution does not move others’ aggregate | Yes |
| No aggregate history endpoint | Yes |
| Private roster omits amount/target/% | Yes |
| Unauthorised / pending cannot read financials | Yes (also M3) |

---

## 5. Decision status table

| Decision | Status | Notes |
| --- | --- | --- |
| Gate 1 product baseline | **Approved (frozen)** | Do not edit `specification-v1.md` |
| Gate 1.1 rules G1.1-01…14 | **Approved (frozen)** | Do not edit amendment file |
| A+B visual direction / mid-fi structure | **Approved** | Implementation still needs separate go |
| Logo / final palette / type | **OPEN** | Working Deep Sea / Honey Amber only |
| Contribution timing (§3 examples / MVP §3.1) | **RECOMMENDED / AWAITING APPROVAL** | Not locked; needed before M5/M8 |
| G1.1-06-R1 aggregate inference rule (§4) | **RECOMMENDED / AWAITING APPROVAL** | Not locked; prerequisite for M6/M7 |
| MVP plan §3.3 defaults (IA labels, pause indefinite, streak 3/6/12, activation, etc.) | **OPEN** | Recommendations only — **not approved** |
| Backdating / week boundaries / excess carry / partial weeks | **OPEN** until PO acts on §3 | G1.1-05 deferred items |
| Pause max / resume; streak milestone thresholds; milestone-on-correction | **OPEN** | G1.1-08/11 + plan §3.3 |
| Challenge activation detail; ownership deletion fallback; post-completion reopen | **OPEN** | |
| Small-group k-anonymity suppression | **OPEN** (recommend reject for MVP) | |
| ADR-A…H tech/architecture choices | **PROPOSED FOR REVIEW** | Architecture track; not product-rule amendments |
| Stack (Next/Supabase/Drizzle/…) | **PROPOSED FOR REVIEW** | PRS §16 was provisional |
| Implementation M1+ | **NOT AUTHORISED** | Needs separate PO go after this review |

---

## 6. Stop conditions

**Plan ready for review.** Frozen Gate 1 / Gate 1.1 specs were not modified. No application implementation started.

**Next step:** PO review of:

1. This architecture (components, data sketch, ADRs-lite, stack proposal).
2. The three contribution worked examples and recommendations (§3).
3. The G1.1-06-R1 testable rule and M6 privacy prerequisites (§4).

**Implementation and coding milestones (M1+) need separate approval** after architecture and blocking product decisions. This document alone is not a go to scaffold, migrate, or deploy product code.

---

## 7. Document control

| Field | Value |
| --- | --- |
| Authoring mode | Gate 3 / M0 planning only |
| Implementation authorised | **No** |
| Spec files modified | **None** |
| Companion plan | `docs/engineering/mvp-build-plan.md` |
| Next stop | PO review — architecture + contribution examples + G1.1-06 recommendation |
