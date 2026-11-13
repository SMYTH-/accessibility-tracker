/**
 * M10 UI: Profile account controls (export + deletion entry).
 * Requires: npm run dev on :3000, .env.local, M10 migrations applied.
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
const password = `M10-Ui-${stamp}!`;
const alexEmail = `m10.ui.alex.${stamp}@example.com`;

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

async function signInPage(page, email, pw) {
  await page.goto(`${SITE}/sign-in`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pw);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/home/, { timeout: 30000 });
  await page.waitForTimeout(600);
}

await ensureUser(alexEmail, password, "Alex");

const outDir = join(process.cwd(), "media", "m10");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await signInPage(page, alexEmail, password);
await page.goto(`${SITE}/profile`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({
  path: join(outDir, "01-profile-account-controls.png"),
  fullPage: true,
});

const exportBtn = page.getByRole("button", { name: /Export my data/i });
await exportBtn.click();
await page.waitForTimeout(1500);
await page.screenshot({
  path: join(outDir, "02-profile-export-ready.png"),
  fullPage: true,
});

const exportStatus = await page.getByText(/Personal data export ready/i).count();
if (exportStatus < 1) {
  console.error("FAIL export UI message missing");
  await browser.close();
  process.exit(1);
}

await page.getByText(/I understand deletion revokes access/i).click();
await page.screenshot({
  path: join(outDir, "03-profile-deletion-ack.png"),
  fullPage: true,
});

console.log("OK  m10-supabase-ui-evidence");
await browser.close();
process.exit(0);
