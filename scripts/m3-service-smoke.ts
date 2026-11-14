/**
 * Offline M3 membership smoke against mock file store.
 * AUTH_MODE=mock; isolated CHALLENGE_DATA_PATH.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "m3-smoke-"));
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

  const { createChallenge } = await import("../src/lib/challenge/service");
  const {
    createInvitation,
    revokeInvitation,
    getInvitationPreview,
    requestMembership,
    decideMembershipRequest,
    leaveChallenge,
    removeMember,
    getOwnMembership,
    listNotificationsForUser,
  } = await import("../src/lib/membership/service");

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
  const inviteeId = "invitee-user";
  const strangerId = "stranger-user";

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 14);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 60);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const created = await createChallenge(ownerId, {
    name: "M3 Smoke Challenge",
    description: "Invite journey smoke",
    startDate,
    endDate,
    currency: "GBP",
    timeZone: "Europe/London",
  });
  assert("create challenge", created.ok, created.ok ? created.challenge.id : created.error);
  if (!created.ok) {
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
  const challengeId = created.challenge.id;

  const invite = await createInvitation(challengeId, ownerId, 7);
  assert("create invite 7d", invite.ok, invite.ok ? invite.path : invite.error);
  if (!invite.ok) process.exit(1);

  const preview = await getInvitationPreview(invite.token);
  assert("preview fields", preview.ok && preview.preview.name === "M3 Smoke Challenge");
  assert(
    "preview has no currency key surface",
    preview.ok && !("currency" in preview.preview),
  );
  assert(
    "preview participant count includes owner",
    preview.ok && preview.preview.participantCount === 1,
  );

  const noAck = await requestMembership(invite.token, inviteeId, false);
  assert("no-ack fails", !noAck.ok && /acknowledge/i.test(noAck.error));

  const req1 = await requestMembership(invite.token, inviteeId, true);
  assert("request with ack → pending", req1.ok && req1.membership.status === "pending");
  assert("savings inactive on request", req1.ok && !req1.membership.savingsParticipationActive);

  const req2 = await requestMembership(invite.token, inviteeId, true);
  assert(
    "safe retry stays single pending",
    req2.ok && !req2.created && req2.membership.status === "pending",
  );

  const pendingMem = await getOwnMembership(challengeId, inviteeId);
  assert("invitee pending membership", pendingMem?.status === "pending");

  const decline = await decideMembershipRequest(
    req1.ok ? req1.membership.id : "",
    ownerId,
    "decline",
    "invitee@example.com",
  );
  assert("decline", decline.ok && decline.membership.status === "declined");
  const declinedNotes = await listNotificationsForUser(inviteeId);
  assert(
    "decline notification recorded",
    declinedNotes.some((n) => n.kind === "membership_rejected"),
  );

  const reReq = await requestMembership(invite.token, inviteeId, true);
  assert("re-request after decline", reReq.ok && reReq.membership.status === "pending");

  const approve = await decideMembershipRequest(
    reReq.ok ? reReq.membership.id : "",
    ownerId,
    "approve",
    "invitee@example.com",
  );
  assert(
    "approve grants membership; savings still inactive",
    approve.ok &&
      approve.membership.status === "approved" &&
      !approve.membership.savingsParticipationActive,
  );
  const approvedNotes = await listNotificationsForUser(inviteeId);
  assert(
    "approve notification recorded",
    approvedNotes.some((n) => n.kind === "membership_approved"),
  );

  const ownerLeave = await leaveChallenge(challengeId, ownerId);
  assert("owner leave blocked while Scheduled", !ownerLeave.ok && /transfer/i.test(ownerLeave.error));

  const inviteeLeave = await leaveChallenge(challengeId, inviteeId);
  assert("member leave", inviteeLeave.ok && inviteeLeave.membership.status === "left");

  const again = await requestMembership(invite.token, inviteeId, true);
  assert("rejoin after leave → pending", again.ok && again.membership.status === "pending");
  const approve2 = await decideMembershipRequest(
    again.ok ? again.membership.id : "",
    ownerId,
    "approve",
    "invitee@example.com",
  );
  assert("re-approve", approve2.ok);

  const removed = await removeMember(approve2.ok ? approve2.membership.id : "", ownerId);
  assert("owner remove", removed.ok && removed.membership.status === "removed");

  const revokedInvite = await createInvitation(challengeId, ownerId, 7);
  assert("second invite", revokedInvite.ok);
  if (revokedInvite.ok) {
    const rev = await revokeInvitation(revokedInvite.invitation.id, ownerId);
    assert("revoke", rev.ok && Boolean(rev.invitation.revokedAt));
    const bad = await getInvitationPreview(revokedInvite.token);
    assert("revoked preview rejected", !bad.ok);
    const badReq = await requestMembership(revokedInvite.token, strangerId, true);
    assert("revoked cannot request", !badReq.ok);
  }

  const invalid = await getInvitationPreview("not-a-real-token");
  assert("invalid token rejected", !invalid.ok);

  rmSync(dir, { recursive: true, force: true });
  console.log(`\nM3 mock smoke: ${failed === 0 ? "ALL PASS" : `${failed} FAIL`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
