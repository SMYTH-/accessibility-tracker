/**
 * M9 Postgres evidence against non-prod Supabase gdrkejobqlvtwnlaedpu.
 * Activity feed privacy, access denial, completion summary, read-only writes,
 * owner leave guard preserved.
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

async function createActiveChallenge(session, name) {
  const todayLondon = ymdInTz(new Date(), "Europe/London");
  const created = await session.rpc("create_private_challenge", {
    p_name: name,
    p_description: "M9 activity evidence",
    p_start_date: todayLondon,
    p_end_date: "2027-06-01",
    p_currency: "GBP",
    p_time_zone: "Europe/London",
  });
  if (created.error) return { error: created.error, id: null };
  return { error: null, id: created.data?.challenge?.id };
}

const stamp = Date.now();
const password = `M9-Test-${stamp}!`;
const emails = {
  alex: `m9.alex.${stamp}@example.com`,
  sam: `m9.sam.${stamp}@example.com`,
  jordan: `m9.jordan.${stamp}@example.com`,
  pending: `m9.pending.${stamp}@example.com`,
  stranger: `m9.stranger.${stamp}@example.com`,
};
const ids = {
  alex: await ensureUser(emails.alex, password, "Alex"),
  sam: await ensureUser(emails.sam, password, "Sam"),
  jordan: await ensureUser(emails.jordan, password, "Jordan"),
  pending: await ensureUser(emails.pending, password, "Pending"),
  stranger: await ensureUser(emails.stranger, password, "Stranger"),
};
assert("users ready", Object.values(ids).every(Boolean));

const sessions = {};
for (const [key, email] of Object.entries(emails)) {
  sessions[key] = userClient();
  const signed = await sessions[key].auth.signInWithPassword({ email, password });
  assert(`${key} sign-in`, !signed.error, signed.error?.message);
}

const created = await createActiveChallenge(sessions.alex, `M9 Feed ${stamp}`);
assert("challenge create", !created.error && Boolean(created.id), created.error?.message);
const cid = created.id;

await admin.from("challenges").update({ start_date: "2026-10-01" }).eq("id", cid);

await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: cid,
  p_user_id: ids.sam,
  p_share_monetary_info: true,
  p_role: "member",
});
await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: cid,
  p_user_id: ids.jordan,
  p_share_monetary_info: false,
  p_role: "member",
});

// Pending membership (not approved)
await admin.from("challenge_memberships").upsert(
  {
    challenge_id: cid,
    user_id: ids.pending,
    role: "member",
    status: "pending",
    savings_participation_active: false,
    share_monetary_info: true,
  },
  { onConflict: "challenge_id,user_id" },
);

for (const [uid, target, weekly] of [
  [ids.alex, 200000, 5000],
  [ids.sam, 150000, 4000],
  [ids.jordan, 100000, 3000],
]) {
  const act = await admin.rpc("activate_savings_setup_at", {
    p_challenge_id: cid,
    p_user_id: uid,
    p_target_minor: target,
    p_weekly_commitment_minor: weekly,
    p_now: "2026-10-06T12:00:00.000Z", // Monday → first assessed that week
  });
  assert(`activate ${uid.slice(0, 8)}`, !act.error, act.error?.message);
}

const alexRec = await admin.rpc("record_contribution_at", {
  p_challenge_id: cid,
  p_user_id: ids.alex,
  p_amount_minor: 50000,
  p_idempotency_key: `m9-a-${stamp}`,
  p_now: "2026-11-13T12:00:00.000Z",
});
assert("alex record", !alexRec.error, alexRec.error?.message);

const samRec = await admin.rpc("record_contribution_at", {
  p_challenge_id: cid,
  p_user_id: ids.sam,
  p_amount_minor: 40000,
  p_idempotency_key: `m9-s-${stamp}`,
  p_now: "2026-11-13T12:00:00.000Z",
});
assert("sam record", !samRec.error, samRec.error?.message);

const jordanRec = await admin.rpc("record_contribution_at", {
  p_challenge_id: cid,
  p_user_id: ids.jordan,
  p_amount_minor: 25000,
  p_idempotency_key: `m9-j-${stamp}`,
  p_now: "2026-11-13T12:00:00.000Z",
});
assert("jordan private record", !jordanRec.error, jordanRec.error?.message);

// Recompute assessments so commitment_completed events exist for closed weeks
for (const uid of [ids.alex, ids.sam]) {
  await admin.rpc("recompute_member_weekly_assessments_at", {
    p_challenge_id: cid,
    p_user_id: uid,
    p_now: "2026-11-13T12:00:00.000Z",
  });
}

const alexFeed = await sessions.alex.rpc("challenge_activity_feed", {
  p_challenge_id: cid,
  p_limit: 50,
  p_before: null,
});
assert("alex feed ok", !alexFeed.error, alexFeed.error?.message);
const alexEvents = alexFeed.data?.events ?? [];
assert(
  "alex sees member_joined",
  alexEvents.some((e) => e.kind === "member_joined"),
);
assert(
  "alex sees contribution",
  alexEvents.some((e) => e.kind === "contribution" && e.user_id === ids.alex),
);
assert(
  "alex sees milestone",
  alexEvents.some((e) => e.kind === "milestone_reached" && e.user_id === ids.alex),
);
assert(
  "alex does not see jordan contribution",
  !alexEvents.some((e) => e.kind === "contribution" && e.user_id === ids.jordan),
);
assert(
  "alex does not see jordan milestone",
  !alexEvents.some((e) => e.kind === "milestone_reached" && e.user_id === ids.jordan),
);
assert(
  "hidden amounts absent for jordan",
  !alexEvents.some(
    (e) => e.user_id === ids.jordan && e.amount_minor != null,
  ),
);

const samBefore = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: cid,
});
const samSavedBefore = Number(samBefore.data?.saved_minor);
const jordan2 = await admin.rpc("record_contribution_at", {
  p_challenge_id: cid,
  p_user_id: ids.jordan,
  p_amount_minor: 10000,
  p_idempotency_key: `m9-j2-${stamp}`,
  p_now: "2026-11-13T15:00:00.000Z",
});
assert("jordan second private record", !jordan2.error, jordan2.error?.message);

const samAfter = await sessions.sam.rpc("sharing_member_totals", {
  p_challenge_id: cid,
});
assert(
  "sam sharing total unchanged after private contrib",
  Number(samAfter.data?.saved_minor) === samSavedBefore,
  `${samSavedBefore} → ${samAfter.data?.saved_minor}`,
);
const samFeedAfter = await sessions.sam.rpc("challenge_activity_feed", {
  p_challenge_id: cid,
  p_limit: 50,
  p_before: null,
});
assert(
  "sam still no jordan monetary events",
  !(samFeedAfter.data?.events ?? []).some(
    (e) =>
      e.user_id === ids.jordan &&
      (e.kind === "contribution" || e.kind === "milestone_reached"),
  ),
);
assert(
  "sam feed not bloated by private events displacing window",
  (samFeedAfter.data?.events ?? []).some((e) => e.kind === "contribution" && e.user_id === ids.sam),
);

// Access denial
const pendingFeed = await sessions.pending.rpc("challenge_activity_feed", {
  p_challenge_id: cid,
});
assert(
  "pending denied feed",
  Boolean(pendingFeed.error?.message?.includes("MEMBERSHIP_REQUIRED")),
  pendingFeed.error?.message,
);

const strangerFeed = await sessions.stranger.rpc("challenge_activity_feed", {
  p_challenge_id: cid,
});
assert(
  "stranger denied feed",
  Boolean(strangerFeed.error?.message?.includes("MEMBERSHIP_REQUIRED")),
  strangerFeed.error?.message,
);

const pendingDash = await sessions.pending.rpc("challenge_dashboard", {
  p_challenge_id: cid,
});
assert(
  "pending denied dashboard",
  Boolean(pendingDash.error?.message?.includes("MEMBERSHIP_REQUIRED")),
);

// Remove Sam, then deny
const samMem = await admin
  .from("challenge_memberships")
  .select("id")
  .eq("challenge_id", cid)
  .eq("user_id", ids.sam)
  .single();
await admin
  .from("challenge_memberships")
  .update({ status: "removed" })
  .eq("id", samMem.data.id);
const removedFeed = await sessions.sam.rpc("challenge_activity_feed", {
  p_challenge_id: cid,
});
assert(
  "removed denied feed",
  Boolean(removedFeed.error?.message?.includes("MEMBERSHIP_REQUIRED")),
  removedFeed.error?.message,
);
// Restore Sam for completion path
await admin
  .from("challenge_memberships")
  .update({ status: "approved" })
  .eq("id", samMem.data.id);

// Owner leave guard on Active
const leaveActive = await sessions.alex.rpc("leave_challenge", {
  p_challenge_id: cid,
});
assert(
  "active owner leave blocked",
  Boolean(leaveActive.error?.message?.includes("OWNER_LEAVE_REQUIRES_TRANSFER")),
  leaveActive.error?.message,
);

// Complete via reconcile with frozen clock after end
await admin.from("challenges").update({ end_date: "2026-11-01" }).eq("id", cid);
const tick = await admin.rpc("reconcile_challenge_lifecycles_at", {
  p_now: "2026-11-03T12:00:00.000Z",
});
assert("reconcile to Completed", !tick.error, tick.error?.message);
const chal = await admin.from("challenges").select("lifecycle_status").eq("id", cid).single();
assert(
  "lifecycle Completed",
  chal.data?.lifecycle_status === "Completed",
  chal.data?.lifecycle_status,
);

const summary = await sessions.alex.rpc("challenge_completion_summary", {
  p_challenge_id: cid,
});
assert("completion summary ok", !summary.error, summary.error?.message);
assert("summary read_only", summary.data?.read_only === true);
assert(
  "summary has challenge_completed event",
  (summary.data?.activity ?? []).some((e) => e.kind === "challenge_completed"),
);
assert(
  "privacy on completed roster",
  (summary.data?.roster ?? []).some(
    (m) => m.user_id === ids.jordan && m.privacy_chip === "Private" && !("eligible_total_minor" in m),
  ),
);

const afterWrite = await sessions.alex.rpc("record_contribution", {
  p_challenge_id: cid,
  p_amount_minor: 1000,
  p_idempotency_key: `m9-after-${stamp}`,
});
assert(
  "write rejected after completion",
  Boolean(afterWrite.error?.message?.includes("CHALLENGE_READONLY")),
  afterWrite.error?.message,
);

const amendTry = await admin.rpc("amend_contribution", {
  // will fail if no contribution id — use alex's contribution via list
  p_contribution_id: "00000000-0000-0000-0000-000000000000",
  p_amount_minor: 1,
});
void amendTry;

const contribs = await admin
  .from("contributions")
  .select("id")
  .eq("challenge_id", cid)
  .eq("user_id", ids.alex)
  .eq("status", "active")
  .limit(1);
const contribId = contribs.data?.[0]?.id;
if (contribId) {
  const asAlex = sessions.alex;
  const amend = await asAlex.rpc("amend_contribution", {
    p_contribution_id: contribId,
    p_amount_minor: 51000,
  });
  assert(
    "amend rejected after completion",
    Boolean(amend.error?.message?.includes("CHALLENGE_READONLY")),
    amend.error?.message,
  );
  const reverse = await asAlex.rpc("reverse_contribution", {
    p_contribution_id: contribId,
  });
  assert(
    "reverse rejected after completion",
    Boolean(reverse.error?.message?.includes("CHALLENGE_READONLY")),
    reverse.error?.message,
  );
}

const feedDone = await sessions.alex.rpc("challenge_activity_feed", {
  p_challenge_id: cid,
});
assert(
  "feed shows challenge_completed",
  (feedDone.data?.events ?? []).some((e) => e.kind === "challenge_completed"),
);
assert("feed read_only flag", feedDone.data?.read_only === true);

const notCompleted = await sessions.alex.rpc("challenge_completion_summary", {
  p_challenge_id: "00000000-0000-0000-0000-000000000001",
});
assert(
  "missing challenge denied or not found",
  Boolean(notCompleted.error),
);

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
mkdirSync(join(process.cwd(), "media", "m9"), { recursive: true });
writeFileSync(
  join(process.cwd(), "media", "m9", "pg-evidence.json"),
  JSON.stringify({ passed, failed, results, stamp, challengeId: cid }, null, 2),
);
console.log(`\nM9 PG evidence: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
