/**
 * Exercises real M2 challenge service modules via tsx.
 * Uses an isolated store file under .data/.
 *
 *   npx --yes tsx scripts/m2-service-smoke.ts
 */
import { promises as fs } from "fs";
import path from "path";

async function main() {
  process.env.CHALLENGE_DATA_PATH = path.resolve(
    process.cwd(),
    ".data",
    "challenges-service-smoke.json",
  );

  await fs.mkdir(path.dirname(process.env.CHALLENGE_DATA_PATH), { recursive: true });
  await fs.writeFile(
    process.env.CHALLENGE_DATA_PATH,
    JSON.stringify({ challenges: [], memberships: [], audit: [] }, null, 2),
  );

  const {
    createChallenge,
    reconcileAllChallenges,
    canRecordSavings,
    isAssessedForWeeklyCommitments,
    attemptLifecycleTransition,
    getChallengeForUser,
  } = await import("../src/lib/challenge/service");

  const results: { name: string; ok: boolean; detail: string }[] = [];
  function assert(name: string, cond: boolean, detail = "") {
    results.push({ name, ok: Boolean(cond), detail: String(detail) });
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  }

  const now = new Date("2026-11-12T12:00:00Z");
  const owner = "user-m2-smoke";

  const past = await createChallenge(
    owner,
    {
      name: "Past Start",
      startDate: "2026-11-01",
      endDate: "2026-12-01",
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert("reject past start", !past.ok, past.ok ? "created" : past.error);

  const badEnd = await createChallenge(
    owner,
    {
      name: "Bad End",
      startDate: "2026-11-20",
      endDate: "2026-11-10",
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert("reject end before start", !badEnd.ok, badEnd.ok ? "created" : badEnd.error);

  const activeCreate = await createChallenge(
    owner,
    {
      name: "Starts Today",
      description: "Owner deferral",
      startDate: "2026-11-12",
      endDate: "2026-12-12",
      currency: "EUR",
      timeZone: "Europe/London",
    },
    now,
  );
  assert(
    "create today → Active",
    Boolean(activeCreate.ok && activeCreate.challenge.lifecycleStatus === "Active"),
  );
  assert(
    "atomic approved owner membership",
    Boolean(
      activeCreate.ok &&
        activeCreate.membership.role === "owner" &&
        activeCreate.membership.status === "approved",
    ),
  );
  assert(
    "savings inactive at create",
    Boolean(activeCreate.ok && activeCreate.membership.savingsParticipationActive === false),
  );
  assert(
    "private challenge",
    Boolean(activeCreate.ok && activeCreate.challenge.visibility === "private"),
  );
  assert(
    "not assessed while savings inactive",
    Boolean(activeCreate.ok && isAssessedForWeeklyCommitments(activeCreate.membership) === false),
  );
  assert(
    "cannot record savings yet",
    Boolean(
      activeCreate.ok &&
        canRecordSavings(activeCreate.challenge, activeCreate.membership).allowed === false,
    ),
  );

  const scheduled = await createChallenge(
    owner,
    {
      name: "Future Trip",
      startDate: "2026-11-20",
      endDate: "2026-12-20",
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert(
    "future start → Scheduled",
    Boolean(scheduled.ok && scheduled.challenge.lifecycleStatus === "Scheduled"),
    scheduled.ok ? scheduled.challenge.lifecycleStatus : scheduled.error,
  );

  if (scheduled.ok) {
    const tick = await reconcileAllChallenges(new Date("2026-11-20T00:30:00Z"));
    const after = await getChallengeForUser(
      scheduled.challenge.id,
      owner,
      new Date("2026-11-20T00:30:00Z"),
    );
    assert("reconcile transitioned ≥1", tick.transitioned >= 1, String(tick.transitioned));
    assert(
      "Scheduled → Active at start midnight",
      after?.challenge.lifecycleStatus === "Active",
      after?.challenge.lifecycleStatus,
    );

    await reconcileAllChallenges(new Date("2026-12-21T00:30:00Z"));
    const done = await getChallengeForUser(
      scheduled.challenge.id,
      owner,
      new Date("2026-12-21T00:30:00Z"),
    );
    assert(
      "Active → Completed after end",
      done?.challenge.lifecycleStatus === "Completed",
      done?.challenge.lifecycleStatus,
    );

    const bad = await attemptLifecycleTransition(
      scheduled.challenge.id,
      "Active",
      owner,
      new Date("2026-12-22T12:00:00Z"),
    );
    assert("reject Completed → Active", !bad.ok, bad.ok ? "allowed" : bad.error);
  }

  const failed = results.filter((r) => !r.ok);
  const out = path.resolve(process.cwd(), ".data", "m2-service-smoke-results.json");
  await fs.writeFile(out, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
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
