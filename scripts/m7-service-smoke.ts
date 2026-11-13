/**
 * Offline M7 privacy settings smoke against mock file store.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "m7-smoke-"));
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

  const { createChallenge } = await import("../src/lib/challenge/service");
  const { activateSavingsSetup, resetMockSavingsState } = await import(
    "../src/lib/savings/service"
  );
  const { recordContribution, resetMockContributionState } = await import(
    "../src/lib/contributions/service"
  );
  const { getChallengeDashboard } = await import("../src/lib/dashboard/service");
  const { withChallengeDb } = await import("../src/lib/challenge/store");
  const { zonedYmd } = await import("../src/lib/challenge/time");
  const {
    listOwnPrivacySettings,
    optOutShareMonetaryInfo,
  } = await import("../src/lib/privacy/service");

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

  const alex = "alex-user";
  const sam = "sam-user";
  const now = new Date("2026-11-13T12:00:00.000Z");
  const today = zonedYmd(now, "Europe/London");
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 120);

  const created = await createChallenge(
    alex,
    {
      name: "Portugal 2027 M7",
      description: "Privacy smoke",
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert("create challenge", created.ok === true);
  if (!created.ok) {
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
  const challengeId = created.challenge.id;

  await withChallengeDb((db) => {
    const base = db.memberships.find((m) => m.challengeId === challengeId)!;
    db.memberships.push({
      ...base,
      id: `mem-${sam}`,
      userId: sam,
      role: "member",
      status: "approved",
      shareMonetaryInfo: true,
      savingsParticipationActive: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  for (const [uid, target, weekly] of [
    [alex, "2000", "50"],
    [sam, "3500", "50"],
  ] as const) {
    const act = await activateSavingsSetup(uid, challengeId, target, weekly, now);
    assert(`activate ${uid}`, act.ok, act.ok ? "" : act.error);
  }

  const seedAlex = await recordContribution(alex, challengeId, "1240.00", "alex-m7", now);
  const seedSam = await recordContribution(sam, challengeId, "1840.00", "sam-m7", now);
  assert("seed alex", seedAlex.ok, seedAlex.ok ? "" : seedAlex.error);
  assert("seed sam", seedSam.ok, seedSam.ok ? "" : seedSam.error);

  const listBefore = await listOwnPrivacySettings(alex);
  assert(
    "default sharing listed",
    listBefore.items.length === 1 && listBefore.items[0].shareMonetaryInfo === true,
  );
  assert("defaultVisible true", listBefore.defaultVisible === true);
  assert("reopt deferred open", listBefore.reoptInStatus === "open_deferred");

  const samBefore = await getChallengeDashboard(sam, challengeId);
  assert(
    "before: sam sees alex money",
    Boolean(
      samBefore?.roster.find(
        (r) =>
          r.userId === alex &&
          r.eligibleTotalMinor === 124000 &&
          r.targetMinor === 200000 &&
          r.progressPercent != null,
      ),
    ),
  );
  assert(
    "before: sharing 3080/5500",
    samBefore?.sharing.savedMinor === 308000 &&
      samBefore.sharing.targetMinor === 550000,
    `${samBefore?.sharing.savedMinor}/${samBefore?.sharing.targetMinor}`,
  );

  const opt = await optOutShareMonetaryInfo(alex, challengeId);
  assert("opt-out ok", opt.ok === true && opt.ok && opt.shareMonetaryInfo === false);
  assert("opt-out changed", opt.ok === true && opt.ok && opt.changed === true);

  const samAfter = await getChallengeDashboard(sam, challengeId);
  const alexRow = samAfter?.roster.find((r) => r.userId === alex);
  assert("after: Private chip", alexRow?.privacyChip === "Private");
  assert(
    "after: amounts/target/% omitted",
    alexRow != null &&
      !Object.prototype.hasOwnProperty.call(alexRow, "eligibleTotalMinor") &&
      !Object.prototype.hasOwnProperty.call(alexRow, "targetMinor") &&
      !Object.prototype.hasOwnProperty.call(alexRow, "progressPercent"),
  );
  assert(
    "after: sharing 1840/3500",
    samAfter?.sharing.savedMinor === 184000 &&
      samAfter.sharing.targetMinor === 350000,
    `${samAfter?.sharing.savedMinor}/${samAfter?.sharing.targetMinor}`,
  );

  const alexAfter = await getChallengeDashboard(alex, challengeId);
  assert(
    "self retains figures",
    alexAfter?.personal.eligibleTotalMinor === 124000 &&
      alexAfter.personal.targetMinor === 200000 &&
      alexAfter.personal.shareMonetaryInfo === false,
  );
  assert(
    "self excluded from sharing total figures still labelled Sharing members only",
    alexAfter?.sharing.label === "Sharing members only" &&
      alexAfter.sharing.savedMinor === 184000,
  );

  const again = await optOutShareMonetaryInfo(alex, challengeId);
  assert("idempotent", again.ok === true && again.ok && again.changed === false);

  const listAfter = await listOwnPrivacySettings(alex);
  assert(
    "list shows private",
    listAfter.items[0]?.shareMonetaryInfo === false,
  );

  rmSync(dir, { recursive: true, force: true });
  console.log(`\n${failed === 0 ? "OK" : "FAILED"} — ${failed} failure(s)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
