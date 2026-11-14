# LIFECYCLE_TICK_SECRET — host configuration

| Field | Value |
| --- | --- |
| Route | `GET` / `POST` `/api/challenges/lifecycle-tick` |
| Purpose | Midnight challenge lifecycle reconcile + Option A deletion-grace tick (service_role) |
| Preview | Local only (`http://localhost:3000`) — not a beta deploy guide |

## Why it exists

Unauthenticated callers previously could trigger privileged reconcile / grace finalisation. M11 requires a shared secret; missing or invalid credentials return **401** with `UNAUTHORIZED_LIFECYCLE_TICK`.

## Configure (intended host)

1. Generate a long random secret (e.g. `openssl rand -hex 24`).
2. Set **server-only** env (never `NEXT_PUBLIC_*`, never commit):

```bash
LIFECYCLE_TICK_SECRET=<value>
```

3. Restart the Node/Next process so the env is loaded.
4. Call the tick from cron / operator tooling only:

```bash
curl -sS -H "Authorization: Bearer $LIFECYCLE_TICK_SECRET" \
  "$SITE_URL/api/challenges/lifecycle-tick"

# or
curl -sS -X POST -H "x-lifecycle-tick-secret: $LIFECYCLE_TICK_SECRET" \
  "$SITE_URL/api/challenges/lifecycle-tick"
```

5. Expected success: HTTP **200** and JSON `{ "ok": true, ... }`.
6. Expected failure without/invalid secret: HTTP **401**.

## Local closed-lab

`.env.local` already holds a lab secret for Dom Mac preview. Evidence: `media/m11/lifecycle-tick-auth-evidence.json` (missing/invalid → 401; valid bearer/header → 200).

## Internet-reachable host (when Dominic authorises a deploy later)

- Set `LIFECYCLE_TICK_SECRET` in the host secret store before exposing the app.
- Restrict who can read the secret; rotate if leaked.
- Do **not** rely on obscurity of the URL alone.
