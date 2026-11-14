# Accountability Tracker — M0 Architecture Plan (Gate 3)

| Field | Value |
| --- | --- |
| Document | Gate 3 / M0 technical architecture (planning only) |
| Status | **PO decisions recorded** — contribution timing **approved**; **M2 activation approved for planning**; M2 implementation **not** authorised; M1 email gate pending |
| Architecture baseline | **Approved for planning** at `1f543e6` (implementation still not authorised) |
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
3. **Architecture direction (ADRs / stack sketch) is approved for planning** at `1f543e6` — not authority to implement.
4. **G1.1-06-R1 is approved** (§4). **Contribution timing (§3) is approved** with MVP correction limits and Mon vs Tue–Sun assessment start. **M2 challenge activation is approved for planning** (`m2-challenge-plan.md` §2 / MVP §3.3). Other §3.3 defaults remain **OPEN**.
5. **Logo / final palette / type remain open.** Working accents only.

### Prerequisite gates before coding

| Gate | Must complete before |
| --- | --- |
| This Gate 3 architecture review (planning approval recorded) | Any scaffolding or persistence work |
| Contribution timing (§3) — **approved** | M5 (SAVE), M8 streaks (implement only after M1 go) |
| G1.1-06-R1 acceptance suite (§4) | M6 aggregates / M7 privacy (checks before shared totals ship) |
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

**Eligibility (G1.1-05):** Progress and commitment math use only valid, authorised, non-reversed, in-period contributions for active savings participants. Ordinary create = **today-only** (challenge TZ); closed-week changes via **authorised corrections that amend/reverse existing entries only** (§3 approved).

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
| Provider | Supabase Auth (email/password + verify + recovery) | **Approved for planning** at `1f543e6` |
| Session | HTTP-only secure cookie; server validates on every sensitive request | **Approved for planning** at `1f543e6` |
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

## 2. Architecture decisions (ADRs-lite) — approved for planning

Each item below is **approved for planning** at baseline `1f543e6`. Product rules in Gate 1 / 1.1 stay authoritative. Unapproved product decisions (contribution timing revised in §3; other §3.3 defaults) are **not** locked. **Implementation remains unauthorised** until a separate PO go.

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
| **Recommendation** | **(1)**. Monday–Sunday grid locked with approved contribution timing (§3); architecture commits to zone-aware engine. |
| **Blocks if deferred** | M5/M8 scheduling correctness. |

### ADR-H — Environments and secrets

| | |
| --- | --- |
| **Context** | §10.4 secret management; private beta readiness. |
| **Options** | (1) local + staging + prod with host secret store · (2) prod-only · (3) secrets in repo (reject) |
| **Recommendation** | **(1)** Three environments; no secrets in git; staging used for M11 QA. |
| **Blocks if deferred** | M1 deploy path; M11 beta. |

---

## 3. Contribution timing — **approved**

**Status: APPROVED** (PO clarifications this turn). Replaces prior free 14-day backdated-create ideas and the interim “create into a closed week via correction” example. Other MVP plan §3.3 defaults remain **OPEN**. **Implementation still requires a separate go — stop before M1.**

### 3.0 Approved rules

1. **Week boundary:** Weeks run **Monday 00:00:00 → Sunday 23:59:59.999** in the **challenge time zone** (Nov 2026 calendar used in examples below).
2. **Ordinary create = today-only:** New ordinary contributions use **today’s date** in the challenge TZ. No free-form backdated create.
3. **Authorised corrections (MVP):** may **amend or reverse** an **existing** entry (SAVE-02 audit). They may **not create a missing entry** in a closed week. No MVP path invents a contribution where none existed.
4. **Attempt to date into a closed week:** Ordinary create rejects non-today dates. If the closed week has **no** existing entry, there is **nothing to amend** — the week stays as assessed (typically **Missed**); UX explains that MVP cannot add a new closed-week entry.
5. **Week allocation:** Entire amount → the **single week containing the contribution date**; ordinary creates always land in the current open week.
6. **Streak recompute:** After amend/reverse changes eligible sums, **recompute** affected week statuses and streak from the corrected sequence; **preserve audit history**.
7. **Milestones:** Keep **historical milestone announcements** distinct from **current progress**. (Broader §3.3 milestone defaults remain OPEN except this distinction.)
8. **Late join / activation assessment start (challenge TZ):**
   - **Monday** activations → commitment assessment starts in the **current** week.
   - **Tuesday–Sunday** activations → first assessed commitment week = **following Monday**.
