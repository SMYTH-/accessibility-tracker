/**
 * Verify /api/challenges/lifecycle-tick rejects missing/invalid secrets
 * and accepts valid Bearer / x-lifecycle-tick-secret.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const secret = process.env.LIFECYCLE_TICK_SECRET?.trim();
const results = [];
function assert(name, cond, detail = "") {
  results.push({ name, ok: Boolean(cond), detail: String(detail ?? "") });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

assert("secret present locally", Boolean(secret) && secret.length >= 16, `len=${secret?.length ?? 0}`);

const missing = await fetch(`${SITE}/api/challenges/lifecycle-tick`);
assert("missing secret → 401", missing.status === 401, String(missing.status));
const missingBody = await missing.json().catch(() => ({}));
assert(
  "missing secret error code",
  missingBody.error === "UNAUTHORIZED_LIFECYCLE_TICK",
  JSON.stringify(missingBody),
);

const badBearer = await fetch(`${SITE}/api/challenges/lifecycle-tick`, {
  headers: { Authorization: "Bearer wrong-secret-value-xxxxxx" },
});
assert("invalid bearer → 401", badBearer.status === 401, String(badBearer.status));

const badHeader = await fetch(`${SITE}/api/challenges/lifecycle-tick`, {
  headers: { "x-lifecycle-tick-secret": "not-the-real-secret" },
});
assert("invalid header → 401", badHeader.status === 401, String(badHeader.status));

const emptyBearer = await fetch(`${SITE}/api/challenges/lifecycle-tick`, {
  headers: { Authorization: "Bearer " },
});
assert("empty bearer → 401", emptyBearer.status === 401, String(emptyBearer.status));

const ok = await fetch(`${SITE}/api/challenges/lifecycle-tick`, {
  headers: { Authorization: `Bearer ${secret}` },
});
assert("valid bearer → 200", ok.status === 200, String(ok.status));
const okJson = await ok.json().catch(() => ({}));
assert("valid bearer ok:true", okJson.ok === true, JSON.stringify(okJson).slice(0, 120));

const okH = await fetch(`${SITE}/api/challenges/lifecycle-tick`, {
  method: "POST",
  headers: { "x-lifecycle-tick-secret": secret },
});
assert("valid header POST → 200", okH.status === 200, String(okH.status));

mkdirSync(join(process.cwd(), "media", "m11"), { recursive: true });
const evidence = {
  stamp: Date.now(),
  site: SITE,
  results,
  summary: {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  },
};
writeFileSync(
  join(process.cwd(), "media", "m11", "lifecycle-tick-auth-evidence.json"),
  JSON.stringify(evidence, null, 2),
);
console.log(`\nTick auth: ${evidence.summary.passed}/${evidence.summary.total}`);
process.exit(evidence.summary.failed ? 1 : 0);
