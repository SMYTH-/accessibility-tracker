/**
 * Offline M5 contribution smoke against mock file store.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "m5-smoke-"));
  process.env.AUTH_MODE = "mock";
  process.env.NEXT_PUBLIC_AUTH_MODE = "mock";
  process.env.CHALLENGE_DATA_PATH = join(dir, "challenges.json");
  writeFileSync(
    process.env.CHALLENGE_DATA_PATH,
    JSON.stringify(
      {
        challenges: [],
        memberships: [],
        audit: [],
        invitations: [],
        notifications: [],
        savingsSetups: [],
        savingsAudit: [],
        contributions: [],
        contributionRevisions: [],
      },
      null,
      2,
    ),
  );

  const { createChallenge, canRecordSavings } = await import(
    "../src/lib/challenge/service"
  );
  const { activateSavingsSetup, resetMockSavingsState } = await import(
    "../src/lib/savings/service"
  );
  const {
    recordContribution,
    amendContribution,
    reverseContribution,
    getOwnEligibleTotals,
    listOwnContributions,
    resetMockContributionState,
  } = await import("../src/lib/contributions/service");
  const { zonedYmd } = await import("../src/lib/challenge/time");
  const { weekStartMonday } = await import("../src/lib/contributions/time");

  await resetMockSavingsState();
  await resetMockContributionState();

  let failed = 0;
  function assert(name: string, cond: boolean, detail = "") {
    if (!cond) {
      failed += 1;
      console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    } else {
      console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
    }
  }

  const ownerId = "owner-user";
  const strangerId = "stranger-user";
  const now = new Date("2026-11-13T12:00:00.000Z");
  const todayLondon = zonedYmd(now, "Europe/London");

  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 90);
  const endDate = end.toISOString().slice(0, 10);

  const created = await createChallenge(
    ownerId,
    {
      name: "M5 Smoke Challenge",
      description: "Contributions",
      startDate: todayLondon,
      endDate,
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert("create Active challenge", created.ok);
  if (!created.ok) {
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
  const challengeId = created.challenge.id;
  assert("lifecycle Active", created.challenge.lifecycleStatus === "Active");
  assert(
    "cannot record before setup",
    canRecordSavings(created.challenge, created.membership).allowed === false,
  );

  const beforeSetup = await recordContribution(
    ownerId,
    challengeId,
    "50",
    "key-early",
    now,
  );
  assert("reject before setup", !beforeSetup.ok);

  const act = await activateSavingsSetup(
    ownerId,
    challengeId,
    "2000",
    "50",
    now,
  );
  assert("activate savings", act.ok);
  if (!act.ok) {
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
  assert(
    "can record after setup",
    canRecordSavings(created.challenge, act.membership).allowed === true,
  );

  const rec = await recordContribution(ownerId, challengeId, "50.00", "idem-1", now);
  assert("record ok", rec.ok);
  if (!rec.ok) {
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
  assert("amount 5000 minor", rec.contribution.amountMinor === 5000);
  assert("self-reported", rec.contribution.sourceLabel === "self-reported");
  assert("date = today London", rec.contribution.contributionDate === todayLondon);
  assert(
    "week monday",
    rec.contribution.weekStart === weekStartMonday(todayLondon),
  );
  assert("eligible 5000", rec.totals.eligibleTotalMinor === 5000);
  assert("not replayed", rec.replayed === false);

  const dup = await recordContribution(ownerId, challengeId, "50.00", "idem-1", now);
  assert("idempotent ok", dup.ok);
  if (dup.ok) {
    assert("replayed true", dup.replayed === true);
    assert("same id", dup.contribution.id === rec.contribution.id);
    assert("still eligible 5000", dup.totals.eligibleTotalMinor === 5000);
  }

  const second = await recordContribution(
    ownerId,
    challengeId,
    "40",
    "idem-2",
    now,
  );
  assert("second record", second.ok);
  if (second.ok) {
    assert("eligible 9000", second.totals.eligibleTotalMinor === 9000);
  }

  const amend = await amendContribution(ownerId, rec.contribution.id, "55", now);
  assert("amend ok", amend.ok);
  if (amend.ok) {
    assert("amended amount", amend.contribution.amountMinor === 5500);
    assert(
      "date preserved",
      amend.contribution.contributionDate === rec.contribution.contributionDate,
    );
    assert("week preserved", amend.contribution.weekStart === rec.contribution.weekStart);
    assert("eligible after amend", amend.totals.eligibleTotalMinor === 9500);
  }

  const strangerAmend = await amendContribution(
    strangerId,
    rec.contribution.id,
    "1",
    now,
  );
  assert("cross-user amend denied", !strangerAmend.ok);

  const rev = await reverseContribution(ownerId, second.ok ? second.contribution.id : "", now);
  assert("reverse ok", rev.ok);
  if (rev.ok) {
    assert("status reversed", rev.contribution.status === "reversed");
    assert("eligible after reverse", rev.totals.eligibleTotalMinor === 5500);
    assert(
      "date preserved on reverse",
      rev.contribution.contributionDate ===
        (second.ok ? second.contribution.contributionDate : ""),
    );
  }

  const list = await listOwnContributions(ownerId, challengeId);
  assert("list has 2", (list?.contributions.length ?? 0) === 2);
  assert(
    "audit has create+amend+reverse",
    (list?.revisions.length ?? 0) >= 3,
  );

  const totals = await getOwnEligibleTotals(ownerId, challengeId, now);
  assert("totals eligible 5500", totals?.eligibleTotalMinor === 5500);

  // Scheduled challenge rejects record
  const futureStart = new Date(now);
  futureStart.setUTCDate(futureStart.getUTCDate() + 21);
  const futureEnd = new Date(futureStart);
  futureEnd.setUTCDate(futureEnd.getUTCDate() + 60);
  const scheduled = await createChallenge(
    ownerId,
    {
      name: "M5 Scheduled",
      description: null,
      startDate: futureStart.toISOString().slice(0, 10),
      endDate: futureEnd.toISOString().slice(0, 10),
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert("scheduled create", scheduled.ok);
  if (scheduled.ok) {
    await activateSavingsSetup(ownerId, scheduled.challenge.id, "100", "10", now);
    const bad = await recordContribution(
      ownerId,
      scheduled.challenge.id,
      "10",
      "sched-1",
      now,
    );
    assert("reject inactive challenge", !bad.ok);
  }

  // Zero / invalid amount
  const zero = await recordContribution(ownerId, challengeId, "0", "z", now);
  assert("reject zero", !zero.ok);

  rmSync(dir, { recursive: true, force: true });
  console.log(failed ? `FAILED ${failed}` : "ALL PASS");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
