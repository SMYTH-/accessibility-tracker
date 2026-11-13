/**
 * M11 UI walkthrough screenshots — two-account connected path highlights.
 * Requires: npm run dev on :3000, .env.local, migrations applied.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
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

function ymdInTz(d, tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

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

const stamp = Date.now();
const password = `M11-Ui-${stamp}!`;
const alexEmail = `m11.ui.alex.${stamp}@example.com`;
const samEmail = `m11.ui.sam.${stamp}@example.com`;

const alexId = await ensureUser(alexEmail, password, "Alex");
const samId = await ensureUser(samEmail, password, "Sam");

const alex = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await alex.auth.signInWithPassword({ email: alexEmail, password });
const today = ymdInTz(new Date(), "Europe/London");
const created = await alex.rpc("create_private_challenge", {
  p_name: `M11 UI ${stamp}`,
  p_description: "walkthrough",
  p_start_date: today,
  p_end_date: "2027-06-01",
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (created.error) throw created.error;
const challengeId = created.data.challenge.id;

const invite = await alex.rpc("create_challenge_invitation", {
  p_challenge_id: challengeId,
  p_expires_in_days: 7,
});
const token = invite.data?.token;

await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: samId,
  p_share_monetary_info: true,
  p_role: "member",
});
for (const [uid, target, weekly] of [
  [alexId, 200000, 5000],
  [samId, 350000, 5000],
]) {
  await admin.rpc("activate_savings_setup_at", {
    p_challenge_id: challengeId,
    p_user_id: uid,
    p_target_minor: target,
    p_weekly_commitment_minor: weekly,
    p_now: new Date().toISOString(),
  });
}
await alex.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 124000,
  p_idempotency_key: `m11-ui-alex-${stamp}`,
});
const samClient = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await samClient.auth.signInWithPassword({ email: samEmail, password });
await samClient.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 184000,
  p_idempotency_key: `m11-ui-sam-${stamp}`,
});

const outDir = join(process.cwd(), "media", "m11");
mkdirSync(outDir, { recursive: true });
const shots = [];

const browser = await chromium.launch({ headless: true });

async function signInPage(page, email) {
  await page.goto(`${SITE}/sign-in`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/home/, { timeout: 30000 });
  await page.waitForTimeout(500);
}

async function shot(page, name) {
  const path = join(outDir, name);
  await page.screenshot({ path, fullPage: true });
  shots.push(name);
  console.log("SHOT", name);
}

// Signed-out invite preview
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${SITE}/invite/${token}`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await shot(page, "01-invite-preview-signed-out.png");

await signInPage(page, alexEmail);
await shot(page, "02-alex-home.png");

await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot(page, "03-alex-challenge-sharing.png");

await page.goto(`${SITE}/profile`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await shot(page, "04-alex-profile-account-controls.png");

// Sam perspective before/after alex opt-out
await contextClear(page);
await signInPage(page, samEmail);
await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot(page, "05-sam-challenge-sees-alex.png");

await alex.rpc("set_own_share_monetary_info", {
  p_challenge_id: challengeId,
  p_share: false,
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot(page, "06-sam-challenge-after-alex-opt-out.png");

await page.goto(`${SITE}/activity`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await shot(page, "07-sam-activity-privacy.png");

await browser.close();

writeFileSync(
  join(outDir, "ui-evidence.json"),
  JSON.stringify({ stamp, challengeId, tokenPresent: Boolean(token), shots }, null, 2),
);
console.log(`\nM11 UI: ${shots.length} screenshots`);

async function contextClear(page) {
  await page.context().clearCookies();
  await page.goto(`${SITE}/sign-in`, { waitUntil: "networkidle" });
}
