/**
 * Offline M9 activity + completion smoke against mock file store.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "m9-smoke-"));
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
        progressMilestoneAnnouncements: [],
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
    amendContribution,
    recordContribution,
    resetMockContributionState,
  } = await import("../src/lib/contributions/service");
  const { getActivityFeed, getCompletionSummary } = await import(
    "../src/lib/activity/service"
  );
  const { getChallengeDashboard, mockSetShareMonetaryInfo } = await import(
    "../src/lib/dashboard/service"
  );
  const { withChallengeDb } = await import("../src/lib/challenge/store");
  const { zonedYmd } = await import("../src/lib/challenge/time");
  const { leaveChallenge } = await import("../src/lib/membership/service");

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
  const jordan = "jordan-user";
  const stranger = "stranger-user";
  const now = new Date("2026-11-13T12:00:00.000Z");
  const today = zonedYmd(now, "Europe/London");
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 120);

  const created = await createChallenge(
    alex,
    {
      name: "Portugal 2027 M9",
      description: "Activity smoke",
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert("create ok", created.ok);
  if (!created.ok) throw new Error("create failed");
  const challengeId = created.challenge.id;

  await withChallengeDb((db) => {
    for (const [uid, role] of [
      [sam, "member"],
      [jordan, "member"],
    ] as const) {
      db.memberships.push({
        id: `${uid}-mem`,
        challengeId,
        userId: uid,
        role,
        status: "approved",
        savingsParticipationActive: false,
        shareMonetaryInfo: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        decidedAt: now.toISOString(),
      });
    }
  });

  const actA = await activateSavingsSetup(alex, challengeId, "2000.00", "50.00", now);
  const actS = await activateSavingsSetup(sam, challengeId, "1500.00", "40.00", now);
  const actJ = await activateSavingsSetup(jordan, challengeId, "1000.00", "30.00", now);
  assert("activate alex", actA.ok);
  assert("activate sam", actS.ok);
  assert("activate jordan", actJ.ok);
  await mockSetShareMonetaryInfo(challengeId, jordan, false);

  // Stretch start so weekly assessments have closed weeks.
  await withChallengeDb((db) => {
    const c = db.challenges.find((row) => row.id === challengeId)!;
    c.startDate = "2026-10-01";
  });

  const r1 = await recordContribution(alex, challengeId, "500.00", "m9-a1", now);
  assert("alex contribution", r1.ok);

  const r2 = await recordContribution(sam, challengeId, "400.00", "m9-s1", now);
  assert("sam contribution", r2.ok);

  const r3 = await recordContribution(jordan, challengeId, "250.00", "m9-j1", now);
  assert("jordan private contribution", r3.ok);

  const alexFeed = await getActivityFeed(alex, challengeId, 50, null);
  assert("alex feed loads", Boolean(alexFeed));
  const alexKinds = new Set((alexFeed?.events ?? []).map((e) => e.kind));
  assert("alex sees joins", alexKinds.has("member_joined"));
  assert("alex sees contributions", alexKinds.has("contribution"));
  assert(
    "alex does not see jordan contribution",
    !(alexFeed?.events ?? []).some(
      (e) => e.kind === "contribution" && e.userId === jordan,
    ),
  );
  assert(
    "alex sees own contribution amount",
    (alexFeed?.events ?? []).some(
      (e) => e.kind === "contribution" && e.userId === alex && e.amountMinor === 50_000,
    ),
    String(
      (alexFeed?.events ?? []).find(
        (e) => e.kind === "contribution" && e.userId === alex,
      )?.amountMinor,
    ),
  );
  assert(
    "alex sees milestone when crossed",
    (alexFeed?.events ?? []).some((e) => e.kind === "milestone_reached"),
  );

  // Retention: cross 50% → amend below → re-cross → same announcement identity.
  const mileBefore = (alexFeed?.events ?? []).find(
    (e) =>
      e.kind === "milestone_reached" &&
      e.userId === alex &&
      e.milestonePercent === 25,
  );
  // Alex £500 / £2000 = 25%. Amend down then up to re-cross 25%.
  const alexContribId = r1.ok ? r1.contribution.id : "";
  const drop = await amendContribution(alex, alexContribId, "400.00", now);
  assert("alex amend below 25%", drop.ok);
  const alexFeedDropped = await getActivityFeed(alex, challengeId, 50, null);
  const mileAfterDrop = (alexFeedDropped?.events ?? []).find(
    (e) =>
      e.kind === "milestone_reached" &&
      e.userId === alex &&
      e.milestonePercent === 25,
  );
  assert(
    "milestone retained after drop below threshold",
    Boolean(mileBefore && mileAfterDrop && mileBefore.id === mileAfterDrop.id),
    `${mileBefore?.id} → ${mileAfterDrop?.id}`,
  );
  assert(
    "milestone timestamp unchanged after drop",
    Boolean(mileBefore && mileAfterDrop && mileBefore.at === mileAfterDrop.at),
  );
  const dashDropped = await getChallengeDashboard(alex, challengeId);
  assert(
    "current progress uses corrected eligible after drop",
    dashDropped?.personal.eligibleTotalMinor === 40_000,
    String(dashDropped?.personal.eligibleTotalMinor),
  );
  const recross = await amendContribution(alex, alexContribId, "500.00", now);
  assert("alex amend re-cross 25%", recross.ok);
  const alexFeedRecross = await getActivityFeed(alex, challengeId, 50, null);
  const miles25 = (alexFeedRecross?.events ?? []).filter(
    (e) =>
      e.kind === "milestone_reached" &&
      e.userId === alex &&
      e.milestonePercent === 25,
  );
  assert("no duplicate milestone on re-cross", miles25.length === 1, String(miles25.length));
  assert(
    "re-cross keeps original id + timestamp",
    Boolean(
      mileBefore &&
        miles25[0] &&
        miles25[0].id === mileBefore.id &&
        miles25[0].at === mileBefore.at,
    ),
  );

  // Privacy: opt-out hides announcement from peer; saver retains own history.
  await mockSetShareMonetaryInfo(challengeId, alex, false);
  const samSeesAlexMile = await getActivityFeed(sam, challengeId, 50, null);
  assert(
    "peer cannot see milestone after saver opt-out",
    !(samSeesAlexMile?.events ?? []).some(
      (e) => e.kind === "milestone_reached" && e.userId === alex,
    ),
  );
  const alexOwnAfterOptOut = await getActivityFeed(alex, challengeId, 50, null);
  assert(
    "saver still sees own milestone after opt-out",
    (alexOwnAfterOptOut?.events ?? []).some(
      (e) =>
        e.kind === "milestone_reached" &&
        e.userId === alex &&
        e.id === mileBefore?.id,
    ),
  );
  await mockSetShareMonetaryInfo(challengeId, alex, true);

  const samFeed = await getActivityFeed(sam, challengeId, 50, null);
  assert(
    "sam feed unchanged by jordan private contrib",
    !(samFeed?.events ?? []).some(
      (e) => e.kind === "contribution" && e.userId === jordan,
    ),
  );
  const samDash = await getChallengeDashboard(sam, challengeId);
  const sharingBefore = samDash?.sharing.savedMinor ?? -1;
  // Another jordan private contribution should not change Sam totals or feed count of money events.
  await recordContribution(jordan, challengeId, "100.00", "m9-j2", now);
  const samDashAfter = await getChallengeDashboard(sam, challengeId);
  assert(
    "sam sharing total unchanged after private jordan contrib",
    samDashAfter?.sharing.savedMinor === sharingBefore,
    `${sharingBefore} → ${samDashAfter?.sharing.savedMinor}`,
  );
  const samFeedAfter = await getActivityFeed(sam, challengeId, 50, null);
  assert(
    "sam still cannot see jordan private contribs",
    !(samFeedAfter?.events ?? []).some(
      (e) => e.kind === "contribution" && e.userId === jordan,
    ),
  );

  const strangerFeed = await getActivityFeed(stranger, challengeId, 50, null);
  assert("stranger denied feed", strangerFeed == null);

  // Path B order in dashboard payload: streak fields present; roster before we care about UI.
  assert(
    "dashboard has Your streak label",
    samDashAfter?.personal.streakLabel === "Your streak",
  );

  // Complete challenge + summary + read-only writes
  await withChallengeDb((db) => {
    const c = db.challenges.find((row) => row.id === challengeId)!;
    c.lifecycleStatus = "Completed";
    c.endDate = "2026-11-01";
    db.audit.push({
      id: "done-1",
      challengeId,
      actorUserId: alex,
      action: "lifecycle_transition",
      fromStatus: "Active",
      toStatus: "Completed",
      reason: "End date reached",
      at: now.toISOString(),
    });
  });

  const summary = await getCompletionSummary(alex, challengeId);
  assert("completion summary for alex", Boolean(summary));
  assert("summary read-only", summary?.readOnly === true);
  assert(
    "summary includes challenge_completed activity",
    (summary?.activity ?? []).some((e) => e.kind === "challenge_completed"),
  );

  const samSummary = await getCompletionSummary(sam, challengeId);
  assert(
    "sam summary hides jordan money on roster",
    (samSummary?.roster ?? []).some(
      (m) => m.userId === jordan && m.privacyChip === "Private" && m.eligibleTotalMinor == null,
    ),
  );

  const blocked = await recordContribution(
    alex,
    challengeId,
    "10.00",
    "m9-after-complete",
    now,
  );
  assert("write rejected after completion", !blocked.ok);

  const leave = await leaveChallenge(challengeId, alex);
  // Completed owner leave is allowed by G1.1-13 (block only Scheduled/Active).
  assert("completed owner can leave without transfer", leave.ok);

  // Recreate active owner-leave block check on a fresh challenge
  const created2 = await createChallenge(
    alex,
    {
      name: "Owner leave guard",
      description: null,
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert("second create", created2.ok);
  if (created2.ok) {
    const blockedLeave = await leaveChallenge(created2.challenge.id, alex);
    assert("active owner leave blocked", !blockedLeave.ok);
  }

  rmSync(dir, { recursive: true, force: true });
  if (failed > 0) {
    console.error(`\nM9 smoke failed: ${failed}`);
    process.exit(1);
  }
  console.log("\nM9 smoke passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
