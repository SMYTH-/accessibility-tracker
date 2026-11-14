/**
 * M4 UI screenshots in mock auth mode (no Supabase required).
 * Expects Next already running with AUTH_MODE=mock on BASE (default :3000).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, copyFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const BASE = process.env.M4_BASE_URL || "http://127.0.0.1:3000";
const mediaDir = join(ROOT, "media", "m4");
const storeMedia = "/cursor/stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/media/m4";
mkdirSync(mediaDir, { recursive: true });
mkdirSync(storeMedia, { recursive: true });
mkdirSync(join(ROOT, ".data"), { recursive: true });

const email = `m4.mock.${Date.now()}@example.com`;
const password = "TestPass123!";

const browser = await chromium.launch({ headless: true });
const shots = [];

async function shot(page, name) {
  const path = join(mediaDir, name);
  await page.screenshot({ path, fullPage: true });
  copyFileSync(path, join(storeMedia, name));
  shots.push(name);
  console.log("SHOT", name);
}

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(`${BASE}/sign-up`);
await page.waitForLoadState("networkidle");
await page.getByLabel("Display name").fill("M4 Mock Owner");
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Create account" }).click();
await page.getByText("Verify email (mock link)").waitFor();
const href = await page.getByRole("link", { name: "Verify email (mock link)" }).getAttribute("href");
await page.goto(new URL(href, BASE).toString());
await page.getByRole("button", { name: "Confirm email verification" }).click();
await page.getByText("Email verified").waitFor();

await page.goto(`${BASE}/sign-in`);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/home");

await page.getByRole("link", { name: "Create challenge" }).click();
await page.waitForURL("**/challenge/new");
await page.getByLabel("Challenge name").fill("Portugal M4");
await page.getByLabel("Description").fill("Savings setup walkthrough");
await page.getByRole("button", { name: "Continue" }).click();

const start = new Date();
start.setUTCDate(start.getUTCDate() + 21);
const end = new Date(start);
end.setUTCDate(end.getUTCDate() + 60);
await page.getByLabel("Start date").fill(start.toISOString().slice(0, 10));
await page.getByLabel("End date").fill(end.toISOString().slice(0, 10));
await page.getByLabel("Currency").selectOption("GBP");
await page.getByLabel("Time zone").selectOption("Europe/London");
await page.getByRole("button", { name: "Review" }).click();
await page.getByRole("button", { name: "Create challenge" }).click();
await page.waitForURL(/\/challenge\/[a-f0-9]+$/);

await page.getByText(/Inactive \(setup required\)/i).waitFor();
await page.getByText(/Activate savings participation/i).waitFor();
await shot(page, "01-inactive-without-setup.png");

await page.fill('input[name="targetMajor"]', "2000");
await page.fill('input[name="weeklyCommitmentMajor"]', "50");
await shot(page, "02-setup-form-filled.png");

await page.getByRole("button", { name: /Activate savings/i }).click();
await page.getByText(/Your savings setup/i).waitFor({ timeout: 15000 });
await shot(page, "03-setup-active.png");

await page.getByText(/First assessed week/i).waitFor();
await page.getByText(/Monday activation assesses the current week|First assessed week/i).first().waitFor();
await shot(page, "04-activation-week-rule.png");

await page.getByText(/Record savings \(M5\)/i).waitFor();
await shot(page, "05-record-still-gated.png");

await browser.close();

writeFileSync(
  join(ROOT, ".data", "m4-mock-ui-evidence.json"),
  JSON.stringify({ shots, email, mode: "mock", base: BASE }, null, 2),
);
console.log("MOCK UI EVIDENCE OK", shots.length);
