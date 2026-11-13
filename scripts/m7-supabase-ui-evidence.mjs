/**
 * M7 two-account UI walkthrough against localhost:3000 + live Supabase.
 * Requires: npm run dev on :3000, .env.local, M7 migration applied.
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
const password = `M7-Ui-${stamp}!`;
const alexEmail = `m7.ui.alex.${stamp}@example.com`;
const samEmail = `m7.ui.sam.${stamp}@example.com`;

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

const now = new Date();
const today = ymdInTz(now, "Europe/London");
const end = new Date(now);
end.setUTCDate(end.getUTCDate() + 90);

const created = await alex.rpc("create_private_challenge", {
  p_name: `M7 UI ${stamp}`,
  p_description: "Two-account privacy walkthrough",
  p_start_date: today,
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (created.error) throw created.error;
const challengeId = created.data.challenge.id;

await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: samId,
  p_share_monetary_info: true,
  p_role: "member",
});

const sam = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await sam.auth.signInWithPassword({ email: samEmail, password });

for (const [client, target, weekly] of [
  [alex, 200000, 5000],
  [sam, 350000, 5000],
]) {
  const act = await client.rpc("activate_savings_setup", {
    p_challenge_id: challengeId,
    p_target_minor: target,
    p_weekly_commitment_minor: weekly,
  });
  if (act.error) throw act.error;
}

const rec = await alex.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 100000,
  p_idempotency_key: `ui-alex-${stamp}`,
});
if (rec.error) throw rec.error;
const amend = await alex.rpc("amend_contribution", {
  p_contribution_id: rec.data.contribution.id,
  p_amount_minor: 124000,
});
if (amend.error) throw amend.error;

const samRec = await sam.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 184000,
  p_idempotency_key: `ui-sam-${stamp}`,
});
if (samRec.error) throw samRec.error;

const mediaDir = join(process.cwd(), "media", "m7");
const storeMedia = join(
  process.env.HOME,
  "Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/files/media/m7",
);
mkdirSync(mediaDir, { recursive: true });
mkdirSync(storeMedia, { recursive: true });

function saveShot(name) {
  const repoPath = join(mediaDir, name);
  copyFileSync(repoPath, join(storeMedia, name));
  return repoPath;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

// --- Before opt-out: Alex ---
await signInPage(page, alexEmail, password);
await page.screenshot({
  path: join(mediaDir, "01-alex-home-before-sharing.png"),
  fullPage: true,
});
saveShot("01-alex-home-before-sharing.png");

await page.goto(`${SITE}/profile#privacy`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({
  path: join(mediaDir, "02-alex-privacy-settings-default.png"),
  fullPage: true,
});
saveShot("02-alex-privacy-settings-default.png");

// --- Before opt-out: Sam sees Alex money ---
await context.clearCookies();
await signInPage(page, samEmail, password);
await page.screenshot({
  path: join(mediaDir, "03-sam-home-before-sees-alex.png"),
  fullPage: true,
});
saveShot("03-sam-home-before-sees-alex.png");

// --- Alex opts out via UI ---
await context.clearCookies();
await signInPage(page, alexEmail, password);
await page.goto(`${SITE}/profile#privacy`, { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="hide-monetary-toggle"]');
await page.check('[data-testid="hide-monetary-toggle"]');
await page.check('[data-testid="cannot-undo-ack"]');
await page.screenshot({
  path: join(mediaDir, "04-alex-privacy-opt-out-ready.png"),
  fullPage: true,
});
saveShot("04-alex-privacy-opt-out-ready.png");
await page.click('[data-testid="save-privacy"]');
await page.waitForSelector('[data-share-monetary="false"]', { timeout: 15000 });
await page.waitForSelector("text=You opted out of sharing monetary information", {
  timeout: 15000,
});
await page.waitForTimeout(400);
await page.screenshot({
  path: join(mediaDir, "05-alex-privacy-after-opt-out.png"),
  fullPage: true,
});
saveShot("05-alex-privacy-after-opt-out.png");

await page.goto(`${SITE}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({
  path: join(mediaDir, "06-alex-home-self-still-sees-own.png"),
  fullPage: true,
});
saveShot("06-alex-home-self-still-sees-own.png");

// --- After: Sam loses Alex amounts/target/% ---
await context.clearCookies();
await signInPage(page, samEmail, password);
await page.screenshot({
  path: join(mediaDir, "07-sam-home-after-alex-private.png"),
  fullPage: true,
});
saveShot("07-sam-home-after-alex-private.png");

await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({
  path: join(mediaDir, "08-sam-challenge-sharing-only.png"),
  fullPage: true,
});
saveShot("08-sam-challenge-sharing-only.png");

await browser.close();

console.log(
  JSON.stringify(
    {
      ok: true,
      challengeId,
      alexId,
      samId,
      emails: { alex: alexEmail, sam: samEmail },
      shots: [
        "media/m7/01-alex-home-before-sharing.png",
        "media/m7/02-alex-privacy-settings-default.png",
        "media/m7/03-sam-home-before-sees-alex.png",
        "media/m7/04-alex-privacy-opt-out-ready.png",
        "media/m7/05-alex-privacy-after-opt-out.png",
        "media/m7/06-alex-home-self-still-sees-own.png",
        "media/m7/07-sam-home-after-alex-private.png",
        "media/m7/08-sam-challenge-sharing-only.png",
      ],
    },
    null,
    2,
  ),
);
