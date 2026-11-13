/**
 * M4 UI evidence: inactive-without-setup, activate form, active setup + week rule copy.
 * Requires: npm run dev on :3000, .env.local, service role, M4 migration applied.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, copyFileSync } from "fs";
import { join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.M4_BASE_URL || "http://localhost:3000";
const REF = "gdrkejobqlvtwnlaedpu";

if (!url?.includes(REF) || !anon || !service) {
  console.error("MISSING_ENV_OR_WRONG_PROJECT");
  process.exit(1);
}

const mediaDir = join(process.cwd(), "media", "m4");
mkdirSync(mediaDir, { recursive: true });
const storeMedia = "/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/m4";
mkdirSync(storeMedia, { recursive: true });

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const client = () =>
  createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

async function ensureUser(email, password, displayName) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
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

const stamp = Date.now();
const ownerEmail = `m4.ui.owner.${stamp}@example.com`;
const password = `M4-UI-${stamp}!`;
await ensureUser(ownerEmail, password, "M4 UI Owner");

const owner = client();
await owner.auth.signInWithPassword({ email: ownerEmail, password });
const start = new Date();
start.setUTCDate(start.getUTCDate() + 30);
const end = new Date(start);
end.setUTCDate(end.getUTCDate() + 60);
const created = await owner.rpc("create_private_challenge", {
  p_name: "Portugal UI M4",
  p_description: "Savings setup walkthrough",
  p_start_date: start.toISOString().slice(0, 10),
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (created.error) throw created.error;
const challengeId = created.data.challenge.id;

const browser = await chromium.launch({ headless: true });
const shots = [];

async function shot(page, name) {
  const path = join(mediaDir, name);
  await page.screenshot({ path, fullPage: true });
  copyFileSync(path, join(storeMedia, name));
  shots.push(path);
  console.log("SHOT", path);
}

const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', ownerEmail);
await page.fill('input[name="password"]', password);
await page.getByRole("button", { name: /Sign in/i }).click();
await page.waitForURL(/home/);
await page.goto(`${BASE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.getByText(/Portugal UI M4/i).waitFor();
await page.getByText(/Inactive \(setup required\)/i).waitFor();
await page.getByText(/Activate savings participation/i).waitFor();
await shot(page, "01-inactive-without-setup.png");

await page.fill('input[name="targetMajor"]', "2000");
await page.fill('input[name="weeklyCommitmentMajor"]', "50");
await shot(page, "02-setup-form-filled.png");
await page.getByRole("button", { name: /Activate savings/i }).click();
await page.getByText(/Your savings setup/i).waitFor({ timeout: 15000 });
await page.getByText(/First assessed week/i).waitFor();
await shot(page, "03-setup-active.png");

await page.getByText(/First assessed week/i).waitFor();
await shot(page, "04-activation-week-rule.png");

await page.getByText(/Record savings \(M5\)/i).waitFor();
await shot(page, "05-record-still-gated.png");

await browser.close();

writeFileSync(
  join(process.cwd(), ".data", "m4-supabase-ui-evidence.json"),
  JSON.stringify({ challengeId, shots, stamp }, null, 2),
);
console.log("UI evidence complete", shots.length);
