/**
 * M5 UI evidence: gated record, record form when Active+setup, list/amend/reverse.
 * Requires: npm run dev on :3000, .env.local, M5 migration applied.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, copyFileSync } from "fs";
import { join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.M5_BASE_URL || "http://localhost:3000";
const REF = "gdrkejobqlvtwnlaedpu";

if (!url?.includes(REF) || !anon || !service) {
  console.error("MISSING_ENV_OR_WRONG_PROJECT");
  process.exit(1);
}

const mediaDir = join(process.cwd(), "media", "m5");
mkdirSync(mediaDir, { recursive: true });
const storeMediaCandidates = [
  "/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/m5",
  join(
    process.env.HOME || "",
    "Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/files/media/m5",
  ),
];
let storeMedia = storeMediaCandidates[0];
for (const candidate of storeMediaCandidates) {
  try {
    mkdirSync(candidate, { recursive: true });
    storeMedia = candidate;
    break;
  } catch {
    /* try next */
  }
}

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

function todayInTz(tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const stamp = Date.now();
const ownerEmail = `m5.ui.owner.${stamp}@example.com`;
const password = `M5-UI-${stamp}!`;
await ensureUser(ownerEmail, password, "M5 UI Owner");

const owner = client();
await owner.auth.signInWithPassword({ email: ownerEmail, password });

const today = todayInTz("Europe/London");
const end = new Date();
end.setUTCDate(end.getUTCDate() + 90);
const endDate = end.toISOString().slice(0, 10);

const gated = await owner.rpc("create_private_challenge", {
  p_name: "Portugal UI M5 Gated",
  p_description: "Before setup",
  p_start_date: today,
  p_end_date: endDate,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (gated.error) throw gated.error;
const gatedId = gated.data.challenge.id;

const active = await owner.rpc("create_private_challenge", {
  p_name: "Portugal UI M5 Record",
  p_description: "Contribution walkthrough",
  p_start_date: today,
  p_end_date: endDate,
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (active.error) throw active.error;
const activeId = active.data.challenge.id;
const act = await owner.rpc("activate_savings_setup", {
  p_challenge_id: activeId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
});
if (act.error) throw act.error;

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
await page.waitForURL(/home/, { timeout: 20000 });

await page.goto(`${BASE}/challenge/${gatedId}`, { waitUntil: "networkidle" });
await page.getByText(/Portugal UI M5 Gated/i).waitFor();
await page.getByRole("button", { name: /Record savings — gated/i }).waitFor();
await page.getByText(/Inactive \(setup required\)/i).waitFor();
await shot(page, "01-gated-before-setup.png");

await page.goto(`${BASE}/challenge/${activeId}`, { waitUntil: "networkidle" });
await page.getByText(/Portugal UI M5 Record/i).waitFor();
await page.getByRole("button", { name: /Record contribution/i }).waitFor();
await shot(page, "02-record-form-ready.png");

await page
  .locator("form")
  .filter({ has: page.getByRole("button", { name: /Record contribution/i }) })
  .locator('input[name="amountMajor"]')
  .fill("50.00");
await page.getByRole("button", { name: /Record contribution/i }).click();
await page.getByText(/Recorded GBP/i).waitFor({ timeout: 15000 });
await shot(page, "03-after-record.png");

await page.getByRole("heading", { name: /Your contributions/i }).waitFor();
const amendForm = page
  .locator("form")
  .filter({ has: page.getByRole("button", { name: /^Amend$/i }) })
  .first();
await amendForm.locator('input[name="amountMajor"]').fill("55.00");
await amendForm.getByRole("button", { name: /^Amend$/i }).click();
await page.getByText(/Amended to GBP/i).waitFor({ timeout: 15000 });
await shot(page, "04-after-amend.png");

await page.getByRole("button", { name: /^Reverse$/i }).first().click();
await page.getByText(/Reversed\./i).waitFor({ timeout: 15000 });
await page.getByRole("heading", { name: /Contribution audit/i }).waitFor();
await shot(page, "05-contribution-audit.png");

await browser.close();

mkdirSync(join(process.cwd(), ".data"), { recursive: true });
writeFileSync(
  join(process.cwd(), ".data", "m5-ui-evidence.json"),
  JSON.stringify({ shots, storeMedia, stamp, gatedId, activeId }, null, 2),
);
console.log("UI evidence complete", shots.length);
process.exit(0);