9. **Pre-assessment savings:** Amounts recorded before the first assessed week count toward **personal target and progress milestones only** — not commitment Completed/Missed for unassessed weeks, and they do not pre-satisfy a later week’s commitment.
10. **Excess / no-carry and other §3.3 defaults:** Remain **OPEN** for separate review.

Challenge TZ for all examples: `Europe/London`. Weekly commitment: **£50**. Target: **£2,000**.

**Correct Nov 2026 week grid (used below)**

| Week | Dates (Europe/London) |
| --- | --- |
| W44 | Mon **26 Oct** – Sun **1 Nov** |
| W45 | Mon **2 Nov** – Sun **8 Nov** |
| W46 | Mon **9 Nov** – Sun **15 Nov** |
| W47 | Mon **16 Nov** – Sun **22 Nov** |

---

### Example A — Today-only ordinary entry; closed week with no entry stays Missed

**Setup**

| Item | Value |
| --- | --- |
| Today | Thursday **12 Nov 2026** |
| Week W45 | Mon 2 Nov – Sun 8 Nov (**closed**) — **Missed**, **no contribution rows** |
| Week W46 | Mon 9 Nov – Sun 15 Nov (**open** / current) |
| Personal saved | £1,190 |

**Action 1 (allowed):** Alex records an ordinary **£50**. Date fixed to **today = 12 Nov 2026** (W46).

| Field | Before | After |
| --- | --- | --- |
| Contribution date | — | **12 Nov 2026** (today only) |
| W46 eligible sum | £0 | £50 |
| W45 | Missed (no rows) | **Unchanged** |
| Personal saved | £1,190 | £1,240 |

**Action 2 (rejected):** Alex tries to date an ordinary create to **Friday 6 Nov 2026** (W45, closed).

| Outcome | Rule |
| --- | --- |
| Ordinary create | **Rejected** — not today |
| Create-in-closed-week | **Not allowed** in MVP (including via “correction”) |
| W45 | **Stays Missed** — no existing entry to amend or reverse |

**Locked outcome:** Ordinary Path A = today → current week. An empty missed closed week **cannot** be filled in MVP.

---

### Example B — Amend existing under-recorded entry (raise); empty missed week cannot be created

**Setup (shared calendar)**

| Item | Value |
| --- | --- |
| Today | Thursday **12 Nov 2026** |
| W44 | **Completed** (£50) |
| W45 | Closed |
| W46 | In progress |
| Prior streak ending W44 | **2** (…→W43→W44); broken if W45 is Missed |

#### B1 — Empty Missed week (no entry) — **no MVP fix**

| Item | Value |
| --- | --- |
| W45 | **Missed**, eligible £0, **zero contribution rows** |

| Attempt | Result |
| --- | --- |
| Ordinary create dated into W45 | Rejected |
| Authorised “correction” that would **create** a new W45 row | **Not allowed** (MVP corrections amend/reverse only) |
| W45 after | Still **Missed**; streak remains **0** |

#### B2 — Amend existing entry **up** (£40 → £50) after a two-week streak

| Item | Value |
| --- | --- |
| W45 | Had an ordinary entry of **£40** while open → week closed as **Missed** (under £50) |
| Personal saved | £1,230 (includes that £40) |
| Current streak | **0** |

**Action:** Authorised correction **amends** the existing W45 row **£40 → £50** (audit before/after; not a new create).

| Week | Before status | Before eligible | After status | After eligible |
| --- | --- | --- | --- | --- |
| W44 | Completed | £50 | Completed | £50 |
| W45 | **Missed** | £40 | **Completed** | £50 |
| W46 | In progress | — | In progress | — |

| Field | Before | After |
| --- | --- | --- |
| Current streak | **0** | **3** (recomputed through W45 Completed) |
| Personal saved | £1,230 | £1,240 |
| Audit | — | Amend preserved (£40→£50) |

