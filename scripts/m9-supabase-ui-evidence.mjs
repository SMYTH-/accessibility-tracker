/**
 * M9 UI walkthrough: active Path B → completed summary.
 * Requires: npm run dev on :3000, .env.local, M9 migration applied.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { copyFileSync, mkdirSync } from "fs";
import { join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const REF = "gdrkejobqlvtwnlaedpu";

if (!url?.includes(REF) || !anon || !service) {
  console.error("MISSING_ENV_OR_WRONG_PROJECT");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stamp = Date.now();
const password = `M9-Ui-${stamp}!`;
const alexEmail = `m9.ui.alex.${stamp}@example.com`;
const samEmail = `m9.ui.sam.${stamp}@example.com`;

async function ensureUser(em, pw, name) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data.users.find((u) => u.email?.toLowerCase() === em.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: pw,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    return existing.id;
  }
  const created = await admin.auth.admin.createUser({
    email: em,
    password: pw,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

function ymdInTz(d, tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

async function signInPage(page, email, pw) {
  await page.goto(`${SITE}/sign-in`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pw);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/home/, { timeout: 30000 });
  await page.waitForTimeout(600);
}

const alexId = await ensureUser(alexEmail, password, "Alex");
const samId = await ensureUser(samEmail, password, "Sam");

const alex = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signed = await alex.auth.signInWithPassword({ email: alexEmail, password });
if (signed.error) throw signed.error;

const today = ymdInTz(new Date(), "Europe/London");
const created = await alex.rpc("create_private_challenge", {
  p_name: `M9 UI ${stamp}`,
  p_description: "Activity + completion walkthrough",
  p_start_date: today,
  p_end_date: "2027-06-01",
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (created.error) throw created.error;
const challengeId = created.data.challenge.id;

await admin.from("challenges").update({ start_date: "2026-10-01" }).eq("id", challengeId);
await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: samId,
  p_share_monetary_info: true,
  p_role: "member",
});

await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: challengeId,
  p_user_id: alexId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  p_now: "2026-10-06T12:00:00.000Z",
});
await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: challengeId,
  p_user_id: samId,
  p_target_minor: 150000,
  p_weekly_commitment_minor: 4000,
  p_now: "2026-10-06T12:00:00.000Z",
});

// Record inside the eventual completed window (start 2026-10-01 … end 2026-11-01).
await admin.rpc("record_contribution_at", {
  p_challenge_id: challengeId,
  p_user_id: alexId,
  p_amount_minor: 50000,
  p_idempotency_key: `m9-ui-a-${stamp}`,
  p_now: "2026-10-20T12:00:00.000Z",
});
await admin.rpc("record_contribution_at", {
  p_challenge_id: challengeId,
  p_user_id: samId,
  p_amount_minor: 40000,
  p_idempotency_key: `m9-ui-s-${stamp}`,
  p_now: "2026-10-20T12:00:00.000Z",
});
await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: challengeId,
  p_user_id: alexId,
  p_now: "2026-10-27T12:00:00.000Z",
});
await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: challengeId,
  p_user_id: samId,
  p_now: "2026-10-27T12:00:00.000Z",
});

const outDir = join(process.cwd(), "media", "m9");
mkdirSync(outDir, { recursive: true });
const artifactsCandidates = ["/opt/cursor/artifacts", join(process.cwd(), "media", "m9", ".artifacts")];
let artifacts = artifactsCandidates[0];
for (const candidate of artifactsCandidates) {
  try {
    mkdirSync(candidate, { recursive: true });
    artifacts = candidate;
    break;
  } catch {
    // try next writable path (cloud vs Dom Mac)
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

async function shot(name) {
  const file = join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  copyFileSync(file, join(artifacts, name));
  console.log("SHOT", name);
}

await signInPage(page, alexEmail, password);
await page.waitForSelector('[data-testid="challenge-path-b"]', { timeout: 20000 });
await shot("01-alex-home-path-b-active.png");

await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="your-streak-chip"]', { timeout: 20000 });
await page.waitForSelector('[data-testid="challenge-roster"]');
await page.waitForSelector('[data-testid="activity-preview"]');
await shot("02-alex-challenge-streak-roster-activity.png");

await page.goto(`${SITE}/activity`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="activity-feed"]', { timeout: 20000 });
await shot("03-alex-activity-feed.png");

const samContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const samPage = await samContext.newPage();
await signInPage(samPage, samEmail, password);
await samPage.goto(`${SITE}/activity`, { waitUntil: "networkidle" });
await samPage.waitForSelector('[data-testid="activity-feed"]', { timeout: 20000 });
await samPage.screenshot({
  path: join(outDir, "04-sam-activity-no-private-leak.png"),
  fullPage: true,
});
copyFileSync(
  join(outDir, "04-sam-activity-no-private-leak.png"),
  join(artifacts, "04-sam-activity-no-private-leak.png"),
);
console.log("SHOT 04-sam-activity-no-private-leak.png");
await samContext.close();

await admin.from("challenges").update({ end_date: "2026-11-01" }).eq("id", challengeId);
await admin.rpc("reconcile_challenge_lifecycles_at", {
  p_now: "2026-11-03T12:00:00.000Z",
});

await page.goto(`${SITE}/home`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="completion-summary"]', { timeout: 20000 });
await shot("05-alex-completed-summary.png");

await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="read-only-badge"]', { timeout: 20000 });
await shot("06-alex-completed-readonly.png");

await browser.close();
console.log("M9 UI evidence complete", { challengeId, alexEmail, samEmail });
