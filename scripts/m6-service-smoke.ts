/**
 * Offline M6 dashboard smoke against mock file store.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "m6-smoke-"));
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
  const {
    recordContribution,
    amendContribution,
    reverseContribution,
    resetMockContributionState,
  } = await import("../src/lib/contributions/service");
  const {
    getChallengeDashboard,
    getSharingMemberTotals,
    mockSetShareMonetaryInfo,
  } = await import("../src/lib/dashboard/service");
  const { withChallengeDb } = await import("../src/lib/challenge/store");
  const { zonedYmd } = await import("../src/lib/challenge/time");

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
  const riley = "riley-user";
  const jordan = "jordan-user";
  const now = new Date("2026-11-13T12:00:00.000Z");
  const today = zonedYmd(now, "Europe/London");
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 120);

  const created = await createChallenge(
    alex,
    {
      name: "Portugal 2027 M6",
      description: "Dashboard smoke",
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

  // Fixture other approved members into mock store
  await withChallengeDb((db) => {
    const base = db.memberships.find((m) => m.challengeId === challengeId)!;
    for (const [uid, share] of [
      [sam, true],
      [riley, true],
      [jordan, false],
    ] as const) {
      db.memberships.push({
        ...base,
        id: `mem-${uid}`,
        userId: uid,
        role: "member",
        status: "approved",
        shareMonetaryInfo: share,
        savingsParticipationActive: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  });

  for (const [uid, target, weekly] of [
    [alex, "2000", "50"],
    [sam, "2000", "50"],
    [riley, "1500", "40"],
    [jordan, "1000", "30"],
  ] as const) {
    const act = await activateSavingsSetup(uid, challengeId, target, weekly, now);
    assert(`activate ${uid}`, act.ok, act.ok ? "" : act.error);
  }

  // Seed Path C amounts via contributions
  async function seed(uid: string, major: string, key: string) {
    const r = await recordContribution(uid, challengeId, major, key, now);
    assert(`seed ${uid} ${major}`, r.ok, r.ok ? "" : r.error);
    return r;
  }

  await seed(alex, "1240.00", "alex-main");
  await seed(sam, "1300.00", "sam-main");
  await seed(riley, "540.00", "riley-main");
  await seed(jordan, "999.00", "jordan-private");

  const dashAlex = await getChallengeDashboard(alex, challengeId);
  assert("alex dashboard", Boolean(dashAlex));
  assert(
    "personal 124000",
    dashAlex?.personal.eligibleTotalMinor === 124000,
    String(dashAlex?.personal.eligibleTotalMinor),
  );
  assert(
    "current 62%",
    dashAlex?.personal.currentProgressPercent === 62,
    String(dashAlex?.personal.currentProgressPercent),
  );
  assert(
    "Halfway distinct",
    dashAlex?.personal.milestoneRecognitionLabel ===
      "50% Halfway milestone · reached" &&
      dashAlex.personal.currentProgressPercent !== 50,
  );
  assert(
    "Your streak label",
    dashAlex?.personal.streakLabel === "Your streak",
  );
  assert(
    "sharing 308000/550000 with Alex",
    dashAlex?.sharing.savedMinor === 308000 &&
      dashAlex.sharing.targetMinor === 550000,
    `${dashAlex?.sharing.savedMinor}/${dashAlex?.sharing.targetMinor}`,
  );
  assert(
    "label Sharing members only",
    dashAlex?.sharing.label === "Sharing members only",
  );
  assert(
    "Jordan excluded while private",
    dashAlex?.sharing.sharerCount === 3,
    String(dashAlex?.sharing.sharerCount),
  );

  const samBefore = await getSharingMemberTotals(sam, challengeId);
  assert(
    "sam sees 3080/5500",
    samBefore?.savedMinor === 308000 && samBefore.targetMinor === 550000,
  );

  // Opt-out Alex (fixture — M7 owns settings UX)
  assert(
    "fixture opt-out",
    await mockSetShareMonetaryInfo(challengeId, alex, false),
  );

  const samAfter = await getSharingMemberTotals(sam, challengeId);
  assert(
    "Path C 1840/3500",
    samAfter?.savedMinor === 184000 && samAfter.targetMinor === 350000,
    `${samAfter?.savedMinor}/${samAfter?.targetMinor}`,
  );

  const alexSelf = await getChallengeDashboard(alex, challengeId);
  assert(
    "opted-out self still sees own",
    alexSelf?.personal.eligibleTotalMinor === 124000 &&
      alexSelf.personal.targetMinor === 200000,
  );
  assert(
    "opted-out self excluded from sharing total",
    alexSelf?.sharing.savedMinor === 184000,
  );

  // Post-opt-out mutations must not move Sam's aggregate
  const beforeMut = samAfter!.savedMinor;
  await recordContribution(alex, challengeId, "100.00", "alex-private-extra", now);
  const afterCreate = await getSharingMemberTotals(sam, challengeId);
  assert(
    "post-opt-out create invariant",
    afterCreate?.savedMinor === beforeMut,
    String(afterCreate?.savedMinor),
  );

  const listDash = await getChallengeDashboard(alex, challengeId);
  const alexContribId = listDash
    ? (
        await (
          await import("../src/lib/contributions/service")
        ).listOwnContributions(alex, challengeId)
      )?.contributions.find((c) => c.idempotencyKey === "alex-main")?.id
    : undefined;
  assert("alex contrib id", Boolean(alexContribId));
  if (alexContribId) {
    await amendContribution(alex, alexContribId, "900.00", now);
    const afterAmend = await getSharingMemberTotals(sam, challengeId);
    assert(
      "post-opt-out amend invariant",
      afterAmend?.savedMinor === beforeMut,
    );
    await reverseContribution(alex, alexContribId, now);
    const afterRev = await getSharingMemberTotals(sam, challengeId);
    assert(
      "post-opt-out reverse invariant",
      afterRev?.savedMinor === beforeMut,
    );
  }

  const stranger = await getChallengeDashboard("stranger", challengeId);
  assert("unrelated denied", stranger === null);

  const roster = alexSelf?.roster ?? [];
  const jordanRow = roster.find((m) => m.userId === jordan);
  assert("jordan private chip", jordanRow?.privacyChip === "Private");
  assert(
    "jordan omits amount key",
    jordanRow != null && !("eligibleTotalMinor" in jordanRow),
  );

  rmSync(dir, { recursive: true, force: true });
  if (failed) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log("\nAll m6 mock smoke checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
