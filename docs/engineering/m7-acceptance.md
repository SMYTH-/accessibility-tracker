# M7 Acceptance Checks

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M7 · PRIV-01 · G1.1-06 · G1.1-06-R1 |
| M6 base tip | `55198423` (PR #7) |
| Implementation branch | `cursor/m7-privacy-settings-2765` |
| Tip SHA | `7efc09f2` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod) |
| Date | 13 November 2026 |
| Machine | Dom’s Mac — `/Users/dom.smyth/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` |
| Evidence | `npm run smoke:m7` · `npm run evidence:m7:pg` · `npm run evidence:m7:ui` · `media/m7/` |
| Migration | `20261113180000_m7_privacy_settings.sql` (applied live) |

## Checklist

### PRIV-01 / G1.1-06 — Settings + opt-out

| Check | Result | Evidence |
| --- | --- | --- |
| Default = visible to approved members (not private-by-default) | **Pass** | UI `02`; RPC `default_visible`; join disclosure unchanged |
| One control hides amounts **and** target | **Pass** | Profile Hide monetary; Sam roster omits both after opt-out (`07`) |
| Cannot-undo warning on settings | **Pass** | UI `02`/`04`; ack required before Save |
| Cannot-undo warning on join disclosure | **Pass** | Existing `JoinDisclosureForm` (M3) |
| Opted-out excluded from others’ aggregates | **Pass** | Path C £3,080/£5,500 → £1,840/£3,500 (PG + UI `03`→`07`) |
| Self view retains own figures while excluded | **Pass** | PG + UI `06` |
| Private chip; no amount / target / progress % for others | **Pass** | UI `07`; PG roster keys omitted |
| Unauthorised API cannot retrieve hidden amounts | **Pass** | Stranger denied; fixture RPC not callable by authenticated |
| Feeds respect visibility | **Pass** | Sam activity preview omits Alex amounts after opt-out |
| Server-side enforcement | **Pass** | `set_own_share_monetary_info` security definer + membership gate |

### G1.1-06-R1 — Two-account invariance

| Check | Result | Evidence |
| --- | --- | --- |
| Real separate Supabase sessions | **Pass** | alex / sam / stranger |
| Signed-in opt-out (not fixture-only) | **Pass** | `set_own_share_monetary_info` as Alex |
| Sharing-member total updates on opt-out | **Pass** | £3,080/£5,500 → £1,840/£3,500 |
| Post-opt-out create/amend/reverse leave others unchanged | **Pass** | PG totals + feed ids stable |
| Refreshed views + direct roster/totals APIs | **Pass** | PG |
| Re-opt-in not invented | **Pass** | `REOPT_IN_DEFERRED` |
| Small-group suppression not invented | **Pass** | Listed `open` in `list_own_privacy_settings` |

### Mid-fi Path C

| Check | Result | Evidence |
| --- | --- | --- |
| Profile → Financial privacy | **Pass** | UI `02` |
| Opt-out → other member loses amount+target | **Pass** | UI `07` |
| Self still sees own | **Pass** | UI `06` |
| Sharing members only labelling | **Pass** | Home + Challenge |

## Explicitly not verified / out of scope

| Item | Note |
| --- | --- |
| Weekly assessment + streak calculation | **M8** |
| Full challenge activity feed | **M9** |
| Re-opt-in allowed | Still **OPEN** — deferred with clear error |
| Small-group suppression | Still **OPEN** |
| Exports / notifications monetary payloads | No export/notif money channels in MVP yet; feed + dashboard covered |
| Post-activation target editing | Remains parked (M4) |

## Commands

```bash
npm run smoke:m7
npm run evidence:m7:pg
npm run evidence:m7:ui
```

## RPCs

- `set_own_share_monetary_info(challenge_id, share)` — authenticated; opt-out only; audit `share_monetary_info_opt_out`
- `list_own_privacy_settings()` — approved memberships + open flags for re-opt-in / small-group
- Existing reads: `challenge_dashboard`, `sharing_member_totals`, `challenge_roster_projection`, `challenge_activity_preview`
- Fixtures remain service_role: `set_share_monetary_info_for_tests`

## Live suite result

`npm run smoke:m7` → **19/19** · `npm run evidence:m7:pg` → **47/47 passed** (13 Nov 2026).

## Verdict

M7 financial privacy settings + two-account E2E (G1.1-06 / G1.1-06-R1) verified on live Supabase with signed-in opt-out, cannot-undo warning, and server enforcement. **Stop before M8.**
