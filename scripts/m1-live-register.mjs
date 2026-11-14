import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const base = "http://127.0.0.1:3000";
const outDir = join(process.cwd(), "media/m1/supabase");
mkdirSync(outDir, { recursive: true });

const stamp = Date.now();
const email = `smyth.developer+m1live${stamp}@gmail.com`;
const password = `LiveM1-${stamp}!Aa`;
const displayName = "M1 Live Tester";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(`${base}/sign-up`);
await page.waitForLoadState("networkidle");
const badge = await page.locator("text=Auth:").innerText();
console.log("AUTH_BADGE", badge.trim());

await page.getByLabel("Display name").fill(displayName);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Create account" }).click();
await page.getByText(/Check your email|Account created|error|exists/i).first().waitFor({ timeout: 20000 });
const bodyText = await page.locator("form").innerText();
console.log("SIGNUP_RESULT_SNIPPET", bodyText.slice(0, 300).replace(/\n+/g, " | "));
await page.screenshot({ path: join(outDir, "01-sign-up.png"), fullPage: true });

// Persist credentials locally for the suite (gitignored via .data/)
mkdirSync(".data", { recursive: true });
writeFileSync(
  ".data/m1-live-suite.json",
  JSON.stringify({ email, password, displayName, stamp, createdAt: new Date().toISOString() }, null, 2),
);
console.log("CREDENTIALS_FILE", ".data/m1-live-suite.json");
console.log("TEST_EMAIL", email);
console.log("WAITING_FOR_VERIFICATION_EMAIL");

await browser.close();