**Locked outcome:** Raising an **existing** under-commitment entry can flip Missed→Completed and restore streak. Creating a brand-new closed-week entry cannot.

---

### Example C — Amend down / reverse; historical milestone vs current progress

**Setup**

| Item | Value |
| --- | --- |
| Today | Thursday **12 Nov 2026** |
| W44–W45 | **Completed** at £50 each → with prior week, streak **3** |
| W45 entry | Existing **£50** row |
| Personal saved | £1,000 → **50% Halfway** historically announced |
| W46 | No contribution yet |

**Action C1 — Amend down:** Authorised correction **£50 → £40** on the existing W45 row.

| Field | Before | After |
| --- | --- | --- |
| W45 eligible | £50 | £40 |
| W45 status | Completed | **Missed** |
| Current streak | 3 | **0** |
| Personal saved (current) | £1,000 | £990 |
| Current progress % | 50% | ~49.5% (rounding OPEN in §3.3) |
| Historical 50% Halfway | Announced | **Retained as history** |
| Current progress UI | £1,000 / 50% | Shows **current** £990 separately from historical announcement |

**Action C2 — Reverse:** Instead, authorised **reverse** of the W45 £50 entry (status reversed; audit kept).

| Field | After reverse |
| --- | --- |
| W45 eligible | £0 |
| W45 status | **Missed** |
| Current streak | **0** |
| Personal saved | Reduced by £50 from pre-reverse total |
| Audit | Reverse preserved; no silent delete |

**Locked outcome:** Amend/reverse recompute weeks + streak + current progress; audit retained; historical announcements stay distinct from current figures.

---

### Example D — Late join: Monday vs Tuesday–Sunday activation; Mon **16 Nov 2026**

**Calendar:** W46 = Mon **9 Nov** – Sun **15 Nov**; W47 = Mon **16 Nov** – Sun **22 Nov**.

#### D1 — Tuesday–Sunday activation → first assessed week = following Monday **16 Nov 2026**

| Item | Value |
| --- | --- |
| Join | Riley approved **Thursday 12 Nov 2026** |
| Activation | Target £1,500 + weekly £50 activated **Friday 13 Nov 2026** (Tue–Sun) |
| Pre-assessment save | Ordinary **£30** on Saturday **14 Nov** (today-only; still in W46) |

| Rule | Outcome |
| --- | --- |
| First assessed commitment week | **Monday 16 November 2026** (W47) |
| W46 | **Not assessed** Completed/Missed for Riley’s commitment |

| Bucket for the £30 | Counts? |
| --- | --- |
| Personal target / progress milestones | **Yes** — £30 toward £1,500 |
| W46 commitment assessment | **No** |
| W47 £50 commitment | **No** — does not pre-satisfy next week |

If Riley records £0 in W47 → W47 **Missed**; streak 0; £30 remains in personal saved.

#### D2 — Monday activation → assessment starts **current** week

| Item | Value |
| --- | --- |
| Activation | **Monday 16 Nov 2026** (challenge TZ) |
| First assessed week | **W47 (current)** — Mon 16 Nov – Sun 22 Nov |
| Any savings dated before Mon 16 Nov | Personal target / milestones only; no commitment assessment for those earlier days |

**Locked outcome:** Tue–Sun activations wait until **Mon 16 Nov 2026** in this W46 example; Monday activations assess the week that contains that Monday.

---

## 4. G1.1-06 privacy inference — G1.1-06-R1 **approved**

### 4.1 Approved baseline (frozen product + approved rule)

- Opt-out hides **amounts and target** from others.
- Private values **excluded** from other members’ visible aggregates.
- Label totals as sharing / visible-member totals — never full-group.
- Hidden values must not be reconstructable via aggregates or other exposed data (G1.1-06 AC).
- Cannot-undo: previously viewed information cannot be made unseen (PRIV-01 / mid-fi).

**G1.1-06-R1 status: APPROVED** (this turn), with clarification:

> An opt-out delta may restate **only** figures the **same viewer** was already authorised to see. It must not disclose amounts that viewer never had access to, nor any **post-opt-out** private movement.

MVP plan §3.2 recommendations are **superseded** by this approved rule for aggregate composition / leakage acceptance.

### 4.2 Before / after opt-out attack (canonical sample)

