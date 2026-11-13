# M11 Acceptance Checks — private-beta readiness

| Field | Value |
| --- | --- |
| Against | `docs/engineering/mvp-build-plan.md` § M11 · Gates 6–7 · §10.1 · §10.5 · Journeys A–E · WCAG 2.2 AA |
| M10 base tip | `6e9cca6d` (PR #11) |
| Implementation branch | `cursor/m11-beta-readiness-cb14` |
| Tip SHA | `1d3fde568348fea20b302be4fd4dadd0eaaf1e7c` |
| Persistence | **Supabase** project `gdrkejobqlvtwnlaedpu` (non-prod linked) |
| Date | 13 November 2026 |
| Machine | Dom Mac · `~/Local Sites/accessibility-tracker` |
| Preview | `http://localhost:3000` |
| Evidence | `npm run evidence:m11:journeys` · `evidence:m11:ui` · `evidence:m11:a11y` · `smoke:m10` · `media/m11/` |
| Migrations | M10 set + **`20261113230000_m11_security_hardening.sql` (applied)** |
| Security review | Store `internal/m11-security-review.md` + remediations below |
| Retention | Proposal only — `docs/engineering/m11-retention-proposal.md` (**purge not implemented**) |

## Checklist

### Journeys A–E (connected two-account, live Supabase)

| Check | Result | Evidence |
| --- | --- | --- |
| A Create + 7-day invite | **Pass** | `evidence:m11:journeys` |
| B Invite preview G1.1-07 → request → decline/approve + setup | **Pass** | journeys + Ethereal delivery |
| C Record + correction | **Pass** | alex amend 1000→1240; sam record |
| D Sharing members only; stranger/pending denied | **Pass** | both dashboards |
| E Miss preserved; automatic streak recovery | **Pass** | W45 missed → W46 streak 1; pause OPEN |
| Opt-out both perspectives | **Pass** | Private chip; monetary fields omitted |
| Completion read-only | **Pass** | `CHALLENGE_READONLY` |
| Export isolation | **Pass** | peer emails/amounts excluded |
| Deletion dual-session revoke | **Pass** | `ACCOUNT_ACCESS_REVOKED` + refresh fail |
| Journey suite | **86/86** | `media/m11/journeys-evidence.json` |

### Access boundaries

| State | Result |
| --- | --- |
| Signed-out | Preview OK (non-financial); dashboard/export denied |
| Pending | `MEMBERSHIP_REQUIRED` on dashboard |
| Approved + activated | Full participation |
| Removed | Dashboard denied; own export still allowed |
| Deleted / revoking | Export + challenge APIs denied; refresh fails; old password fails |

### Email (honest)

| Item | Status |
| --- | --- |
| Intended beta | Resend → Dominic inbox |
| This verification | **Ethereal** (`RESEND_API_KEY` not configured) |
| Approve/reject outbox | Recorded + delivered to Ethereal; preview URLs in journeys JSON |
| Gap to clear | Configure Resend + confirm inbox arrival before human invites |

### Security review

| Item | Status |
| --- | --- |
| Independent review | Completed — store `internal/m11-security-review.md` |
| F-01 Unauthenticated lifecycle tick (High) | **Fixed** — `LIFECYCLE_TICK_SECRET` required (401 otherwise); verified |
| F-02 Rate-limit subject spoof (Medium) | **Fixed** — subject bound to caller; pre-auth via service_role admin client |
| F-03 Eligible replacements enumeration (Medium) | **Fixed** — revoke execute from authenticated |
| F-04 Deletion-status oracle (Medium) | **Fixed** — revoke `account_access_is_denied(uuid)` from anon/authenticated |
| F-05 Access probe fail-open (Medium) | **Fixed** — `getCurrentUser` fails closed on probe errors |
| Low: milestone sync grant / amend rate limit | **Residual** — recorded; not blocking closed-lab beta |
| Live verify of remediations | **6/6 Pass** |

### Advisories (PostCSS / Sharp)

| Package | Version in tree | Path | Fix posture |
| --- | --- | --- | --- |
| **sharp** | **0.35.5** (override + optionalDependency) | Next image pipeline | **Safe fix applied** — advisory cleared in current `npm audit` |
| **postcss** (via Next) | **8.4.31** nested under `next@15.5.29` | Next build CSS pipeline | **Needs decision** — `npm audit fix --force` wants **Next 16.4.x** (breaking). Direct app `postcss@8.5.32` already patched; residual is Next’s nested copy |
| minimatch (eslint toolchain) | transitive | dev-only | Non-runtime; optional `npm audit fix` |

### WCAG 2.2 AA

| Check | Result | Evidence |
| --- | --- | --- |
| axe wcag2a/aa + 2.1/2.2 aa on sign-in, home, challenge, record, activity, profile | **Pass** (0 critical/serious) | `media/m11/a11y-evidence.json` |
| Keyboard focus reaches controls; visible focus | **Pass** | a11y script |
| 320px reflow | **Pass** | after BottomNav/AppShell wrap fixes |
| ~200% text resize at 320px | **Pass** | `break-words` / `overflow-x-clip` |
| Contrast (axe color-contrast) | **Pass** on sampled pages | Honey Amber formal lock still OPEN |
| Suite | **11/11** | |
| Untested | Full VoiceOver/TalkBack walkthrough; complete WCAG 2.2 AA checklist beyond axe tags; reduced-motion sweep; every validation state; recovery-email a11y | Listed in a11y JSON |

### Routine defects fixed in M11

- Bottom nav / long titles / activity text overflow at large text sizes (`BottomNav`, `AppShell`, `ChallengeDashboard`, `ActivityFeedList`).
- Lifecycle tick authentication + SQL grant hardening (above).

### Explicitly open / out of scope (not invented)

| Item | Note |
| --- | --- |
| Pause scheduling / streak awards UX | OPEN |
| Re-opt-in after monetary opt-out | OPEN (`REOPT_IN_DEFERRED`) |
| Manual cancel UX (non-deletion) | OPEN |
| Multi-year purge | **Proposal only** — awaiting Dominic |
| Next 16 / nested postcss | Needs product/engineering decision |
| Resend production inbox | Config gap before human invites |
| PO Gate 7 invite authorisation | Stop — not requested |

## Commands

```bash
npm run evidence:m11:journeys
npm run evidence:m11:ui
npm run evidence:m11:a11y
npm run smoke:m10
```

## Private-beta go / no-go

### Recommendation: **NO-GO for inviting human testers** (Gate 7)

Cleared for **closed-lab** continued use (localhost / trusted operators / disposable data on `gdrkejobqlvtwnlaedpu`) after security High/Medium remediations above.

**Blockers to clear before beta invites:**

1. **Resend** configured and approve/reject (and auth) mail proven in Dominic’s inbox — Ethereal is interim only.
2. **`LIFECYCLE_TICK_SECRET`** set on any internet-reachable host (route is fail-closed without it).
3. Dominic decision on **retention/purge proposal** (implementation still later) if beta data must have an approved calendar on day one.
4. Optional but recommended: decide **Next 16** vs accept nested postcss residual for the beta window; close Low security residuals if the deploy is internet-reachable beyond a tiny trusted set.
5. Explicit **Gate 7 PO authorisation** to invite testers (out of M11 execution — stop here).

**What would flip to GO:** blockers 1–2 done + Dominic Gate 7 yes; retention proposal acknowledged (even if purge deferred); residual advisories accepted or scheduled.
