# M7 Walkthrough — Financial privacy settings

| Field | Value |
| --- | --- |
| Against | `mvp-build-plan.md` § M7 · PRIV-01 · G1.1-06 · G1.1-06-R1 |
| Base | M6 tip `55198423` (`cursor/m6-dashboard-totals-18d2`) |
| Branch | `cursor/m7-privacy-settings-2765` |
| Persistence | Supabase `gdrkejobqlvtwnlaedpu` |
| Preview | `http://localhost:3000` |
| Stop | Before M8 |

## What shipped

| Area | Behaviour |
| --- | --- |
| Settings entry | Profile → **Financial privacy** (`#privacy`); also linked from Home roster + Challenge overview |
| Default | Visible to **approved challenge members** — not private-by-default |
| Control | One per approved membership: **Hide monetary information (opt-out)** — hides amounts **and** target |
| Warning | **Opting out cannot undo what others already saw** (settings + join disclosure already) |
| Server | `set_own_share_monetary_info` (authenticated, self only); reads still via dashboard/roster/totals/feed RPCs |
| Self view | Opted-out member still sees own figures; excluded from others’ Sharing members only total |
| Re-opt-in | **OPEN / deferred** — signed-in path raises `REOPT_IN_DEFERRED` (not invented as allowed) |
| Small-group suppression | **OPEN** — not invented |

## Two-account Supabase walkthrough

1. Create challenge (Alex) → fixture-approve Sam → both activate savings → Alex records £1,000 then amends to £1,240; Sam records £1,840.
2. **Before opt-out:** Sam Home shows Alex £1,240 of £2,000 · 62%; Sharing members only **£3,080 of £5,500**.
3. Alex Profile → check Hide monetary + cannot-undo ack → Save.
4. **After:** Alex still sees own £1,240 / £2,000; Sam loses Alex amount, target, and % (Private chip); Sharing members only **£1,840 of £3,500**.
5. Alex private create / amend / reverse leaves Sam totals and feed unchanged.
6. Refreshed dashboard + direct `challenge_roster_projection` / `sharing_member_totals` APIs omit private money; strangers denied.

## Media

Store + repo `media/m7/`:

| Shot | Content |
| --- | --- |
| `01` | Alex Home before (sharing) |
| `02` | Alex privacy settings default + warning |
| `03` | Sam Home before sees Alex money + £3,080/£5,500 |
| `04` | Alex opt-out form ready (ack checked) |
| `05` | Alex after opt-out (Private badge; re-opt-in open note) |
| `06` | Alex Home self still sees own |
| `07` | Sam Home after — Private chip; £1,840/£3,500 |
| `08` | Sam Challenge overview sharing-only |

## Commands

```bash
npm run smoke:m7
npm run evidence:m7:pg
npm run evidence:m7:ui
```

## Out of scope (stop before M8)

Weekly assessment / streak calculation (M8), full activity feed (M9), cancel, ownership transfer, inventing re-opt-in or small-group suppression.
