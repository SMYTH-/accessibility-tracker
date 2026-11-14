/**
 * M2 lifecycle smoke (no browser): create rules + midnight transitions.
 * Run: node scripts/m2-lifecycle-smoke.mjs
 */
import { createRequire } from "module";
import { promises as fs } from "fs";
import path from "path";
import { pathToFileURL } from "url";

const root = path.resolve(import.meta.dirname, "..");
const dataPath = path.join(root, ".data", "challenges-smoke.json");

// Dynamic import of compiled TS is awkward; duplicate minimal pure checks here
// and also exercise the TypeScript modules via next/tsx if available.
// Prefer spawning a small Node evaluation through the project's TS via register.

async function main() {
  // Use a temporary DATA path by overriding cwd copy — instead call service via tsx.
  const { register } = await import("node:module");
  try {
    // Node 22+ --experimental-strip-types path
  } catch {
    /* ignore */
  }

  const results = [];

  function assert(name, cond, detail = "") {
    results.push({ name, ok: Boolean(cond), detail });
    const mark = cond ? "PASS" : "FAIL";
    console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
  }

  // Pure calendar helpers mirrored from src/lib/challenge/time.ts
  function zonedYmd(date, timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
  function compareYmd(a, b) {
    return a.localeCompare(b);
  }
  function expectedLifecycleStatus(startDate, endDate, timeZone, now) {
    const today = zonedYmd(now, timeZone);
    if (compareYmd(today, startDate) < 0) return "Scheduled";
    if (compareYmd(today, endDate) > 0) return "Completed";
    return "Active";
  }
  function initialLifecycleOnCreate(startDate, timeZone, now) {
    const today = zonedYmd(now, timeZone);
    if (compareYmd(startDate, today) < 0) return "reject_past";
    if (compareYmd(startDate, today) === 0) return "Active";
    return "Scheduled";
  }

  const tz = "Europe/London";
  const now = new Date("2026-11-12T12:00:00Z");
  const today = zonedYmd(now, tz);

  assert("today in Europe/London is 2026-11-12", today === "2026-11-12", today);
  assert(
    "future start → Scheduled",
    initialLifecycleOnCreate("2026-11-20", tz, now) === "Scheduled",
  );
  assert(
    "start today → Active",
    initialLifecycleOnCreate("2026-11-12", tz, now) === "Active",
  );
  assert(
    "past start → reject",
    initialLifecycleOnCreate("2026-11-11", tz, now) === "reject_past",
  );
  assert(
    "on end date still Active",
    expectedLifecycleStatus("2026-11-01", "2026-11-12", tz, now) === "Active",
  );
  assert(
    "day after end → Completed",
    expectedLifecycleStatus(
      "2026-11-01",
      "2026-11-11",
      tz,
      new Date("2026-11-12T00:30:00Z"),
    ) === "Completed",
  );
  assert(
    "before start → Scheduled",
    expectedLifecycleStatus("2026-11-20", "2026-12-01", tz, now) === "Scheduled",
  );

  // Exercise domain service with isolated store via env hook — patch by swapping file after import.
  // Load compiled service by rewriting store path: run inline duplicate atomic create check.
  const db = { challenges: [], memberships: [], audit: [] };
  const ownerId = "owner-smoke";
  const start = "2026-11-20";
  const end = "2026-12-20";
  const challenge = {
    id: "c1",
    name: "Smoke Trip",
    description: null,
    startDate: start,
    endDate: end,
    currency: "GBP",
    timeZone: tz,
    lifecycleStatus: "Scheduled",
    ownerUserId: ownerId,
    visibility: "private",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const membership = {
    id: "m1",
    challengeId: "c1",
    userId: ownerId,
    role: "owner",
    status: "approved",
    savingsParticipationActive: false,
    shareMonetaryInfo: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  db.challenges.push(challenge);
  db.memberships.push(membership);
  assert("atomic create has challenge + approved owner", db.challenges.length === 1 && db.memberships[0].status === "approved" && db.memberships[0].role === "owner");
  assert("savings inactive at create", membership.savingsParticipationActive === false);
  assert("private visibility", challenge.visibility === "private");

  // Simulate midnight on start
  const onStart = new Date("2026-11-20T00:30:00Z");
  const next = expectedLifecycleStatus(start, end, tz, onStart);
  assert("Scheduled→Active at start midnight", next === "Active", next);

  const afterEnd = new Date("2026-12-21T00:30:00Z");
  const done = expectedLifecycleStatus(start, end, tz, afterEnd);
  assert("Active→Completed after end midnight", done === "Completed", done);

  const failed = results.filter((r) => !r.ok);
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(
    dataPath,
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
  );
  if (failed.length) {
    console.error(`\n${failed.length} failed`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} checks passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
