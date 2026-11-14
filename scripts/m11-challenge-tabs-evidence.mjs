/**
 * Challenge tabs + dashboard “Set up savings.” deep-link evidence (mock auth).
 * Expects Next on BASE with AUTH_MODE=mock (default http://127.0.0.1:3011).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, copyFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const BASE = process.env.M11_TABS_BASE_URL || "http://127.0.0.1:3011";
const storeMedia =
  "/Users/dom.smyth/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-01a1cb7f-3748-76b6-a0c6-6560b08a6ca8/files/media/m11/challenge-tabs";
const mediaDir = join(ROOT, "media", "m11", "challenge-tabs");
mkdirSync(mediaDir, { recursive: true });
mkdirSync(storeMedia, { recursive: true });
mkdirSync(join(ROOT, ".data"), { recursive: true });

const ownerEmail = `tabs.owner.${Date.now()}@example.com`;
const memberEmail = `tabs.member.${Date.now()}@example.com`;
const password = "TestPass123!";

const browser = await chromium.launch({ headless: true });
const shots = [];
const notes = [];

async function shot(page, name) {
  const path = join(mediaDir, name);
  await page.screenshot({ path, fullPage: true });
  copyFileSync(path, join(storeMedia, name));
  shots.push(name);
  console.log("SHOT", name);
}

function challengeNav(page) {
  return page.getByRole("navigation", { name: "Challenge sections" });
}

async function openTab(page, label) {
  await challengeNav(page).getByRole("link", { name: label, exact: true }).click();
}

async function signUpAndVerify(page, { displayName, email }) {
  await page.goto(`${BASE}/sign-up`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByText("Verify email (mock link)").waitFor();
  const href = await page
    .getByRole("link", { name: "Verify email (mock link)" })
    .getAttribute("href");
  await page.goto(new URL(href, BASE).toString());
  await page.getByRole("button", { name: "Confirm email verification" }).click();
  await page.getByText("Email verified").waitFor();
}

async function signIn(page, email) {
  await page.goto(`${BASE}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/home");
}

async function createActiveChallenge(page, name) {
  await page.goto(`${BASE}/challenge/new`);
  await page.getByLabel("Challenge name").fill(name);
  await page.getByLabel("Description").fill("Tabs UX walkthrough");
  await page.getByRole("button", { name: "Continue" }).click();

  const start = new Date();
  // Today → Active now (M2)
  const startYmd = start.toISOString().slice(0, 10);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 60);
  await page.getByLabel("Start date").fill(startYmd);
  await page.getByLabel("End date").fill(end.toISOString().slice(0, 10));
  await page.getByLabel("Currency").selectOption("GBP");
  await page.getByLabel("Time zone").selectOption("Europe/London");
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: "Create challenge" }).click();
  await page.waitForURL(/\/challenge\/[a-f0-9-]+/);
  return page.url();
}

const ownerCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const owner = await ownerCtx.newPage();

await signUpAndVerify(owner, { displayName: "Tabs Owner", email: ownerEmail });
await signIn(owner, ownerEmail);
const challengeUrl = await createActiveChallenge(owner, "Tabs UX Challenge");
const challengeId = new URL(challengeUrl).pathname.split("/").pop();
notes.push({ challengeId, challengeUrl });

// Owner: Overview default with tabs
await owner.goto(`${BASE}/challenge/${challengeId}`);
await owner.getByRole("navigation", { name: "Challenge sections" }).waitFor();
await owner.getByRole("link", { name: "Overview", exact: true }).waitFor();
await shot(owner, "01-owner-overview-mobile.png");

// Owner: People tab (invite tools)
await openTab(owner, "People");
await owner.waitForURL(/\?tab=people/);
await owner.getByRole("heading", { name: "Invite links" }).waitFor();
await shot(owner, "02-owner-people-mobile.png");

// Create invite for member
await owner.getByRole("button", { name: "Create invite link" }).click();
await owner.getByText("Share this invite link").waitFor();
const invitePath = await owner.locator("p.break-all").first().innerText();
const inviteMatch = invitePath.match(/\/invite\/[^\s]+/);
const resolvedInvite = inviteMatch ? `${BASE}${inviteMatch[0]}` : null;
notes.push({ invitePath, resolvedInvite });
if (!resolvedInvite) throw new Error(`Could not parse invite path: ${invitePath}`);

// Home dashboard CTA without savings
await owner.goto(`${BASE}/home`);
await owner.getByRole("link", { name: "Set up savings." }).waitFor();
await shot(owner, "03-dashboard-setup-cta.png");

// Deep-link to Savings form
await owner.getByRole("link", { name: "Set up savings." }).click();
await owner.waitForURL(/\?tab=savings/);
await owner.locator("#setup").waitFor();
await owner.getByLabel(/Personal savings target/i).waitFor();
const focused = await owner.evaluate(() => document.activeElement?.id || "");
notes.push({ focusedAfterSetupDeepLink: focused });
await shot(owner, "04-savings-setup-deeplink.png");

// Activate savings as owner
await owner.fill('input[name="targetMajor"]', "2000");
await owner.fill('input[name="weeklyCommitmentMajor"]', "50");
await owner.getByRole("button", { name: /Activate savings/i }).click();
await owner.getByText(/Your savings setup/i).waitFor({ timeout: 15000 });

// URL Back: Overview ← Savings
await owner.goto(`${BASE}/challenge/${challengeId}?tab=savings`);
await openTab(owner, "Overview");
await owner.waitForURL((url) => !url.searchParams.has("tab") || url.searchParams.get("tab") === "overview");
await owner.goBack();
await owner.waitForURL(/\?tab=savings/);
await shot(owner, "05-owner-savings-after-back.png");

// Member flow
const memberCtx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const member = await memberCtx.newPage();
await signUpAndVerify(member, { displayName: "Tabs Member", email: memberEmail });
await signIn(member, memberEmail);

// Join via invite — parse token from owner's invite flash
let joinUrl = resolvedInvite;
if (!joinUrl) {
  // Fallback: scrape invitations from owner again
  await owner.goto(`${BASE}/challenge/${challengeId}?tab=people`);
  await owner.getByRole("button", { name: "Create invite link" }).click();
  await owner.getByText("Share this invite link").waitFor();
  const again = await owner.locator("p.break-all").first().innerText();
  joinUrl = again.startsWith("http") ? again : `${BASE}${again.slice(again.indexOf("/invite/"))}`;
}
notes.push({ joinUrl });

await member.goto(joinUrl);
await member.getByRole("link", { name: "Continue to join disclosure" }).click();
await member.waitForURL("**/invite/**/join");
await member.getByRole("checkbox").check();
await member.getByRole("button", { name: "Continue to request join" }).click();
await member.waitForURL(/status|pending|challenge/i, { timeout: 15000 });

