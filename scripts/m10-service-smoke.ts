/**
 * Offline M10 account export + deletion Option A smoke (mock store).
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "m10-smoke-"));
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

  const { createUser } = await import("../src/lib/auth/mock/store");
  const { createChallenge } = await import("../src/lib/challenge/service");
  const { withChallengeDb } = await import("../src/lib/challenge/store");
  const { zonedYmd } = await import("../src/lib/challenge/time");
  const {
    exportOwnPersonalData,
    finalizeAccountDeletion,
    requestAccountDeletion,
    transferChallengeOwnership,
  } = await import("../src/lib/account/service");
  const {
    accountAccessDeniedMock,
    mockExpireDeletionGrace,
    mockForceNextRevocationFailure,
    resetMockDeletionState,
  } = await import("../src/lib/account/mock");
  const { resetMemoryRateLimits } = await import("../src/lib/security/rate-limit");
  const {
    parsePositiveMajorToMinor,
    formatMinorAsMajor,
  } = await import("../src/lib/savings/money");
  const {
    computePersonalStreak,
    assessWeekStatus,
    weekStartMonday,
  } = await import("../src/lib/assessment/engine");
  const { progressPercent } = await import("../src/lib/dashboard/progress");

  resetMockDeletionState();
  resetMemoryRateLimits();

  let failed = 0;
  function assert(name: string, cond: boolean, detail = "") {
    if (!cond) {
      failed += 1;
      console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    } else {
      console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
    }
  }

  // --- Regression: money / streaks / progress ---
  const money = parsePositiveMajorToMinor("12.34", "Amount");
  assert("money parse", money.ok && money.ok && money.minor === 1234);
  assert(
    "money format",
    formatMinorAsMajor(1234, "GBP").includes("12.34"),
  );
  assert("progress 50%", progressPercent(1000, 2000) === 50);
  const streak = computePersonalStreak([
    { weekStart: "2026-10-26", status: "completed" },
    { weekStart: "2026-11-02", status: "completed" },
    { weekStart: "2026-11-09", status: "in_progress" },
  ]);
  assert("streak skips in_progress", streak === 2);
  const week = weekStartMonday("2026-11-13");
  assert("week start monday", week === "2026-11-09");
  assert(
    "assess completed",
    assessWeekStatus({
      eligibleSumMinor: 5000,
      commitmentMinor: 5000,
      weekStart: "2026-11-02",
      currentWeekStart: "2026-11-09",
    }) === "completed",
  );

  const stamp = Date.now();
  const alex = await createUser({
    email: `m10.alex.${stamp}@example.com`,
    password: "password123",
    displayName: "Alex",
  });
  const sam = await createUser({
    email: `m10.sam.${stamp}@example.com`,
    password: "password123",
    displayName: "Sam",
  });
  const jordan = await createUser({
    email: `m10.jordan.${stamp}@example.com`,
    password: "password123",
    displayName: "Jordan",
  });

  const now = new Date("2026-11-13T12:00:00.000Z");
  const today = zonedYmd(now, "Europe/London");
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 90);

  const created = await createChallenge(
    alex.id,
    {
      name: "M10 Export Challenge",
      description: "two-account export",
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert("create challenge", created.ok);
  if (!created.ok) throw new Error("create failed");
  const challengeId = created.challenge.id;

  await withChallengeDb((db) => {
    db.memberships.push({
      id: "sam-mem",
      challengeId,
      userId: sam.id,
      role: "member",
      status: "approved",
      savingsParticipationActive: true,
      shareMonetaryInfo: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    db.memberships.push({
      id: "jordan-mem",
      challengeId,
      userId: jordan.id,
      role: "member",
      status: "approved",
      savingsParticipationActive: true,
      shareMonetaryInfo: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    db.savingsSetups.push({
      membershipId: "sam-mem",
      challengeId,
      userId: sam.id,
      targetMinor: 200000,
      weeklyCommitmentMinor: 5000,
      activatedAt: now.toISOString(),
      firstAssessedWeekStart: week,
      targetEffectiveFrom: week,
      updatedAt: now.toISOString(),
    });
    db.contributions.push({
      id: "sam-c1",
      challengeId,
      membershipId: "sam-mem",
      userId: sam.id,
      amountMinor: 5000,
      currency: "GBP",
      contributionDate: today,
      weekStart: week,
      status: "active",
      sourceLabel: "self-reported",
      idempotencyKey: "sam-1",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      reversedAt: null,
    });
    db.contributions.push({
      id: "jordan-c1",
      challengeId,
      membershipId: "jordan-mem",
      userId: jordan.id,
      amountMinor: 99999,
      currency: "GBP",
      contributionDate: today,
      weekStart: week,
      status: "active",
      sourceLabel: "self-reported",
      idempotencyKey: "jordan-1",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      reversedAt: null,
    });
  });

  const alexExport = await exportOwnPersonalData(alex.id);
  assert("alex export ok", alexExport.ok);
  if (!alexExport.ok) throw new Error("alex export failed");
  const alexJson = JSON.stringify(alexExport.raw);
  assert("alex export has own email", alexJson.includes(alex.email));
  assert("alex export excludes sam email", !alexJson.includes(sam.email));
  assert("alex export excludes jordan private amount", !alexJson.includes("99999"));
  assert(
    "alex export excludes sam contribution amount",
    !alexJson.includes('"amount_minor":5000') && !alexJson.includes("amount_minor\":5000"),
  );

  const samExport = await exportOwnPersonalData(sam.id);
  assert("sam export ok", samExport.ok);
  if (!samExport.ok) throw new Error("sam export failed");
  const samMapped = samExport.export;
  assert("sam export subject", samMapped.subjectUserId === sam.id);
  assert("sam sees own contribution", samMapped.contributions.length === 1);
  assert(
    "sam contribution amount",
    Number(samMapped.contributions[0]?.amount_minor) === 5000,
  );
  const samJson = JSON.stringify(samExport.raw);
  assert("sam export excludes jordan amount", !samJson.includes("99999"));
  assert("sam export excludes alex email", !samJson.includes(alex.email));

  // Transfer path: alex requests deletion → pending_transfer → transfer to sam → finalise
  resetMemoryRateLimits();
  const del1 = await requestAccountDeletion(alex.id);
  assert("deletion needs transfer", del1.ok && del1.status === "pending_transfer");

  const transfer = await transferChallengeOwnership(alex.id, challengeId, sam.id);
  assert("transfer ok", transfer.ok);

  const fin1 = await finalizeAccountDeletion(alex.id);
  assert("finalise after transfer", fin1.ok && fin1.status === "completed");
  assert("alex access denied after complete", accountAccessDeniedMock(alex.id));
  const alexExportDenied = await exportOwnPersonalData(alex.id);
  assert("alex export denied after deletion", !alexExportDenied.ok);

  // Retry idempotent
  const finRetry = await finalizeAccountDeletion(alex.id);
  assert("finalise retry idempotent", finRetry.ok && finRetry.idempotent === true);

  // Grace path: sam owns, no other eligible (remove jordan first), request deletion
  await withChallengeDb((db) => {
    const j = db.memberships.find((m) => m.userId === jordan.id);
    if (j) j.status = "left";
  });
  resetMockDeletionState();
  // Recreate sam as sole owner after alex deleted — sam already owner via transfer
  const delGrace = await requestAccountDeletion(sam.id);
  assert(
    "grace when no replacement",
    delGrace.ok && delGrace.status === "grace_pending",
    delGrace.ok ? delGrace.status : delGrace.error,
  );

  const tooEarly = await finalizeAccountDeletion(sam.id);
  assert(
    "grace blocks early finalise",
    !tooEarly.ok && tooEarly.code === "DELETION_GRACE_ACTIVE",
  );

  // Transfer during grace prevents cancel: re-approve jordan, transfer, finalise
  await withChallengeDb((db) => {
    const j = db.memberships.find((m) => m.userId === jordan.id);
    if (j) j.status = "approved";
  });
  // Actually for "transfer during grace" we need an eligible member - jordan is back
  // But grace was started with no eligible - now transfer to jordan
  const transferGrace = await transferChallengeOwnership(sam.id, challengeId, jordan.id);
  assert("transfer during grace", transferGrace.ok);

  const finGraceTransfer = await finalizeAccountDeletion(sam.id);
  assert(
    "finalise after grace transfer",
    finGraceTransfer.ok && finGraceTransfer.status === "completed",
    finGraceTransfer.ok ? finGraceTransfer.status : finGraceTransfer.error,
  );

  // No-replacement cancel path with a fresh owner
  resetMockDeletionState();
  const owner2 = await createUser({
    email: `m10.owner2.${stamp}@example.com`,
    password: "password123",
    displayName: "Owner2",
  });
  const created2 = await createChallenge(
    owner2.id,
    {
      name: "M10 Grace Cancel",
      description: "solo",
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
      currency: "GBP",
      timeZone: "Europe/London",
    },
    now,
  );
  assert("solo challenge", created2.ok);
  if (!created2.ok) throw new Error("solo create failed");
  const soloId = created2.challenge.id;

  const grace2 = await requestAccountDeletion(owner2.id);
  assert("solo grace", grace2.ok && grace2.status === "grace_pending");
  mockExpireDeletionGrace(owner2.id);
  const finCancel = await finalizeAccountDeletion(owner2.id);
  assert(
    "grace expiry cancels",
    finCancel.ok && finCancel.status === "completed",
    finCancel.ok ? String(finCancel.cancelledChallenges) : finCancel.error,
  );
  const dbAfter = await (await import("../src/lib/challenge/store")).readChallengeDb();
  const solo = dbAfter.challenges.find((c) => c.id === soloId);
  assert("solo cancelled", solo?.lifecycleStatus === "Cancelled");

  // Revocation failure → revoking (access denied) → retry completes
  resetMockDeletionState();
  const owner3 = await createUser({
    email: `m10.owner3.${stamp}@example.com`,
    password: "password123",
    displayName: "Owner3",
  });
  mockForceNextRevocationFailure(owner3.id);
  const revoking = await finalizeAccountDeletion(owner3.id);
  assert(
    "revocation failure stays revoking",
    revoking.ok && revoking.status === "revoking",
    revoking.ok ? revoking.status : revoking.error,
  );
  assert("access denied while revoking", accountAccessDeniedMock(owner3.id));
  const exportWhileRevoking = await exportOwnPersonalData(owner3.id);
  assert("export denied while revoking", !exportWhileRevoking.ok);
  const retryRevoke = await finalizeAccountDeletion(owner3.id);
  assert(
    "retry completes after revoke succeeds",
    retryRevoke.ok && retryRevoke.status === "completed",
    retryRevoke.ok ? retryRevoke.status : retryRevoke.error,
  );

  rmSync(dir, { recursive: true, force: true });
  console.log(`\n${failed === 0 ? "OK" : "FAILED"}  m10-service-smoke (${failed} failures)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
