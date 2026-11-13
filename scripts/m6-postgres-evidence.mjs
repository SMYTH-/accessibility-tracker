/**
 * M6 Postgres evidence + G1.1-06-R1 privacy suite against non-prod
 * Supabase gdrkejobqlvtwnlaedpu. Uses real sessions; privacy states via fixtures.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REF = "gdrkejobqlvtwnlaedpu";

if (!url?.includes(REF) || !anon || !service) {
  console.error("MISSING_ENV_OR_WRONG_PROJECT");
  process.exit(1);
}

const results = [];
function assert(name, cond, detail = "") {
  results.push({ name, ok: Boolean(cond), detail: String(detail ?? "") });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function userClient() {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureUser(email, password, displayName) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    return existing.id;
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

function ymdInTz(isoOrDate, tz) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function hasKey(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

const stamp = Date.now();
const password = `M6-Test-${stamp}!`;
const emails = {
  alex: `m6.alex.${stamp}@example.com`,
  sam: `m6.sam.${stamp}@example.com`,
  riley: `m6.riley.${stamp}@example.com`,
  jordan: `m6.jordan.${stamp}@example.com`,
  late: `m6.late.${stamp}@example.com`,
  pending: `m6.pending.${stamp}@example.com`,
  stranger: `m6.stranger.${stamp}@example.com`,
};

const ids = {
  alex: await ensureUser(emails.alex, password, "Alex"),
  sam: await ensureUser(emails.sam, password, "Sam"),
  riley: await ensureUser(emails.riley, password, "Riley"),
  jordan: await ensureUser(emails.jordan, password, "Jordan"),
  late: await ensureUser(emails.late, password, "Late Joiner"),
  pending: await ensureUser(emails.pending, password, "Pending Pat"),
  stranger: await ensureUser(emails.stranger, password, "Stranger"),
};
assert("users ready", Object.values(ids).every(Boolean));

const sessions = {};
for (const [key, email] of Object.entries(emails)) {
  sessions[key] = userClient();
  const signed = await sessions[key].auth.signInWithPassword({ email, password });
  assert(`${key} sign-in`, !signed.error, signed.error?.message);
}

const now = new Date();
const todayLondon = ymdInTz(now, "Europe/London");
const end = new Date(now);
end.setUTCDate(end.getUTCDate() + 120);
const endDate = end.toISOString().slice(0, 10);

const create = await sessions.alex.rpc("create_private_challenge", {
  p_name: `M6 Portugal ${stamp}`,
  p_description: "G1.1-06-R1 Path C fixture",
  p_start_date: todayLondon,
  p_end_date: endDate,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("create challenge", !create.error, create.error?.message);
const challengeId = create.data?.challenge?.id;
assert("challenge id", Boolean(challengeId));

// Fixture approved members (M7 owns settings journey)
for (const [key, share] of [
  ["sam", true],
  ["riley", true],
  ["jordan", false],
]) {
  const fix = await admin.rpc("fixture_approved_member_for_tests", {
    p_challenge_id: challengeId,
    p_user_id: ids[key],
    p_share_monetary_info: share,
    p_role: "member",
  });
  assert(`fixture ${key}`, !fix.error, fix.error?.message);
}

const pendingFix = await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.pending,
  p_share_monetary_info: true,
  p_role: "member",
});
assert("fixture pending base", !pendingFix.error, pendingFix.error?.message);
const pendingStatus = await admin.rpc("fixture_membership_status_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.pending,
  p_status: "pending",
});
assert("set pending", !pendingStatus.error, pendingStatus.error?.message);

async function activate(session, target, weekly) {
  return session.rpc("activate_savings_setup", {
    p_challenge_id: challengeId,
    p_target_minor: target,
    p_weekly_commitment_minor: weekly,
  });
}

assert("activate alex", !(await activate(sessions.alex, 200000, 5000)).error);
assert("activate sam", !(await activate(sessions.sam, 200000, 5000)).error);
assert("activate riley", !(await activate(sessions.riley, 150000, 4000)).error);
assert("activate jordan", !(await activate(sessions.jordan, 100000, 3000)).error);

async function record(session, amount, key) {
  return session.rpc("record_contribution", {
    p_challenge_id: challengeId,
    p_amount_minor: amount,
    p_idempotency_key: key,
  });
}

const alexRec = await record(sessions.alex, 124000, `alex-${stamp}`);
assert("alex record 1240", !alexRec.error, alexRec.error?.message);
const alexContribId = alexRec.data?.contribution?.id;
assert("sam record", !(await record(sessions.sam, 130000, `sam-${stamp}`)).error);
assert("riley record", !(await record(sessions.riley, 54000, `riley-${stamp}`)).error);
assert(
  "jordan record (private)",
  !(await record(sessions.jordan, 99900, `jordan-${stamp}`)).error,
);

const dashAlex = await sessions.alex.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert("alex dashboard", !dashAlex.error, dashAlex.error?.message);
assert(
  "personal eligible 124000",
  Number(dashAlex.data?.personal?.eligible_total_minor) === 124000,
);
assert(
  "current progress 62",
  Number(dashAlex.data?.personal?.current_progress_percent) === 62,
);
assert(
  "Halfway label distinct from 62",
  dashAlex.data?.personal?.milestone_recognition_label ===
    "50% Halfway milestone · reached" &&
    Number(dashAlex.data?.personal?.current_progress_percent) !== 50,
);
assert(
  "Your streak label",
  dashAlex.data?.personal?.streak_label === "Your streak",
);
assert(
  "sharing with Alex 308000/550000",
  Number(dashAlex.data?.sharing?.saved_minor) === 308000 &&
    Number(dashAlex.data?.sharing?.target_minor) === 550000,
  `${dashAlex.data?.sharing?.saved_minor}/${dashAlex.data?.sharing?.target_minor}`,
);
assert(
  "label Sharing members only",
  dashAlex.data?.sharing?.label === "Sharing members only",
);
assert(
  "scope excludes opted-out copy",
  String(dashAlex.data?.sharing?.scope_explanation || "").includes("opted out"),
);

const samT0 = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
assert(
  "sam T0 3080/5500",
  Number(samT0.data?.saved_minor) === 308000 &&
    Number(samT0.data?.target_minor) === 550000,
);

const rosterT0 = await sessions.sam.rpc("challenge_roster_projection", {
  p_challenge_id: challengeId,
});
assert("roster T0", !rosterT0.error, rosterT0.error?.message);
const alexRosterT0 = (rosterT0.data?.members || []).find((m) => m.user_id === ids.alex);
const jordanRosterT0 = (rosterT0.data?.members || []).find(
  (m) => m.user_id === ids.jordan,
);
assert(
  "alex monetary visible to sam while sharing",
  Number(alexRosterT0?.eligible_total_minor) === 124000 &&
    Number(alexRosterT0?.target_minor) === 200000,
);
assert("jordan Private chip", jordanRosterT0?.privacy_chip === "Private");
assert(
  "jordan omits eligible_total_minor",
  !hasKey(jordanRosterT0, "eligible_total_minor"),
);
assert("jordan omits target_minor", !hasKey(jordanRosterT0, "target_minor"));
assert(
  "jordan omits progress_percent",
  !hasKey(jordanRosterT0, "progress_percent"),
);

const feedT0 = await sessions.sam.rpc("challenge_activity_preview", {
  p_challenge_id: challengeId,
});
const jordanFeedT0 = (feedT0.data?.events || []).find((e) => e.user_id === ids.jordan);
assert(
  "jordan feed private no amount",
  jordanFeedT0?.kind === "private_contribution" && !hasKey(jordanFeedT0, "amount_minor"),
);

// --- Opt-out Alex (fixture) ---
const opt = await admin.rpc("set_share_monetary_info_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.alex,
  p_share: false,
});
assert("fixture opt-out alex", !opt.error, opt.error?.message);

const samT1 = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
assert(
  "Path C 1840/3500 after opt-out",
  Number(samT1.data?.saved_minor) === 184000 &&
    Number(samT1.data?.target_minor) === 350000,
  `${samT1.data?.saved_minor}/${samT1.data?.target_minor}`,
);

// Same-viewer-authorised restatement only: Sam already saw Alex 1240/2000;
// live totals drop by exactly those figures — no delta/history API shipped.
assert(
  "opt-out delta restates only prior authorised figures",
  Number(samT0.data?.saved_minor) - Number(samT1.data?.saved_minor) === 124000 &&
    Number(samT0.data?.target_minor) - Number(samT1.data?.target_minor) === 200000,
);

const rosterT1 = await sessions.sam.rpc("challenge_roster_projection", {
  p_challenge_id: challengeId,
});
const alexRosterT1 = (rosterT1.data?.members || []).find((m) => m.user_id === ids.alex);
assert("alex Private after opt-out", alexRosterT1?.privacy_chip === "Private");
assert(
  "alex monetary keys omitted after opt-out",
  !hasKey(alexRosterT1, "eligible_total_minor") &&
    !hasKey(alexRosterT1, "target_minor") &&
    !hasKey(alexRosterT1, "progress_percent"),
);

const alexSelf = await sessions.alex.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "alex self still sees own after opt-out",
  Number(alexSelf.data?.personal?.eligible_total_minor) === 124000 &&
    Number(alexSelf.data?.personal?.target_minor) === 200000,
);
assert(
  "alex self sharing excludes self",
  Number(alexSelf.data?.sharing?.saved_minor) === 184000,
);

const stableSaved = Number(samT1.data?.saved_minor);
const stableTarget = Number(samT1.data?.target_minor);

// Post-opt-out create
const privCreate = await record(sessions.alex, 10000, `alex-priv-create-${stamp}`);
assert("alex private create ok", !privCreate.error, privCreate.error?.message);
const afterCreate = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
assert(
  "post-opt-out create does not move aggregate",
  Number(afterCreate.data?.saved_minor) === stableSaved &&
    Number(afterCreate.data?.target_minor) === stableTarget,
);

const rosterAfterCreate = await sessions.sam.rpc("challenge_roster_projection", {
  p_challenge_id: challengeId,
});
const alexAfterCreate = (rosterAfterCreate.data?.members || []).find(
  (m) => m.user_id === ids.alex,
);
assert(
  "post-opt-out create roster still omits money",
  !hasKey(alexAfterCreate, "eligible_total_minor"),
);
const feedAfterCreate = await sessions.sam.rpc("challenge_activity_preview", {
  p_challenge_id: challengeId,
});
const alexFeedPriv = (feedAfterCreate.data?.events || []).find(
  (e) => e.user_id === ids.alex && e.kind === "private_contribution",
);
assert(
  "post-opt-out feed has no alex amount",
  alexFeedPriv && !hasKey(alexFeedPriv, "amount_minor"),
);

// Post-opt-out correct (amend original 1240 → 900)
const amend = await sessions.alex.rpc("amend_contribution", {
  p_contribution_id: alexContribId,
  p_amount_minor: 90000,
});
assert("alex private amend", !amend.error, amend.error?.message);
const afterAmend = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
assert(
  "post-opt-out amend does not move aggregate",
  Number(afterAmend.data?.saved_minor) === stableSaved,
);

// Post-opt-out reverse
const rev = await sessions.alex.rpc("reverse_contribution", {
  p_contribution_id: alexContribId,
});
assert("alex private reverse", !rev.error, rev.error?.message);
const afterRev = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
assert(
  "post-opt-out reverse does not move aggregate",
  Number(afterRev.data?.saved_minor) === stableSaved,
);
const rosterAfterRev = await sessions.sam.rpc("challenge_roster_projection", {
  p_challenge_id: challengeId,
});
assert(
  "post-opt-out reverse roster still private",
  !hasKey(
    (rosterAfterRev.data?.members || []).find((m) => m.user_id === ids.alex),
    "eligible_total_minor",
  ),
);

// Post-opt-out target change via service-role test helper (signed-in path parked)
const tgt = await admin.rpc("update_savings_target_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.alex,
  p_target_minor: 999000,
});
assert("fixture target change", !tgt.error, tgt.error?.message);
const afterTarget = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
assert(
  "post-opt-out target change does not move aggregate",
  Number(afterTarget.data?.saved_minor) === stableSaved &&
    Number(afterTarget.data?.target_minor) === stableTarget,
);
const rosterAfterTarget = await sessions.sam.rpc("challenge_roster_projection", {
  p_challenge_id: challengeId,
});
assert(
  "post-opt-out target change roster omits alex target",
  !hasKey(
    (rosterAfterTarget.data?.members || []).find((m) => m.user_id === ids.alex),
    "target_minor",
  ),
);

// Stale / re-read: subsequent reads omit monetary keys (no stale still-sharing snapshot)
const staleCheck = await sessions.sam.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
const alexStale = (staleCheck.data?.roster || []).find((m) => m.user_id === ids.alex);
assert(
  "stale re-read omits post-opt-out monetary fields",
  alexStale?.privacy_chip === "Private" && !hasKey(alexStale, "eligible_total_minor"),
);
assert(
  "stale re-read sharing excludes private addends",
  Number(staleCheck.data?.sharing?.saved_minor) === stableSaved,
);

// No historical sharing-total endpoint
const hist = await sessions.sam.rpc("sharing_member_totals_history", {
  p_challenge_id: challengeId,
});
assert(
  "no historical sharing-total endpoint",
  Boolean(hist.error),
  hist.error?.message || "unexpected success",
);

// Late joiner after Alex already Private — cannot recover Alex figures
const lateFix = await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.late,
  p_share_monetary_info: true,
  p_role: "member",
});
assert("late joiner fixture", !lateFix.error, lateFix.error?.message);
const lateAct = await activate(sessions.late, 50000, 1000);
assert("late activate", !lateAct.error, lateAct.error?.message);
const lateShare = await sessions.late.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
// Late sees Sam+Riley (+ late once activated with target). Alex still excluded.
assert(
  "late joiner sees live sharers only (no alex residual)",
  Number(lateShare.data?.saved_minor) === 184000 &&
    Number(lateShare.data?.target_minor) === 400000,
  `${lateShare.data?.saved_minor}/${lateShare.data?.target_minor}`,
);
const lateRoster = await sessions.late.rpc("challenge_roster_projection", {
  p_challenge_id: challengeId,
});
const alexForLate = (lateRoster.data?.members || []).find((m) => m.user_id === ids.alex);
assert(
  "late joiner cannot recover alex monetary via roster",
  alexForLate?.privacy_chip === "Private" && !hasKey(alexForLate, "eligible_total_minor"),
);

// Pending cannot read protected figures
const pendingDash = await sessions.pending.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert("pending denied dashboard", Boolean(pendingDash.error));
const pendingShare = await sessions.pending.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
assert("pending denied sharing totals", Boolean(pendingShare.error));

// Removed cannot read
const removedStatus = await admin.rpc("fixture_membership_status_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.riley,
  p_status: "removed",
});
assert("remove riley", !removedStatus.error, removedStatus.error?.message);
const removedDash = await sessions.riley.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert("removed denied dashboard", Boolean(removedDash.error));
const samAfterRemove = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
assert(
  "removed member excluded from totals",
  Number(samAfterRemove.data?.saved_minor) === 130000 &&
    Number(samAfterRemove.data?.target_minor) === 250000,
  `${samAfterRemove.data?.saved_minor}/${samAfterRemove.data?.target_minor}`,
);

// Unrelated / stranger
const strangerDash = await sessions.stranger.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert("stranger denied", Boolean(strangerDash.error));

// Restore riley for cleanliness (optional)
await admin.rpc("fixture_membership_status_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.riley,
  p_status: "approved",
});

// Verify amend/reverse still update personal progress for self
const personalAfter = await sessions.alex.rpc("own_eligible_totals", {
  p_challenge_id: challengeId,
});
// Original reversed; private create 100 remains
assert(
  "personal progress reflects reverse + later create",
  Number(personalAfter.data?.eligible_total_minor) === 10000,
  String(personalAfter.data?.eligible_total_minor),
);

const outDir = join(process.cwd(), ".data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `m6-postgres-evidence-${stamp}.json`);
writeFileSync(
  outPath,
  JSON.stringify(
    {
      stamp,
      challengeId,
      ref: REF,
      results,
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    },
    null,
    2,
  ),
);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed · ${outPath}`);
if (failed) process.exit(1);
