# PostCSS advisory vs intended beta deployment

| Field | Value |
| --- | --- |
| Date | 14 November 2026 |
| Tree | `next@15.5.29` nests `postcss@8.4.31`; app/Tailwind use `postcss@8.5.32` (patched) |
| Advisory | High — GHSA-qx2v-qp2m-jg93 and related sourceMappingURL issues (`postcss <= 8.5.22`) |
| `npm audit` force fix | Installs **Next 16.4.6** (breaking) |

## Exploit surface (honest)

The nested PostCSS is Next’s **build/dev CSS pipeline**, not a user-facing request handler. The known issues centre on CSS stringify / attacker-controlled `sourceMappingURL` during processing. For Accountability Tracker:

- Closed-lab **localhost** with trusted operators and no untrusted CSS ingestion → practical risk is **low**.
- Internet-reachable beta with untrusted content or build pipelines that process attacker CSS → treat as **needs a supported fix before invite GO**.

Sharp is already pinned to **0.35.5** (cleared from current highs).

## Options

| Option | What | Recommendation |
| --- | --- | --- |
| A. Supported patch without Next major | Override nested `postcss` to `>=8.5.23` under Next 15 | **Tried 14 Nov** — `overrides.postcss=8.5.32` conflicts with direct `postcss@^8` (`EOVERRIDE`); Next still nests `8.4.31` after install. Not a clean supported patch without changing the direct dep range + re-validating Next |
| B. Tested Next 16 upgrade | `npm audit fix --force` / intentional Next 16.4.x + regression of smoke/journeys/a11y | **Required path before public/invite beta** if override fails or Next rejects it |
| C. Time-limited exception | Accept residual on Next 15.5.29 for **closed-lab only** through invite decision | **Acceptable now** for Dom Mac local preview + disposable Supabase; **not** acceptable as silent forever for internet invites |

## Recommendation for this handoff

1. **Closed-lab (current authorisation):** adopt **Option C** — document residual; do not block continued disposable testing.
2. **Before private-beta invites / any internet-reachable host:** either land a verified **Option A** override (build + `smoke:m10` + `evidence:m11:journeys`) **or** schedule **Option B** Next 16 with full regression — Dominic decides which.
3. Do **not** run `npm audit fix --force` on the readiness tip without a dedicated upgrade PR.

## Decision ask (invite GO)

Pick A (if proven) or B before inviting testers. C expires at invite GO.
