/**
 * Real Supabase sign-in → create challenge UI evidence (Playwright).
 * Uses admin-confirmed users; never prints secrets.
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

function loadEnv() {
  const text = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const base = "http://127.0.0.1:3000";
const REF = "gdrkejobqlvtwnlaedpu";
if (!url?.includes(REF) || !anon || !service) {
  console.error("MISSING_ENV");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const email = `m2.ui.${stamp}@example.com`;
const password = `M2-UI-${stamp}!`;
const otherEmail = `m2.ui.other.${stamp}@example.com`;

async function ensureUser(e, p, name) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data.users.find((u) => u.email?.toLowerCase() === e.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: p,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    return existing.id;
  }
  const created = await admin.auth.admin.createUser({
    email: e,
    password: p,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

await ensureUser(email, password, "M2 UI Owner");
const otherId = await ensureUser(otherEmail, password, "M2 UI Other");

const repoOut = join(process.cwd(), "media", "m2");
const storeOut =
  "/Users/dom.smyth/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/files/media/m2";
mkdirSync(repoOut, { recursive: true });
mkdirSync(storeOut, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

async function shot(name) {
  const buf = await page.screenshot({ fullPage: true });
  writeFileSync(join(repoOut, name), buf);
  writeFileSync(join(storeOut, name), buf);
}

await page.goto(`${base}/sign-in`);
await page.waitForLoadState("networkidle");
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/home", { timeout: 30000 });
await shot("09-supabase-home.png");

await page.getByRole("link", { name: "Create challenge" }).click();
await page.waitForURL("**/challenge/new");
await page.getByLabel("Challenge name").fill("Supabase Live Challenge");
await page.getByLabel("Description").fill("Created with real Supabase session");
await page.getByRole("button", { name: "Continue" }).click();
const start = "2026-11-28";
const end = "2026-12-28";
await page.getByLabel("Start date").fill(start);
await page.getByLabel("End date").fill(end);
await page.getByLabel("Currency").selectOption("GBP");
await page.getByLabel("Time zone").selectOption("Europe/London");
await page.getByRole("button", { name: "Review" }).click();
await page.getByRole("button", { name: "Create challenge" }).click();
await page.waitForURL(/\/challenge\/[0-9a-f-]{36}$/i, { timeout: 30000 });
await page.getByText("Scheduled").first().waitFor();
await page.getByText("Lifecycle audit").waitFor();
await shot("10-supabase-overview-scheduled.png");
const overviewUrl = page.url();
const challengeId = overviewUrl.split("/").pop();

// Sign out via profile if available, else clear cookies and sign in as other
await page.goto(`${base}/profile`);
const signOut = page.getByRole("button", { name: /sign out/i });
if (await signOut.count()) {
  await signOut.click();
  await page.waitForURL(/sign-in/, { timeout: 15000 }).catch(() => {});
} else {
  await context.clearCookies();
}

await page.goto(`${base}/sign-in`);
await page.getByLabel("Email").fill(otherEmail);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/home", { timeout: 30000 });
await page.goto(`${base}/challenge/${challengeId}`);
await page.waitForTimeout(1500);
const body = await page.locator("body").innerText();
const denied =
  body.includes("Not Found") ||
  body.includes("404") ||
  (await page.locator("text=Scheduled").count()) === 0;
await shot("11-supabase-other-user-denied.png");

// Re-sign owner and confirm still there after "restart" (fresh context)
await browser.close();

const browser2 = await chromium.launch();
const context2 = await browser2.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page2 = await context2.newPage();
await page2.goto(`${base}/sign-in`);
await page2.getByLabel("Email").fill(email);
await page2.getByLabel("Password").fill(password);
await page2.getByRole("button", { name: "Sign in" }).click();
await page2.waitForURL("**/home", { timeout: 30000 });
await page2.goto(`${base}/challenge/${challengeId}`);
await page2.getByText("Supabase Live Challenge").waitFor({ timeout: 15000 });
await page2.getByText("Scheduled").first().waitFor();
const buf = await page2.screenshot({ fullPage: true });
writeFileSync(join(repoOut, "12-supabase-persist-after-relogin.png"), buf);
writeFileSync(join(storeOut, "12-supabase-persist-after-relogin.png"), buf);
await browser2.close();

const out = {
  at: new Date().toISOString(),
  project: REF,
  email,
  otherEmail,
  otherId,
  challengeId,
  overviewUrl,
  secondUserDenied: denied,
};
mkdirSync(join(process.cwd(), ".data"), { recursive: true });
writeFileSync(join(process.cwd(), ".data", "m2-supabase-ui-evidence.json"), JSON.stringify(out, null, 2));
console.log("UI_EVIDENCE_OK", JSON.stringify({ challengeId, secondUserDenied: denied }));
if (!denied) {
  console.error("EXPECTED_DENIAL_FOR_SECOND_USER");
  process.exit(1);
}
