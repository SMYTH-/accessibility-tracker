# M6 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M6 · G1.1-06-R1 (`m0-architecture.md` §4) |
| M5 base tip | `e22f76f` (PR #6) |
| Implementation branch | `cursor/m6-dashboard-totals-18d2` |
| Tip SHA | `8b13e08f` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod) |
| Date | 13 November 2026 |
| Machine | Dom’s Mac — `/Users/dom.smyth/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m6` · `npm run evidence:m6:pg` · `npm run evidence:m6:ui` · `media/m6/` |
| Privacy harden migration | `20261113170000_m6_privacy_harden_activity.sql` (applied live) |

## Checklist

### DASH-01 — Personal dashboard

| Check | Result | Evidence |
| --- | --- | --- |
| Personal figures from eligible contributions vs target | **Pass** | PG `personal eligible 124000` · UI `01` / `07` |
| Labelled self-reported | **Pass** | Dashboard copy + RPC `source_label` |
| Current % distinct from 50% Halfway recognition | **Pass** | PG Halfway label with current 62 |
| Empty / loading / error handled | **Pass** | Empty state on Home without challenge; force-dynamic reads |
| Responsive mobile layout | **Pass** | UI shots at 390×844; `£12,450.50` fits (`07`) |
| Verify / amend / reverse update personal progress | **Pass** | PG personal after reverse+create; UI `04` after amend |
| Manrope only (Syne removed) | **Pass** | `layout.tsx` Manrope; no Syne import; before `05`/`06` → after `07`/`08` |
| Tabular numerals on amounts / % | **Pass** | `tabular-nums` on dashboard + form figures |
| Brand typography final | **Open** | Working Manrope pass only |

### G1.1-06 / PRIV — Sharing members only

| Check | Result | Evidence |
| --- | --- | --- |
| Label **Sharing members only** (never bare Group total) | **Pass** | PG + UI |
| Scope explanation excludes opted-out | **Pass** | `scope_explanation` copy |
| Aggregate = current approved sharers’ eligible saved + targets | **Pass** | Path C T0 £3,080/£5,500 → T1 £1,840/£3,500 |
| Private amounts/targets omitted (not zeroed) on roster | **Pass** | Jordan / Alex after opt-out |
| Self still sees own after opt-out | **Pass** | PG |
| Server-side only (RPC security definer + membership gate) | **Pass** | pending/removed/stranger denied |
| `member_eligible_saved_minor` not callable by signed-in sessions | **Pass** | PG permission denied (self + other) |
| Other members’ private contribution events filtered before order/limit | **Pass** | Jordan/Alex absent from Sam preview; full-feed create/amend/reverse unchanged |

### G1.1-06-R1 prerequisite suite

| Check | Result | Evidence |
| --- | --- | --- |
| Real separate Supabase sessions | **Pass** | alex/sam/riley/jordan/late/pending/stranger |
| Path C fixture £1,840 / £3,500 for others after Alex Private | **Pass** | PG |
| Post-opt-out create does not move others’ aggregate/roster/feed | **Pass** | PG |
| Post-opt-out amend does not move others’ aggregate | **Pass** | PG |
| Post-opt-out reverse does not move others’ aggregate/roster | **Pass** | PG |
| Post-opt-out target change does not move others’ aggregate/roster | **Pass** | Fixture `update_savings_target_for_tests` |
| Opt-out delta restates only same-viewer-authorised figures | **Pass** | Sam’s drop = Alex’s last shared 1240/2000 |
| Late joiner cannot recover private figures | **Pass** | PG |
| No historical sharing-total endpoint | **Pass** | `sharing_member_totals_history` missing |
| Stale re-read omits post-opt-out monetary fields | **Pass** | PG re-read |
| Pending / removed / unrelated cannot read protected figures | **Pass** | PG |
| Privacy states via fixtures (settings journey → M7) | **Pass** | `set_share_monetary_info_for_tests` service_role only |
| Full feed: private create/amend/reverse leaves other preview unchanged | **Pass** | 8-slot seed; event ids stable |
| Opted-out member still sees own figures + own preview amounts | **Pass** | PG |

### Mid-fi locked copy

| Check | Result | Evidence |
| --- | --- | --- |
| **Your streak** label (not Best/Challenge streak) | **Pass** | Dashboard + RPC |
| Streak / weekly assessment numbers | **Deferred M8** | Copy: calculated / assessment in M8 |
| Target editing | **Parked M4** | Unchanged |

## Explicitly not verified / out of scope

| Item | Note |
| --- | --- |
| Privacy settings UI + cannot-undo warning | **M7** |
| Weekly assessment + streak calculation | **M8** |
| Full challenge activity feed / roster chrome | **M9** (M6 ships privacy-filtered preview only) |
| Mid-fi £1,190 → “Current 60%” | Floor math yields 59% for 1190/2000; Path A after (1240 → 62%) matches |
| Re-opt-in / small-group suppression | Still OPEN per G1.1-06-R1 |
| Final brand typography | OPEN — Manrope working pass this slice |

## Commands

```bash
npm run smoke:m6
npm run evidence:m6:pg
npm run evidence:m6:ui
```

## RPCs

- `challenge_dashboard`, `sharing_member_totals`, `challenge_roster_projection`, `challenge_activity_preview`
- Internal helper `member_eligible_saved_minor` — **service_role / security-definer only** (authenticated revoked)
- Fixtures (service_role): `set_share_monetary_info_for_tests`, `fixture_approved_member_for_tests`, `fixture_membership_status_for_tests`

## Live suite result

`npm run evidence:m6:pg` → **92/92 passed** (13 Nov 2026).

## Verdict

M6 personal dashboard + sharing-member totals + G1.1-06-R1 privacy suite (including helper lock + pre-limit feed filter) verified on live Supabase Postgres. Syne removed; Manrope + tabular numerals for this pass. **Stop before M7.**
