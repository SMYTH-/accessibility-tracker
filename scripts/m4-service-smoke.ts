/**
 * Offline M4 savings setup smoke against mock file store.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "m4-smoke-"));
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
      },
      null,
      2,
    ),
  );

  const { createChallenge, canRecordSavings, isAssessedForWeeklyCommitments } =
    await import("../src/lib/challenge/service");
  const {
    activateSavingsSetup,
    updateSavingsTarget,
    getOwnSavingsSetup,
    resetMockSavingsState,
  } = await import("../src/lib/savings/service");

  await resetMockSavingsState();

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

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 14);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 90);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const created = await createChallenge(ownerId, {
    name: "M4 Smoke Challenge",
    description: "Savings setup",
    startDate,
    endDate,
    currency: "GBP",
    timeZone: "Europe/London",
  });
  assert("create challenge", created.ok);
  if (!created.ok) {
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
  const challengeId = created.challenge.id;

  assert("inactive at create", !created.membership.savingsParticipationActive);
  assert(
    "not assessed while inactive",
    isAssessedForWeeklyCommitments(created.membership) === false,
  );
  assert(
    "cannot record while inactive",
    canRecordSavings(created.challenge, created.membership).allowed === false,
  );

  const zero = await activateSavingsSetup(ownerId, challengeId, "0", "50");
  assert("reject zero target", !zero.ok);

  const neg = await activateSavingsSetup(ownerId, challengeId, "100", "-1");
  assert("reject non-positive weekly", !neg.ok);

  const bad = await activateSavingsSetup(ownerId, challengeId, "abc", "50");
  assert("reject invalid amount", !bad.ok);

  const stranger = await activateSavingsSetup(strangerId, challengeId, "2000", "50");
  assert("reject non-member", !stranger.ok);

  const fri = new Date("2026-11-13T12:00:00.000Z");
  const act = await activateSavingsSetup(ownerId, challengeId, "2000.00", "50.00", fri);
  assert("activate ok", act.ok, act.ok ? "" : act.error);
  if (!act.ok) {
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
  assert("participation active", act.membership.savingsParticipationActive);
  assert(
    "first assessed Mon 16 Nov",
    act.setup.firstAssessedWeekStart === "2026-11-16",
    act.setup.firstAssessedWeekStart,
  );
  assert("target 200000 minor", act.setup.targetMinor === 200000);
  assert("weekly 5000 minor", act.setup.weeklyCommitmentMinor === 5000);
  assert("assessed after activate", isAssessedForWeeklyCommitments(act.membership));
  assert(
    "record gated on lifecycle even when savings active",
    canRecordSavings(created.challenge, act.membership).allowed === false,
  );

  const dup = await activateSavingsSetup(ownerId, challengeId, "1500", "40");
  assert("reject second activate", !dup.ok);

  const view = await getOwnSavingsSetup(ownerId, challengeId, fri);
  assert("own view has setup", Boolean(view?.setup && view.savingsParticipationActive));

  const upd = await updateSavingsTarget(ownerId, challengeId, "2500.00", fri);
  assert("target update ok", upd.ok, upd.ok ? "" : upd.error);
  if (upd.ok) {
    assert("prospective effective Mon 16", upd.setup.targetEffectiveFrom === "2026-11-16");
    assert("new target minor", upd.setup.targetMinor === 250000);
    assert("unchanged false", upd.unchanged === false);
  }

  const mon = new Date("2026-11-16T10:00:00.000Z");
  writeFileSync(
    process.env.CHALLENGE_DATA_PATH!,
    JSON.stringify(
      {
        challenges: [],
        memberships: [],
        audit: [],
        invitations: [],
        notifications: [],
        savingsSetups: [],
        savingsAudit: [],
      },
      null,
      2,
    ),
  );
  await resetMockSavingsState();
  const created2 = await createChallenge(ownerId, {
    name: "M4 Mon Activate",
    startDate,
    endDate,
    currency: "GBP",
    timeZone: "Europe/London",
  });
  assert("second challenge", created2.ok);
  if (created2.ok) {
    const monAct = await activateSavingsSetup(
      ownerId,
      created2.challenge.id,
      "1500",
      "50",
      mon,
    );
    assert("mon activate", monAct.ok, monAct.ok ? "" : monAct.error);
    if (monAct.ok) {
      assert(
        "Mon activation → current week",
        monAct.setup.firstAssessedWeekStart === "2026-11-16",
      );
    }
  }

  rmSync(dir, { recursive: true, force: true });
  if (failed) {
    console.log(`FAILED ${failed}`);
    process.exit(1);
  }
  console.log("ALL PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
