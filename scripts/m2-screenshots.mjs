import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoOut = path.join(__dirname, "..", "media", "m2");
const storeOut = path.join(
  "/Users/dom.smyth/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/files/media/m2",
);
for (const dir of [repoOut, storeOut]) fs.mkdirSync(dir, { recursive: true });

const base = "http://127.0.0.1:3000";
const email = `m2.shot.${Date.now()}@example.com`;
const password = "TestPass123!";

function saveBoth(name, buffer) {
  fs.writeFileSync(path.join(repoOut, name), buffer);
  fs.writeFileSync(path.join(storeOut, name), buffer);
}

async function shot(page, name) {
  const buffer = await page.screenshot({ fullPage: true });
  saveBoth(name, buffer);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(`${base}/sign-up`);
await page.waitForLoadState("networkidle");
await page.getByLabel("Display name").fill("M2 Owner");
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Create account" }).click();
await page.getByText("Verify email (mock link)").waitFor();
const href = await page.getByRole("link", { name: "Verify email (mock link)" }).getAttribute("href");
await page.goto(new URL(href, base).toString());
await page.getByRole("button", { name: "Confirm email verification" }).click();
await page.getByText("Email verified").waitFor();

await page.goto(`${base}/sign-in`);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/home");
await shot(page, "01-home-create-cta.png");

await page.getByRole("link", { name: "Create challenge" }).click();
await page.waitForURL("**/challenge/new");
await shot(page, "02-create-step-details.png");

await page.getByLabel("Challenge name").fill("Portugal 2027");
await page.getByLabel("Description").fill("Trip fund — savings setup later");
await page.getByRole("button", { name: "Continue" }).click();
await shot(page, "03-create-step-schedule.png");

const start = "2026-11-20";
const end = "2026-12-20";
await page.getByLabel("Start date").fill(start);
await page.getByLabel("End date").fill(end);
await page.getByLabel("Currency").selectOption("GBP");
await page.getByLabel("Time zone").selectOption("Europe/London");
await page.getByRole("button", { name: "Review" }).click();
await shot(page, "04-create-step-review.png");

await page.getByRole("button", { name: "Create challenge" }).click();
await page.waitForURL(/\/challenge\/[a-f0-9]+$/);
await page.getByText("Lifecycle audit").waitFor();
await shot(page, "05-overview-scheduled.png");

// Validation: past start rejected
await page.goto(`${base}/challenge/new`);
await page.getByLabel("Challenge name").fill("Past Reject");
await page.getByRole("button", { name: "Continue" }).click();
await page.getByLabel("Start date").fill("2026-11-01");
await page.getByLabel("End date").fill("2026-12-01");
await page.getByRole("button", { name: "Review" }).click();
await page.getByRole("button", { name: "Create challenge" }).click();
await page.getByRole("alert").waitFor();
await shot(page, "06-reject-past-start.png");

// Today → Active
await page.goto(`${base}/challenge/new`);
await page.getByLabel("Challenge name").fill("Starts Today");
await page.getByRole("button", { name: "Continue" }).click();
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const endActive = "2026-12-31";
await page.getByLabel("Start date").fill(today);
await page.getByLabel("End date").fill(endActive);
await page.getByRole("button", { name: "Review" }).click();
await page.getByRole("button", { name: "Create challenge" }).click();
await page.waitForURL(/\/challenge\/[a-f0-9]+$/);
await page.getByText("Active").first().waitFor();
await shot(page, "07-overview-active.png");

await page.goto(`${base}/challenge`);
await page.waitForLoadState("networkidle");
await shot(page, "08-challenge-list.png");

await browser.close();
console.log("SCREENSHOTS_OK", repoOut, storeOut);