// Owner approves pending
await owner.goto(`${BASE}/challenge/${challengeId}?tab=people`);
const approve = owner.getByRole("button", { name: "Approve" }).first();
if (await approve.count()) {
  await approve.click();
  await owner.waitForTimeout(800);
}

await member.goto(`${BASE}/home`);
await member.getByRole("link", { name: "Set up savings." }).waitFor({ timeout: 15000 });
await shot(member, "06-member-dashboard-setup-cta.png");
await member.getByRole("link", { name: "Set up savings." }).click();
await member.waitForURL(/\?tab=savings/);
await member.locator("#setup").waitFor();
await shot(member, "07-member-savings-tab.png");

await openTab(member, "People");
await member.waitForURL(/\?tab=people/);
// Member must not see invite creation
const inviteHeading = member.getByRole("heading", { name: "Invite links" });
const memberSeesInvites = (await inviteHeading.count()) > 0;
notes.push({ memberSeesInvites });
await shot(member, "08-member-people-tab.png");

await browser.close();

writeFileSync(
  join(ROOT, ".data", "m11-challenge-tabs-evidence.json"),
  JSON.stringify({ shots, notes, ownerEmail, memberEmail, mode: "mock", base: BASE }, null, 2),
);
copyFileSync(
  join(ROOT, ".data", "m11-challenge-tabs-evidence.json"),
  join(storeMedia, "evidence.json"),
);
console.log("TABS EVIDENCE OK", shots.length, "memberSeesInvites=", memberSeesInvites);
if (memberSeesInvites) {
  process.exitCode = 1;
  console.error("FAIL: member saw owner invite tools");
}
