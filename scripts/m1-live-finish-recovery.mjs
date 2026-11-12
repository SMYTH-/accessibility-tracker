/**
 * Completes recovery without relying on a foreign-browser PKCE cookie jar.
 * Uses Admin generateLink → token_hash → /auth/callback (verifyOtp path).
 * Does not print secrets/tokens.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const REF = "gdrkejobqlvtwnlaedpu";
const base = "http://localhost:3000";
const outDir = join(process.cwd(), "media/m1/supabase");
mkdirSync(outDir, { recursive: true });

const suite = JSON.parse(readFileSync(".data/m1-live-suite.json", "utf8"));
const email = suite.email;
const oldPassword = suite.password;
const newPassword = `NewM1-${Date.now()}!Aa`;

const keys = JSON.parse(
  execFileSync("supabase", ["projects", "api-keys", "--output-format", "json"], {
    encoding: "utf8",
  }),
).keys;
const service = keys.find((k) => k.name === "service_role")?.api_key;
if (!service) throw new Error("service_role missing");

const genRes = await fetch(`https://${REF}.supabase.co/auth/v1/admin/generate_link`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${service}`,
    apikey: service,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "recovery",
    email,
    options: {
      redirect_to: `${base}/auth/callback?next=/update-password`,
    },
  }),
});
const genBody = await genRes.json();
if (!genRes.ok) {
  console.log("GENERATE_LINK_FAILED", genRes.status, genBody?.msg || genBody?.message || genBody?.error_code);
  process.exit(1);
}
const hashed =
  genBody?.hashed_token ||
  genBody?.properties?.hashed_token ||
  genBody?.email_otp ||
  genBody?.properties?.email_otp;
if (!hashed) {
  console.log("NO_HASHED_TOKEN_KEYS", Object.keys(genBody || {}), Object.keys(genBody?.properties || {}));
  process.exit(1);
}
console.log("GENERATE_LINK_OK", "hashed_token_len=" + String(hashed).length);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

async function shot(name) {
  await page.screenshot({ path: join(outDir, name), fullPage: true });
}

// Signed-out recovery via token_hash (no PKCE verifier required)
const callbackUrl = `${base}/auth/callback?token_hash=${encodeURIComponent(hashed)}&type=recovery&next=/update-password`;
await page.goto(callbackUrl);
await page.waitForLoadState("networkidle");
console.log("AFTER_CALLBACK_URL", page.url());
await shot("07-after-recovery-callback.png");

if (!page.url().includes("/update-password")) {
  console.log("CALLBACK_DID_NOT_LAND_ON_UPDATE_PASSWORD");
  await browser.close();
  process.exit(1);
}

// Ensure form is available (session present)
const formVisible = await page.getByLabel("New password").isVisible().catch(() => false);
if (!formVisible) {
  const body = await page.locator("body").innerText();
  console.log("NO_PASSWORD_FORM", body.slice(0, 300).replace(/\n+/g, " | "));
  await browser.close();
  process.exit(1);
}

await page.getByLabel("New password").fill(newPassword);
await page.getByRole("button", { name: "Update password" }).click();
await page.getByText(/Password updated|Sign in/i).first().waitFor({ timeout: 15000 });
console.log("PASSWORD_UPDATE", "pass");
await shot("08-password-updated.png");

// Wait for redirect to sign-in
await page.waitForURL("**/sign-in", { timeout: 10000 }).catch(() => {});

// Old password must fail
await page.goto(`${base}/sign-in`);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(oldPassword);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(1500);
const oldFailText = await page.locator("form").innerText();
const oldFailed = /invalid|error|credentials|wrong/i.test(oldFailText) && !page.url().includes("/home");
console.log("OLD_PASSWORD_FAILS", oldFailed ? "pass" : "UNEXPECTED", page.url());
await shot("09-old-password-denied.png");

// New password must work
await page.goto(`${base}/sign-in`);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(newPassword);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/home", { timeout: 15000 });
console.log("NEW_PASSWORD_WORKS", "pass", page.url());
await shot("10-new-password-home.png");

writeFileSync(
  ".data/m1-live-suite.json",
  JSON.stringify(
    {
      ...suite,
      password: newPassword,
      oldPasswordRetired: true,
      recoveryCompletedAt: new Date().toISOString(),
      waitingFor: null,
      suiteComplete: true,
    },
    null,
    2,
  ),
);

console.log("SUITE_COMPLETE");
await browser.close();