Portugal challenge — approved member **Sam** watching aggregates. Jordan already Private (excluded).

| Moment | Sharing-member saved | Sharing-member target | Roster (Sam’s view) |
| --- | --- | --- | --- |
| **T0 — Alex still sharing** | **£3,080** | **£5,500** | Alex £1,240 / £2,000 visible; Sam+Riley make up the rest; Jordan Private |
| **T1 — Alex opts out** | **£1,840** | **£3,500** | Alex shows **Private** (no amount/target/% bar); Jordan Private |

**Delta:** saved £3,080 − £1,840 = **£1,240**; target £5,500 − £3,500 = **£2,000**.

| Kind | What Sam learns from the delta |
| --- | --- |
| **Allowed restatement** | Alex’s £1,240 and £2,000 were already authorised for **Sam** while Alex shared. The opt-out delta may restate **only those same-viewer-authorised** figures. Covered by cannot-undo warning. |
| **Forbidden new disclosure** | Any signal that reveals **post-opt-out** private monetary movement, or amounts that this viewer was **never** authorised to see. |

### 4.3 New-disclosure probes (must fail — acceptance suite)

1. **Private contribution after opt-out:** Alex (opted out) records +£100. Sam’s sharing total must remain **£1,840**. If it moves by £100, the aggregate disclosed a private amount.
2. **Private correction after opt-out:** Alex corrects £1,240→£900 while opted out. Sam’s total must **not** move.
3. **Private reverse after opt-out:** Alex reverses a contribution while opted out. Sam’s totals, roster, and feed amounts must **not** change.
4. **Private target change after opt-out:** Alex changes personal target while opted out. Sam’s visible target aggregate / roster must **not** change.
5. **Historical views:** Serving queryable past sharing-total series (e.g. `[…, 3080, 1840, …]`) enables systematic reconstruction beyond live residual memory. **Do not ship** historical aggregate APIs / charts that replay sharing totals for MVP.
6. **Stale responses:** Cached or long-lived client/API payloads must not leave a viewer with **post-opt-out** monetary fields or outdated sharing totals that re-introduce private addends after privacy state changes. After opt-out (or membership/privacy revocation), subsequent reads for other viewers must omit the subject’s monetary keys and exclude them from aggregates; stale “still sharing” snapshots are not an acceptable leak channel.
7. **Roster math:** Private members omit amount, target, and progress % (no zeroed placeholders).
8. **Feed:** No contribution amounts for opted-out members; non-monetary events only where they do not encode £ size.
9. **Viewer-scoped restatement:** A viewer who **never** saw Alex’s figures (e.g. joined after Alex was already Private) must **not** be able to recover Alex’s last shared amounts via any aggregate delta, history, or roster math.
10. **k-anonymity hide when sharer count &lt; 3:** Still **not recommended for MVP** (OPEN default) — would hide consented sharers’ combined figure and fights mid-fi labelling.

### 4.4 Approved testable rule — G1.1-06-R1

**Rule G1.1-06-R1 — Live sharers only; no private delta leakage**

1. **Composition:** `visible_saved` / `visible_target` = sum of eligible saved / targets for members with `share_monetary_info = true` **at read time** only. Label: **Sharing members only**.
2. **Transition residual (clarified):** When a member flips true→false, they drop out of the next read’s aggregate. An observing member may infer a drop that restates figures **that same viewer** was already authorised to see — cannot-undo residual only. Do **not** expose deltas or history that reveal figures to viewers who were never authorised. Do not add APIs that replay historical totals.
3. **Post-privacy invariance (testable):** For any viewer ≠ subject, after subject has `share_monetary_info = false`, mutations of subject’s monetary rows — **create, correct, reverse, and target change** — must **not** change viewer-visible aggregates, roster monetary fields, or feed amounts.
4. **Stale / historical hardening:** No historical sharing-total endpoint; clients and APIs must not serve stale monetary projections for other members after opt-out.
5. **API shape:** Opted-out other-member payloads **omit** monetary keys (not `0`). Aggregates never include private addends. No “including private as zero” total.
6. **Prerequisite for M6:** Automated tests for the probes above **pass before** first exposing sharing-member totals in a deployed build. M7 reuses the same suite for the Path C fixture (£1,840 of £3,500).

