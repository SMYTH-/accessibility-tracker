/**
 * M8 UI walkthrough against localhost:3000 + live Supabase.
 * Requires: npm run dev on :3000, .env.local, M8 migration applied.
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
const password = `M8-Ui-${stamp}!`;
const alexEmail = `m8.ui.alex.${stamp}@example.com`;
const samEmail = `m8.ui.sam.${stamp}@example.com`;

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
  p_name: `M8 UI ${stamp}`,
  p_description: "Weekly assessment walkthrough",
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
  p_now: "2026-10-19T12:00:00.000Z",
});
await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: challengeId,
  p_user_id: samId,
  p_target_minor: 150000,
  p_weekly_commitment_minor: 4000,
  p_now: "2026-10-19T12:00:00.000Z",
});

await admin.rpc("record_contribution_at", {
  p_challenge_id: challengeId,
  p_user_id: alexId,
  p_amount_minor: 5000,
  p_idempotency_key: `ui-w43-${stamp}`,
  p_now: "2026-10-21T12:00:00.000Z",
});
await admin.rpc("record_contribution_at", {
  p_challenge_id: challengeId,
  p_user_id: alexId,
  p_amount_minor: 5000,
  p_idempotency_key: `ui-w44-${stamp}`,
  p_now: "2026-10-28T12:00:00.000Z",
});
const w45 = await admin.rpc("record_contribution_at", {
  p_challenge_id: challengeId,
  p_user_id: alexId,
  p_amount_minor: 4000,
  p_idempotency_key: `ui-w45-${stamp}`,
  p_now: "2026-11-04T12:00:00.000Z",
});
await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: challengeId,
  p_user_id: alexId,
  p_now: "2026-11-12T12:00:00.000Z",
});

const mediaDir = join(process.cwd(), "media", "m8");
const storeMedia = join(
  process.env.HOME || "",
  "Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/files/media/m8",
);
mkdirSync(mediaDir, { recursive: true });
mkdirSync(storeMedia, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

async function shot(name) {
  const file = `${name}.png`;
  const path = join(mediaDir, file);
  await page.screenshot({ path, fullPage: true });
  copyFileSync(path, join(storeMedia, file));
  console.log("SHOT", file);
}

await signInPage(page, alexEmail, password);
await page.goto(`${SITE}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot("01-alex-home-streak-miss");

await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await shot("02-alex-challenge-own-assessments");

// Amend to flip miss → completed streak 3
await alex.rpc("amend_contribution", {
  p_contribution_id: w45.data.contribution.id,
  p_amount_minor: 5000,
});
await admin.rpc("recompute_member_weekly_assessments_at", {
  p_challenge_id: challengeId,
  p_user_id: alexId,
  p_now: "2026-11-12T12:00:00.000Z",
});

await page.goto(`${SITE}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot("03-alex-home-streak-three");

await page.goto(`${SITE}/sign-in`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  // clear cookies via reload after storage clear
  localStorage.clear();
});
await context.clearCookies();
await signInPage(page, samEmail, password);
await page.goto(`${SITE}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot("04-sam-home-own-commitment-only");

await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await shot("05-sam-cannot-see-alex-assessment-details");

await browser.close();
console.log("M8 UI evidence complete", { challengeId, alexEmail, samEmail });
