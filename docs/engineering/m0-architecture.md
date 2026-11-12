# Accountability Tracker — M0 Architecture Plan (Gate 3)

| Field | Value |
| --- | --- |
| Document | Gate 3 / M0 technical architecture (planning only) |
| Status | **Partial PO decisions recorded** — contribution timing revised for re-review before M1 |
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
4. **G1.1-06-R1 is approved** (§4) with the viewer-authorised restatement clarification. **Contribution timing (§3) is a revised proposal awaiting PO approval** before M1. Other §3.3 defaults remain **OPEN**.
5. **Logo / final palette / type remain open.** Working accents only.

### Prerequisite gates before coding

| Gate | Must complete before |
| --- | --- |
| This Gate 3 architecture review (planning approval recorded) | Any scaffolding or persistence work |
| PO approval of revised contribution timing (§3) | M5 (SAVE), M8 streaks |
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

**Eligibility (G1.1-05):** Progress and commitment math use only valid, authorised, non-reversed, in-period contributions for active savings participants. Ordinary create = **today-only** (challenge TZ); closed-week changes via **authorised corrections** — revised proposal awaiting approval (§3).

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
| **Recommendation** | **(1)**. Exact Monday–Sunday grid remains part of the **revised contribution proposal** (§3) — architecture commits to zone-aware engine. |
| **Blocks if deferred** | M5/M8 scheduling correctness. |

### ADR-H — Environments and secrets

| | |
| --- | --- |
| **Context** | §10.4 secret management; private beta readiness. |
| **Options** | (1) local + staging + prod with host secret store · (2) prod-only · (3) secrets in repo (reject) |
| **Recommendation** | **(1)** Three environments; no secrets in git; staging used for M11 QA. |
| **Blocks if deferred** | M1 deploy path; M11 beta. |

---

## 3. Contribution timing — revised proposal (awaiting PO approval)

**Status: RECOMMENDED / AWAITING APPROVAL** — replaces the prior §3 / MVP §3.1 proposal that assumed free 14-day backdated creates. Frozen G1.1-05 still requires documented timing rules before implementation. **Do not implement until PO approves this revision.** Other product defaults (§3.3 in the MVP plan) remain **OPEN**.

### 3.0 Revised rules (proposal)

1. **Week boundary (still proposed):** Weeks run **Monday 00:00:00 → Sunday 23:59:59.999** in the **challenge time zone**.
2. **Ordinary create = today-only:** New ordinary contributions use **today’s date** in the challenge TZ. No free-form backdated create in the ordinary flow.
3. **Closed-week changes = authorised corrections:** Changing amounts that affect a **closed** week (prior Monday–Sunday that has already ended) goes through the **authorised correction** path (SAVE-02 audit), not by dating a new ordinary entry into that week.
4. **Attempt to date into a closed week:** Ordinary create UI/API rejects past closed-week dates and **redirects** the user to the correction flow (or explains that closed weeks need a correction of an existing entry / authorised correction process).
5. **Week allocation:** Entire contribution amount applies to the **single week that contains the contribution date** — no split. For ordinary creates that week is always the current open week (today’s week).
6. **Excess over weekly commitment:** Counts fully toward **personal target / milestones**; does **not** carry into future weeks’ commitment progress. (**Still OPEN** as a §3.3-style default unless PO locks it with this package.)
7. **Streak recompute:** After any authorised correction that changes eligible sums, **recompute week statuses and streak** from the corrected sequence of weeks (G1.1-09 deterministic).
8. **Milestones:** Distinguish **historical milestone announcements** (retained as history) from **current progress** % / saved total. Do not strip historical announcements solely because current progress dips; do not re-announce the same threshold on recovery. (**Milestone retention detail still OPEN** in MVP §3.3 — called out here for the correction examples.)
9. **Late joins:** First **assessed** commitment week starts the **following Monday** after savings activation (challenge TZ). Amounts recorded **before** that first assessed week still count toward **personal target / milestones**, but those pre-assessment calendar days do **not** produce Completed/Missed commitment assessments.

Challenge TZ for all examples: `Europe/London`. Weekly commitment: **£50**. Target: **£2,000**.

---

### Example A — Today-only ordinary entry (closed-week date → correction path)

**Setup**