**Still OPEN (not part of G1.1-06-R1 lock):** Whether re-opt-in is allowed later; small-group suppression (recommend **no**); streak display without £ leakage (recommend streak count / status without commitment £).

### 4.5 Privacy checks = prerequisites for M6

| Check | Required before M6 exposes sharing totals |
| --- | --- |
| Server composition = current sharers only | Yes |
| Path C fixture: Alex Private → £1,840 / £3,500 for others | Yes |
| Post-opt-out **create** does not move others’ aggregate / roster / feed | Yes |
| Post-opt-out **correct** does not move others’ aggregate / roster / feed | Yes |
| Post-opt-out **reverse** does not move others’ aggregate / roster / feed | Yes |
| Post-opt-out **target change** does not move others’ aggregate / roster / feed | Yes |
| Opt-out delta restates only same-viewer-authorised figures | Yes |
| Viewer who never saw private member’s figures cannot recover them via delta/history | Yes |
| No aggregate history endpoint / historical sharing-total views | Yes |
| Stale responses do not re-expose post-opt-out monetary fields or private addends | Yes |
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
| M0 architecture direction / ADR-A…H / stack sketch | **Approved for planning** at `1f543e6` | Implementation **not** authorised |
| Contribution timing (§3 / MVP §3.1) | **Approved** | Today-only; corrections = amend/reverse only (no create-in-closed-week); Mon vs Tue–Sun assessment; Mon–Sun weeks |
| G1.1-06-R1 aggregate inference rule (§4) | **Approved** | Same-viewer-authorised restatement; M6 prerequisite suite |
| M2 challenge activation (G1.1-02) | **Approved for planning** | CHAL-01 incl. currency; future → Scheduled; today → Active; reject past; midnight start/end in challenge TZ; cancel out of M2 — `m2-challenge-plan.md` §2 |
| MVP plan §3.3 defaults (IA labels, pause indefinite, streak 3/6/12, etc.) | **OPEN** | Activation removed from this OPEN bundle — see row above |
| Excess carry / other §3.3 money defaults | **OPEN** | Not locked with contribution timing |
| Pause max / resume; streak milestone thresholds | **OPEN** | G1.1-08/11 + plan §3.3 |
| Challenge cancellation rules; ownership deletion fallback; post-completion reopen | **OPEN** | Cancel action out of M2 |
| Small-group k-anonymity suppression | **OPEN** (recommend reject for MVP) | |
| Implementation M1+ / M2 | **NOT AUTHORISED** | Explicit separate PO go required — activation planning lock ≠ coding go |

---

## 6. Stop conditions

**PO decisions recorded.** Frozen Gate 1 / Gate 1.1 specs were not modified. No M2 (or other) application implementation authorised by this planning lock. M1 email-link gate still pending.

**Locked**

1. M0 architecture direction **approved for planning** at `1f543e6`.
2. **G1.1-06-R1 approved** (§4).
3. **Contribution timing approved** (§3) — including no create-in-closed-week; Mon vs Tue–Sun assessment start; Examples A–D corrected for Nov 2026 / Mon **16 Nov**.
4. **M2 challenge activation approved for planning** — canonical text `m2-challenge-plan.md` §2; cancel remains OPEN / out of M2.

**Still OPEN / not a go**

5. Other §3.3 defaults (except activation) — separate review.
6. **M1+ / M2 implementation** — needs explicit approval. This document is not authority to scaffold, migrate, or deploy. M1 email-link gate still pending.

---

## 7. Document control

| Field | Value |
| --- | --- |
| Authoring mode | Gate 3 / M0 planning only |
| Architecture planning approval | **Yes** at `1f543e6` |
| Contribution timing approval | **Yes** (§3) |
| Implementation authorised | **No** — M2 activation planning lock ≠ coding go |
| M2 activation planning approval | **Yes** — `m2-challenge-plan.md` §2 |
| Spec files modified | **None** |
| Companion plans | `docs/engineering/mvp-build-plan.md`, `docs/engineering/m2-challenge-plan.md` |
| Next stop | Finish M1 email gate; remaining §3.3 review as needed; **explicit M2 go** before M2 implementation |
