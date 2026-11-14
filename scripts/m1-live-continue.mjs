import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const base = "http://localhost:3000"; // must match Site URL / cookies (not 127.0.0.1)
const outDir = join(process.cwd(), "media/m1/supabase");
mkdirSync(outDir, { recursive: true });

const suite = JSON.parse(readFileSync(".data/m1-live-suite.json", "utf8"));
const { email, password, displayName } = suite;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

async function shot(name) {
  await page.screenshot({ path: join(outDir, name), fullPage: true });
}

// --- unauthenticated protected route ---
await page.goto(`${base}/challenge`);
await page.waitForURL(/\/sign-in/);
console.log("PROTECTED_REDIRECT", page.url());
await shot("02-protected-redirect.png");

// --- sign-in (account already email-confirmed on provider) ---
await page.goto(`${base}/sign-in`);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
try {
  await page.waitForURL("**/home", { timeout: 15000 });
  console.log("SIGN_IN", "pass", page.url());
} catch {
  const txt = await page.locator("form").innerText();
  console.log("SIGN_IN_FAIL", txt.slice(0, 240).replace(/\n+/g, " | "));
  await shot("02b-sign-in-fail.png");
  await browser.close();
  process.exit(1);
}
await shot("03-home.png");

// --- profile update ---
await page.goto(`${base}/profile`);
await page.waitForLoadState("networkidle");
const newName = `${displayName} Updated`;
await page.getByLabel("Display name").fill(newName);
await page.getByRole("button", { name: "Save profile" }).click();
await page.getByText(/Profile updated|Saved/i).waitFor({ timeout: 10000 });
console.log("PROFILE_UPDATE", "pass");
await shot("04-profile.png");

// --- sign-out ---
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForURL("**/sign-in");
console.log("SIGN_OUT", "pass", page.url());
await shot("05-signed-out.png");

// confirm protected again
await page.goto(`${base}/home`);
await page.waitForURL(/\/sign-in/);
console.log("POST_SIGNOUT_PROTECTED", "pass");

// --- request recovery (browser PKCE on localhost) ---
await page.goto(`${base}/reset-password`);
await page.getByLabel("Email").fill(email);
await page.getByRole("button", { name: "Send recovery link" }).click();
await page.getByText(/recovery email has been sent|If an account exists/i).waitFor({
  timeout: 15000,
});
console.log("RECOVERY_REQUESTED", "pass");
await shot("06-recovery-requested.png");

writeFileSync(
  ".data/m1-live-suite.json",
  JSON.stringify(
    {
      ...suite,
      displayName: newName,
      recoveryRequestedAt: new Date().toISOString(),
      waitingFor: "password_recovery_email",
    },
    null,
    2,
  ),
);

console.log("TEST_EMAIL", email);
console.log("WAITING_FOR_RECOVERY_EMAIL");
await browser.close();
