/**
 * M7 two-account Postgres evidence against non-prod
 * Supabase gdrkejobqlvtwnlaedpu. Real sessions; signed-in opt-out RPC.
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
const password = `M7-Test-${stamp}!`;
const emails = {
  alex: `m7.alex.${stamp}@example.com`,
  sam: `m7.sam.${stamp}@example.com`,
  stranger: `m7.stranger.${stamp}@example.com`,
};

const ids = {
  alex: await ensureUser(emails.alex, password, "Alex"),
  sam: await ensureUser(emails.sam, password, "Sam"),
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
const today = ymdInTz(now, "Europe/London");
const end = new Date(now);
end.setUTCDate(end.getUTCDate() + 90);

// 1) Create challenge as Alex
const created = await sessions.alex.rpc("create_private_challenge", {
  p_name: `M7 Two-account ${stamp}`,
  p_description: "Privacy settings E2E",
  p_start_date: today,
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
assert("create challenge", !created.error, created.error?.message);
const challengeId = created.data?.challenge?.id;
assert("challenge id", Boolean(challengeId), challengeId);

// 2) Invite + approve Sam (fixture for speed; same approved membership as invite path)
const fixture = await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.sam,
  p_share_monetary_info: true,
  p_role: "member",
});
assert("approve sam fixture", !fixture.error, fixture.error?.message);

// 3) Savings setup both
for (const [who, target, weekly] of [
  ["alex", 200000, 5000],
  ["sam", 350000, 5000],
]) {
  const act = await sessions[who].rpc("activate_savings_setup", {
    p_challenge_id: challengeId,
    p_target_minor: target,
    p_weekly_commitment_minor: weekly,
  });
  assert(`activate ${who}`, !act.error, act.error?.message);
}

// 4) Record + correct a contribution (Alex)
const rec = await sessions.alex.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 100000,
  p_idempotency_key: `m7-alex-${stamp}`,
});
assert("alex record 1000", !rec.error, rec.error?.message);
const contribId = rec.data?.contribution?.id;
const amend = await sessions.alex.rpc("amend_contribution", {
  p_contribution_id: contribId,
  p_amount_minor: 124000,
});
assert("alex amend → 1240", !amend.error, amend.error?.message);

const samRec = await sessions.sam.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 184000,
  p_idempotency_key: `m7-sam-${stamp}`,
});
assert("sam record 1840", !samRec.error, samRec.error?.message);

// Default visibility via list_own_privacy_settings
const listAlex = await sessions.alex.rpc("list_own_privacy_settings");
assert("list privacy ok", !listAlex.error, listAlex.error?.message);
const alexItem = (listAlex.data?.items ?? []).find((i) => i.challenge_id === challengeId);
assert("default share true", alexItem?.share_monetary_info === true);
assert("default_visible flag", listAlex.data?.default_visible === true);
assert(
  "reopt open deferred",
  listAlex.data?.reopt_in_status === "open_deferred",
);
assert(
  "small group open",
  listAlex.data?.small_group_suppression_status === "open",
);

// --- Before opt-out: each account ---
const dashAlexBefore = await sessions.alex.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
const dashSamBefore = await sessions.sam.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert("alex dash before", !dashAlexBefore.error);
assert("sam dash before", !dashSamBefore.error);

const sharingBefore = dashSamBefore.data?.sharing;
assert(
  "before sam sharing 3080/5500",
  Number(sharingBefore?.saved_minor) === 308000 &&
    Number(sharingBefore?.target_minor) === 550000,
  `${sharingBefore?.saved_minor}/${sharingBefore?.target_minor}`,
);

const alexOnSamBefore = (dashSamBefore.data?.roster ?? []).find(
  (r) => r.user_id === ids.alex,
);
assert(
  "before sam sees alex amounts+target+%",
  Number(alexOnSamBefore?.eligible_total_minor) === 124000 &&
    Number(alexOnSamBefore?.target_minor) === 200000 &&
    alexOnSamBefore?.progress_percent != null &&
    alexOnSamBefore?.privacy_chip == null,
  JSON.stringify(alexOnSamBefore),
);

const previewBefore = dashSamBefore.data?.activity_preview ?? [];
const alexPreviewBefore = previewBefore.filter((e) => e.user_id === ids.alex);
assert(
  "before sam feed shows alex amount",
  alexPreviewBefore.some((e) => hasKey(e, "amount_minor") && Number(e.amount_minor) === 124000),
);

// Stranger denied before
const strangerBefore = await sessions.stranger.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "stranger denied before",
  Boolean(strangerBefore.error) || strangerBefore.data == null,
  strangerBefore.error?.message,
);

// --- Opt out via signed-in RPC (not fixture) ---
const opt = await sessions.alex.rpc("set_own_share_monetary_info", {
  p_challenge_id: challengeId,
  p_share: false,
});
assert("signed-in opt-out", !opt.error, opt.error?.message);
assert("opt-out share false", opt.data?.share_monetary_info === false);
assert("opt-out changed", opt.data?.changed === true);

// Idempotent
const optAgain = await sessions.alex.rpc("set_own_share_monetary_info", {
  p_challenge_id: challengeId,
  p_share: false,
});
assert("idempotent opt-out", !optAgain.error && optAgain.data?.changed === false);

// Re-opt-in deferred (OPEN — not invented)
const reopt = await sessions.alex.rpc("set_own_share_monetary_info", {
  p_challenge_id: challengeId,
  p_share: true,
});
assert(
  "re-opt-in deferred",
  Boolean(reopt.error?.message?.includes("REOPT_IN_DEFERRED")),
  reopt.error?.message,
);

// Cannot opt out for another user (Sam calling with Alex's challenge only affects Sam)
const samOwn = await sessions.sam.rpc("set_own_share_monetary_info", {
  p_challenge_id: challengeId,
  p_share: false,
});
assert("sam can opt self", !samOwn.error && samOwn.data?.share_monetary_info === false);
// Restore Sam sharing via fixture so remaining checks focus on Alex private
await admin.rpc("set_share_monetary_info_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.sam,
  p_share: true,
});

// --- After Alex opt-out ---
const dashAlexAfter = await sessions.alex.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
const dashSamAfter = await sessions.sam.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert("alex dash after", !dashAlexAfter.error);
assert("sam dash after", !dashSamAfter.error);

assert(
  "opted-out alex still sees own figures",
  Number(dashAlexAfter.data?.personal?.eligible_total_minor) === 124000 &&
    Number(dashAlexAfter.data?.personal?.target_minor) === 200000 &&
    dashAlexAfter.data?.personal?.share_monetary_info === false,
);

assert(
  "sam sharing drops to 1840/3500",
  Number(dashSamAfter.data?.sharing?.saved_minor) === 184000 &&
    Number(dashSamAfter.data?.sharing?.target_minor) === 350000,
  `${dashSamAfter.data?.sharing?.saved_minor}/${dashSamAfter.data?.sharing?.target_minor}`,
);
assert(
  "sharing label",
  dashSamAfter.data?.sharing?.label === "Sharing members only",
);

const alexOnSamAfter = (dashSamAfter.data?.roster ?? []).find(
  (r) => r.user_id === ids.alex,
);
assert("sam sees Private chip", alexOnSamAfter?.privacy_chip === "Private");
assert(
  "sam loses alex amount/target/%",
  !hasKey(alexOnSamAfter, "eligible_total_minor") &&
    !hasKey(alexOnSamAfter, "target_minor") &&
    !hasKey(alexOnSamAfter, "progress_percent"),
  JSON.stringify(alexOnSamAfter),
);

const previewAfter = dashSamAfter.data?.activity_preview ?? [];
assert(
  "sam feed omits alex monetary after opt-out",
  !previewAfter.some(
    (e) => e.user_id === ids.alex && hasKey(e, "amount_minor"),
  ),
);

// Snapshot Sam totals/feed for post-privacy invariance
const samSavedSnap = Number(dashSamAfter.data?.sharing?.saved_minor);
const samTargetSnap = Number(dashSamAfter.data?.sharing?.target_minor);
const samPreviewIds = (dashSamAfter.data?.activity_preview ?? []).map((e) => e.id).join(",");

// Later private records / corrections / reversals
const privCreate = await sessions.alex.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 10000,
  p_idempotency_key: `m7-alex-priv-${stamp}`,
});
assert("private create", !privCreate.error, privCreate.error?.message);
const privId = privCreate.data?.contribution?.id;

const privAmend = await sessions.alex.rpc("amend_contribution", {
  p_contribution_id: privId,
  p_amount_minor: 15000,
});
assert("private amend", !privAmend.error, privAmend.error?.message);

const privRev = await sessions.alex.rpc("reverse_contribution", {
  p_contribution_id: privId,
});
assert("private reverse", !privRev.error, privRev.error?.message);

const dashSamInvariant = await sessions.sam.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "post-private create/amend/reverse: sam totals unchanged",
  Number(dashSamInvariant.data?.sharing?.saved_minor) === samSavedSnap &&
    Number(dashSamInvariant.data?.sharing?.target_minor) === samTargetSnap,
  `${dashSamInvariant.data?.sharing?.saved_minor}/${dashSamInvariant.data?.sharing?.target_minor}`,
);
assert(
  "post-private mutations: sam feed ids unchanged",
  (dashSamInvariant.data?.activity_preview ?? []).map((e) => e.id).join(",") ===
    samPreviewIds,
);

// Refreshed views + direct API
const rosterDirect = await sessions.sam.rpc("challenge_roster_projection", {
  p_challenge_id: challengeId,
});
const rosterMembers = rosterDirect.data?.members ?? rosterDirect.data ?? [];
const alexRosterDirect = (Array.isArray(rosterMembers) ? rosterMembers : []).find(
  (r) => r.user_id === ids.alex,
);
assert(
  "direct roster API omits private money",
  alexRosterDirect?.privacy_chip === "Private" &&
    !hasKey(alexRosterDirect, "eligible_total_minor"),
);

const totalsDirect = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: challengeId,
});
assert(
  "direct totals API 1840/3500",
  Number(totalsDirect.data?.saved_minor) === 184000 &&
    Number(totalsDirect.data?.target_minor) === 350000,
);

const strangerAfter = await sessions.stranger.rpc("challenge_dashboard", {
  p_challenge_id: challengeId,
});
assert(
  "stranger still denied",
  Boolean(strangerAfter.error) || strangerAfter.data == null,
);

const strangerOpt = await sessions.stranger.rpc("set_own_share_monetary_info", {
  p_challenge_id: challengeId,
  p_share: false,
});
assert(
  "stranger cannot opt out on foreign challenge",
  Boolean(strangerOpt.error?.message?.includes("MEMBERSHIP_REQUIRED")),
  strangerOpt.error?.message,
);

// Fixture still service_role only
const fixtureAsUser = await sessions.alex.rpc("set_share_monetary_info_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: ids.alex,
  p_share: true,
});
assert(
  "test fixture not callable by authenticated",
  Boolean(fixtureAsUser.error),
  fixtureAsUser.error?.message,
);

const failed = results.filter((r) => !r.ok);
const outDir = join(process.cwd(), ".data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `m7-postgres-evidence-${stamp}.json`);
writeFileSync(
  outPath,
  JSON.stringify(
    {
      stamp,
      challengeId,
      emails,
      passed: results.length - failed.length,
      total: results.length,
      results,
    },
    null,
    2,
  ),
);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
console.log(`wrote ${outPath}`);
process.exit(failed.length ? 1 : 0);