| Item | Value |
| --- | --- |
| Today | Wednesday **12 Nov 2026** |
| Week W45 | Mon 3 Nov – Sun 9 Nov (**closed**) |
| Week W46 | Mon 10 Nov – Sun 16 Nov (**open** / current) |
| Prior state | W45 **Missed** (£0) · W46 eligible sum £0 so far |
| Personal saved | £1,190 |

**Action 1 (allowed):** Alex records an ordinary **£50** contribution. Date is fixed to **today = 12 Nov 2026** (W46).

| Field | Before | After |
| --- | --- | --- |
| Contribution date | — | **12 Nov 2026** (today only) |
| W46 eligible sum | £0 | £50 |
| W45 | Missed | **Unchanged** (ordinary create cannot touch closed week) |
| Personal saved | £1,190 | £1,240 |

**Action 2 (rejected → redirect):** Alex tries to set the ordinary create date to **Friday 7 Nov 2026** (W45, closed).

| Outcome | Rule |
| --- | --- |
| Ordinary create | **Rejected** — date is not today in challenge TZ |
| UX / API | Direct Alex to the **authorised correction** path (cannot invent a free backdated ordinary entry into a closed week) |
| W45 | Remains Missed until a correction (Example B pattern) changes eligible sum |

**Proposal outcome:** Ordinary Path A stays simple (today → current week). Recovering a missed closed week is a correction concern, not a create-date picker.

---

### Example B — Correction fills a missed week immediately after a two-week streak

**Setup**

| Item | Value |
| --- | --- |
| Today | Wednesday **12 Nov 2026** |
| W43 | Mon 20 Oct – Sun 26 Oct → **Completed** (£50) |
| W44 | Mon 27 Oct – Sun 2 Nov → **Completed** (£50) |
| W45 | Mon 3 Nov – Sun 9 Nov → **Missed** (£0) — closed |
| W46 | Mon 10 Nov – Sun 16 Nov → in progress |
| Streak before correction | **0** (broken by W45 miss); completed sequence ending W44 was streak **2** |
| Personal saved | £1,190 (includes W43+W44; nothing for W45) |

**Action:** Via **authorised correction**, Alex adds / corrects so W45 eligible sum becomes **£50** (e.g. correct an existing under-recorded row, or authorised correction that attributes £50 into W45 with full audit — **not** an ordinary create dated 7 Nov).

**Before → after**

| Week | Before status | Before eligible | After status | After eligible |
| --- | --- | --- | --- | --- |
| W43 | Completed | £50 | Completed | £50 |
| W44 | Completed | £50 | Completed | £50 |
| W45 | **Missed** | £0 | **Completed** | £50 |
| W46 | In progress | (unchanged) | In progress | (unchanged) |

| Field | Before | After |
| --- | --- | --- |
| Current streak | **0** | **3** (recomputed: W43–W45 consecutive Completed) |
| Personal saved | £1,190 | £1,240 |
| Audit | — | Correction recorded (before/after amounts, actor, timestamp) |

**Proposal outcome:** Filling the missed week that sat immediately after a two-week streak **restores a three-week streak** from the corrected sequence. Show this recomputed streak in “Your streak” / current progress — not as a silent background change.

---

### Example C — Correction breaks streak; historical milestone vs current progress

**Setup**

| Item | Value |
| --- | --- |
| Today | Wednesday **12 Nov 2026** |
| Commitment | £50 / week |
| W43–W45 | All **Completed** at £50 → streak **3** |
| Personal saved | £1,000 exactly → **50% Halfway** historically announced |
| W46 | No contribution yet |

**Action:** Authorised correction on the W45 contribution **£50 → £40** (active row revised; not deleted).

**After**

| Field | Before | After |
| --- | --- | --- |
| W45 eligible sum | £50 | £40 |
| W45 status | Completed | **Missed** |
| Current streak | 3 | **0** (recompute; miss preserved in sequence) |
| Personal saved (current progress) | £1,000 | £990 |
| Current progress % | 50% | 49.5% (display rounding still OPEN) |
| **Historical** 50% Halfway announcement | Present | **Retained as history** — do not strip because current % dipped |
| Current progress UI | Shows 50% / £1,000 | Shows **current** £990 / ~49.5% **separately** from historical announcement |

