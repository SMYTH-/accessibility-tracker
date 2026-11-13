/**
 * M6 UI screenshots against localhost:3000 + live Supabase.
 * Requires: npm run dev on :3000, .env.local, M6 migration applied.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { mkdirSync } from "fs";
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
const password = `M6-Ui-${stamp}!`;
const email = `m6.ui.${stamp}@example.com`;

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

const userId = await ensureUser(email, password, "M6 UI Owner");
const owner = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signed = await owner.auth.signInWithPassword({ email, password });
if (signed.error) throw signed.error;

const now = new Date();
const today = ymdInTz(now, "Europe/London");
const end = new Date(now);
end.setUTCDate(end.getUTCDate() + 90);

const created = await owner.rpc("create_private_challenge", {
  p_name: `M6 UI ${stamp}`,
  p_description: "Dashboard evidence",
  p_start_date: today,
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (created.error) throw created.error;
const challengeId = created.data.challenge.id;

const act = await owner.rpc("activate_savings_setup", {
  p_challenge_id: challengeId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
});
if (act.error) throw act.error;

const rec = await owner.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 124000,
  p_idempotency_key: `ui-${stamp}`,
});
if (rec.error) throw rec.error;

const mediaDir = join(process.cwd(), "media", "m6");
mkdirSync(mediaDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(`${SITE}/sign-in`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/home/, { timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({
  path: join(mediaDir, "01-home-personal-progress.png"),
  fullPage: true,
});

await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({
  path: join(mediaDir, "02-challenge-sharing-totals.png"),
  fullPage: true,
});

// Second sharer for multi-member total
const otherEmail = `m6.ui.other.${stamp}@example.com`;
const otherId = await ensureUser(otherEmail, password, "Sam UI");
await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: otherId,
  p_share_monetary_info: true,
  p_role: "member",
});
const other = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await other.auth.signInWithPassword({ email: otherEmail, password });
await other.rpc("activate_savings_setup", {
  p_challenge_id: challengeId,
  p_target_minor: 150000,
  p_weekly_commitment_minor: 4000,
});
await other.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 54000,
  p_idempotency_key: `other-ui-${stamp}`,
});

await page.goto(`${SITE}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({
  path: join(mediaDir, "03-home-sharing-members-only.png"),
  fullPage: true,
});

// Amend then reload — personal progress updates
await owner.rpc("amend_contribution", {
  p_contribution_id: rec.data.contribution.id,
  p_amount_minor: 130000,
});
await page.goto(`${SITE}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({
  path: join(mediaDir, "04-home-after-amend.png"),
  fullPage: true,
});

await browser.close();
console.log(
  JSON.stringify(
    {
      ok: true,
      challengeId,
      userId,
      shots: [
        "media/m6/01-home-personal-progress.png",
        "media/m6/02-challenge-sharing-totals.png",
        "media/m6/03-home-sharing-members-only.png",
        "media/m6/04-home-after-amend.png",
      ],
    },
    null,
    2,
  ),
);
