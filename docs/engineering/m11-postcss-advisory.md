# PostCSS advisory vs intended beta deployment

| Field | Value |
| --- | --- |
| Date | 14 November 2026 |
| Resolution | **Verified compatible override** — nested PostCSS high cleared without Next 16 |
| Tree now | `next@15.5.29` → `postcss@8.5.32` (deduped via override) |
| Prior | Next nested `postcss@8.4.31` (high advisories) |
| `npm audit` highs | **0** postcss/sharp highs after override + sharp pin |

## What we did

1. Pinned direct `devDependencies.postcss` to exact **`8.5.32`** (was `^8`, which blocked overrides with `EOVERRIDE`).
2. Set `overrides.postcss` to **`8.5.32`** so Next’s nested copy dedupes to the patched release.
3. Regression (local): `next build` Pass · `smoke:m10` Pass · `evidence:m11:tick` 9/9 · `evidence:m11:a11y` 11/11 · `evidence:m11:journeys` 86/86.

## Options status

| Option | Outcome |
| --- | --- |
| A. Compatible override | **Done** — preferred path landed |
| B. Next 16 upgrade | Not required for this advisory now; keep as future platform choice |
| C. Time-limited exception | Superseded for PostCSS by A |

## Residual

- `npm audit` still reports **moderate** toolchain issues (e.g. minimatch via eslint) — non-runtime for the app path; optional later cleanup.
- Re-check `npm ls postcss` / `npm audit` after any Next bump.
