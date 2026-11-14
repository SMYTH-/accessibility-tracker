import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "media", "m1");
fs.mkdirSync(outDir, { recursive: true });

const base = "http://127.0.0.1:3000";
const email = `shot.${Date.now()}@example.com`;
const password = "TestPass123!";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(`${base}/sign-in`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: path.join(outDir, "sign-in.png"), fullPage: true });

await page.goto(`${base}/sign-up`);
await page.waitForLoadState("networkidle");
await page.getByLabel("Display name").fill("Alex Reviewer");
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Create account" }).click();
await page.getByText("Verify email (mock link)").waitFor();
await page.screenshot({ path: path.join(outDir, "sign-up-verify-link.png"), fullPage: true });

const href = await page.getByRole("link", { name: "Verify email (mock link)" }).getAttribute("href");
await page.goto(new URL(href, base).toString());
await page.getByRole("button", { name: "Confirm email verification" }).click();
await page.getByText("Email verified").waitFor();
await page.screenshot({ path: path.join(outDir, "verify-email.png"), fullPage: true });

await page.goto(`${base}/sign-in`);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/home");
await page.screenshot({ path: path.join(outDir, "home-shell.png"), fullPage: true });

await page.goto(`${base}/profile`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: path.join(outDir, "profile.png"), fullPage: true });

await page.goto(`${base}/challenge`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: path.join(outDir, "challenge-placeholder.png"), fullPage: true });

await browser.close();
console.log("SCREENSHOTS_OK", outDir);
