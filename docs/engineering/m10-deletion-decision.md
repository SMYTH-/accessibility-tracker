# M10 — Account deletion decision (one package)

| Field | Value |
| --- | --- |
| Status | **Approved** (Dominic, 13 November 2026) |
| Approved option | **Option A — Grace cancel + anonymise history** (exact rules below) |
| Unblocks | Destructive deletion implementation under these rules; ACC-01 deletion AC |
| Still open (flagged) | Exact multi-year **calendar retention periods** for anonymised residual history (Gate 1.1 / PRS §19) — not invented |
| Frozen refs | PRS ACC-01 · §7.5–7.6 · §8.2 · G1.1-13 · Gate 1.1 |
| Date | 13 November 2026 |

## Approved rules (exact)

### Ownership / Active–Scheduled

1. Require an **authorised and audited transfer** to an **eligible approved member** before finalising the owner’s deletion when an eligible replacement exists.
2. If **no eligible replacement**: notify remaining members and start a **7-day grace** period.
3. If still no eligible replacement at expiry: **cancel** the challenge before removing the owner’s access.
4. **Recheck** ownership and lifecycle at finalisation.
5. A **valid transfer during the grace period must prevent cancellation**.

### At finalisation

- Revoke access and sessions, remove identity data, retain only the minimum history needed by remaining authorised members.
- Preserve existing privacy restrictions.
- Keep identifying details and previously private financial figures out of retained member-facing history.
- Document what is deleted, anonymised or retained; flag any retention period still requiring approval.

## Documented data handling at finalisation

| Data class | Handling |
| --- | --- |
| Sessions / refresh | Revoked |
| Auth identity (email, password, metadata) | Removed / tombstoned (non-loginable); display becomes **Deleted user** |
| Memberships | Ended (`left` via deletion); access revoked |
| Owned Active/Scheduled with eligible replacement | Transfer completed before finalise |
| Owned Active/Scheduled with no replacement after grace | Challenge **Cancelled**, then owner access removed |
| Shared monetary history others were authorised to see | Retained as minimum challenge history; actor shown as Deleted user |
| Previously private monetary figures | Remain absent from other members’ views (G1.1-06 preserved) |
| Audit rows | Retained for integrity; personal identifiers stripped / anonymised where stored |
| Multi-year purge schedule | **Still OPEN** — not invented |

## Verification required

- Transfer path and no-replacement path
- Transfer during grace prevents cancel
- Safe retries
- Access denial after finalisation
- Disposable accounts only on Supabase `gdrkejobqlvtwnlaedpu`
