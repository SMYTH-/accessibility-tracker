/**
 * Offline M8 mock-store smoke: assessment + Your streak on dashboard.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "m8-smoke-"));
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
  const { recomputeMemberAssessments, weekStartMonday } = await import(
    "../src/lib/assessment/engine"
  );

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
  const now = new Date();
  const today = zonedYmd(now, "Europe/London");
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 120);

  const created = await createChallenge(
    alex,
    {
      name: "Portugal 2027 M8",
      description: "Assessment smoke",
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

  const inactiveDash = await getChallengeDashboard(sam, challengeId);
  assert(
    "inactive never assessed",
    inactiveDash?.personal.weeklyAssessmentStatus === "inactive" &&
      inactiveDash.personal.streakWeeks === 0,
    inactiveDash?.personal.weeklyAssessmentStatus,
  );

  const act = await activateSavingsSetup(alex, challengeId, "2000.00", "50.00", now);
  assert("activate alex", act.ok === true);

  const beforeRec = await getChallengeDashboard(alex, challengeId);
  assert(
    "Your streak label",
    beforeRec?.personal.streakLabel === "Your streak",
  );

  const openStatus = beforeRec?.personal.weeklyAssessmentStatus;
  assert(
    "open week not missed before save",
    openStatus === "in_progress" || openStatus === "pre_assessment",
    String(openStatus),
  );

  if (openStatus === "in_progress") {
    const rec = await recordContribution(
      alex,
      challengeId,
      "50.00",
      `m8-${Date.now()}`,
      now,
    );
    assert("record meets commitment", rec.ok === true);
    const after = await getChallengeDashboard(alex, challengeId);
    assert(
      "open week completed when met",
      after?.personal.weeklyAssessmentStatus === "completed",
      after?.personal.weeklyAssessmentStatus,
    );
    assert(
      "streak at least 1 when completed",
      (after?.personal.streakWeeks ?? 0) >= 1,
      String(after?.personal.streakWeeks),
    );
  }

  // Pure engine: approved amend example
  const currentWeek = weekStartMonday(today);
  const w3 = currentWeek;
  // Build synthetic three prior Mondays ending at closed week before current if needed
  // Use fixed Nov 2026 grid when today is after that fixture window.
  const historyFix = recomputeMemberAssessments({
    savingsParticipationActive: true,
    firstAssessedWeekStart: "2026-10-19",
    weeklyCommitmentMinor: 5000,
    challengeStartDate: "2026-10-01",
    challengeEndDate: "2027-03-01",
    currentLocalYmd: "2026-11-12",
    eligibleByWeekStart: new Map([
      ["2026-10-19", 5000],
      ["2026-10-26", 5000],
      ["2026-11-02", 4000],
    ]),
  });
  assert(
    "fixture miss after two completed → streak 0",
    historyFix.streakWeeks === 0 &&
      historyFix.history.find((h) => h.weekStart === "2026-11-02")?.status ===
        "missed",
  );

  const fixed = recomputeMemberAssessments({
    savingsParticipationActive: true,
    firstAssessedWeekStart: "2026-10-19",
    weeklyCommitmentMinor: 5000,
    challengeStartDate: "2026-10-01",
    challengeEndDate: "2027-03-01",
    currentLocalYmd: "2026-11-12",
    eligibleByWeekStart: new Map([
      ["2026-10-19", 5000],
      ["2026-10-26", 5000],
      ["2026-11-02", 5000],
    ]),
  });
  assert(
    "correct missed → streak 3",
    fixed.streakWeeks === 3,
    String(fixed.streakWeeks),
  );

  const again = recomputeMemberAssessments({
    savingsParticipationActive: true,
    firstAssessedWeekStart: "2026-10-19",
    weeklyCommitmentMinor: 5000,
    challengeStartDate: "2026-10-01",
    challengeEndDate: "2027-03-01",
    currentLocalYmd: "2026-11-12",
    eligibleByWeekStart: new Map([
      ["2026-10-19", 5000],
      ["2026-10-26", 5000],
      ["2026-11-02", 5000],
    ]),
  });
  assert(
    "rerun consistent",
    again.streakWeeks === fixed.streakWeeks &&
      JSON.stringify(again.history) === JSON.stringify(fixed.history),
  );

  const samAct = await activateSavingsSetup(sam, challengeId, "1500.00", "50.00", now);
  assert("activate sam", samAct.ok === true);
  const samDash = await getChallengeDashboard(sam, challengeId);
  const alexOnSamRoster = samDash?.roster.find((r) => r.userId === alex);
  assert("sam sees alex on roster", Boolean(alexOnSamRoster));
  assert(
    "roster has no assessmentHistory / streakWeeks",
    alexOnSamRoster != null &&
      !("assessmentHistory" in alexOnSamRoster) &&
      !("streakWeeks" in alexOnSamRoster),
  );
  assert(
    "sam own commitment 5000",
    samDash?.personal.weeklyCommitmentMinor === 5000,
  );
  void w3;

  rmSync(dir, { recursive: true, force: true });
  if (failed) {
    console.error(`\n${failed} failure(s)`);
    process.exit(1);
  }
  console.log("\nAll m8 service smoke checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