**Proposal outcome:** Corrections recompute week status + streak + current saved/%. **Historical milestone announcements** stay visible as past events; **current progress** reflects the corrected totals. No re-announce if they later climb back through 50%.

---

### Example D — Late join: first assessed Monday; pre-assessment savings

**Setup**

| Item | Value |
| --- | --- |
| Challenge TZ | Europe/London · Monday–Sunday weeks |
| Week W46 | Mon 10 Nov – Sun 16 Nov |
| Week W47 | Mon 17 Nov – Sun 23 Nov ← **first assessed week** under this proposal |
| Join | Riley approved **Thursday 13 Nov 2026** 18:00 London |
| Activation | Target £1,500 + weekly £50 activated **Friday 14 Nov 2026** |
| Pre-assessment activity | Records **£30** on Saturday **15 Nov** (ordinary today-only create while still in W46) |

**Assessment start**

| Rule | Outcome |
| --- | --- |
| First assessed commitment week | **Monday 17 Nov 2026** (W47) — the Monday **following** activation |
| W46 (join/activation week) | **Not assessed** as Completed/Missed for commitment (no miss for joining mid-week) |

**How the £30 before first assessed week counts**

| Bucket | Counts? |
| --- | --- |
| Personal saved / target progress / milestones | **Yes** — £30 toward £1,500 |
| W46 commitment week assessment | **No** — W46 is outside the assessed commitment window for this late join |
| W47 commitment progress | **No carry** of the £30 into W47’s £50 commitment (excess/pre-week amounts do not pre-satisfy next week) |

**If Riley records £0 in W47:** W47 → **Missed**; streak 0. The earlier £30 still sits in personal saved.

**Proposal outcome:** Late joiners are not punished with a partial-week Missed. Personal progress can start immediately; commitment streak assessment waits until the next Monday.

**Still for PO to approve with this package:** Monday week start; today-only ordinary create; closed-week → correction only; late-join following-Monday assessment; excess/no-carry and milestone-retention defaults if locking alongside.

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
| Contribution timing (§3 revised / MVP §3.1) | **RECOMMENDED / AWAITING APPROVAL** | Today-only + corrections; needed before M5/M8; revise before M1 |
| G1.1-06-R1 aggregate inference rule (§4) | **Approved** | Same-viewer-authorised restatement only; M6 prerequisite suite expanded |
| MVP plan §3.3 defaults (IA labels, pause indefinite, streak 3/6/12, activation, etc.) | **OPEN** | Recommendations only — **not approved** |
| Excess carry / milestone retention / week-boundary lock | **OPEN** until PO acts on revised §3 (week Mon–Sun still proposed with it) | G1.1-05 deferred items |
| Pause max / resume; streak milestone thresholds | **OPEN** | G1.1-08/11 + plan §3.3 |
| Challenge activation detail; ownership deletion fallback; post-completion reopen | **OPEN** | |
| Small-group k-anonymity suppression | **OPEN** (recommend reject for MVP) | |
| Implementation M1+ | **NOT AUTHORISED** | Needs separate PO go after contribution timing + other blockers |

---

## 6. Stop conditions

**Partial PO decisions recorded.** Frozen Gate 1 / Gate 1.1 specs were not modified. No application implementation started.

**Recorded this turn**

1. M0 architecture direction **approved for planning** at `1f543e6` — not an implementation go.
2. **G1.1-06-R1 approved** with viewer-authorised restatement clarification + expanded M6 checks (§4).

**Still needs PO before M1 / M5 / M8**

3. **Revised contribution timing (§3)** — today-only ordinary creates; closed weeks via authorised corrections; streak recompute; late-join following Monday; Examples A–D.

**Implementation and coding milestones (M1+) need separate approval.** This document alone is not a go to scaffold, migrate, or deploy product code.

---

## 7. Document control

| Field | Value |
| --- | --- |
| Authoring mode | Gate 3 / M0 planning only |
| Architecture planning approval | **Yes** at `1f543e6` |
| Implementation authorised | **No** |
| Spec files modified | **None** |
| Companion plan | `docs/engineering/mvp-build-plan.md` |
| Next stop | PO review of **revised contribution timing (§3)** before M1 |
