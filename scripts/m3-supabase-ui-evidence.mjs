/**
 * M3 UI evidence with Playwright against local Next + real Supabase.
 * Requires: npm run dev on :3000, .env.local, service role.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.M3_BASE_URL || "http://localhost:3000";
const REF = "gdrkejobqlvtwnlaedpu";

if (!url?.includes(REF) || !anon || !service) {
  console.error("MISSING_ENV_OR_WRONG_PROJECT");
  process.exit(1);
}

const mediaDir = join(process.cwd(), "media", "m3");
mkdirSync(mediaDir, { recursive: true });

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

const stamp = Date.now();
const ownerEmail = `m3.ui.owner.${stamp}@example.com`;
const inviteeEmail = `m3.ui.invitee.${stamp}@example.com`;
const password = `M3-UI-${stamp}!`;
await ensureUser(ownerEmail, password, "UI Owner");
await ensureUser(inviteeEmail, password, "UI Invitee");

const owner = client();
await owner.auth.signInWithPassword({ email: ownerEmail, password });
const start = new Date();
start.setUTCDate(start.getUTCDate() + 30);
const end = new Date(start);
end.setUTCDate(end.getUTCDate() + 60);
const created = await owner.rpc("create_private_challenge", {
  p_name: "Portugal UI M3",
  p_description: "Invite preview has no amounts",
  p_start_date: start.toISOString().slice(0, 10),
  p_end_date: end.toISOString().slice(0, 10),
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (created.error) throw created.error;
const challengeId = created.data.challenge.id;
const invite = await owner.rpc("create_challenge_invitation", {
  p_challenge_id: challengeId,
  p_expires_in_days: 7,
});
if (invite.error) throw invite.error;
const token = invite.data.token;

const browser = await chromium.launch({ headless: true });
const shots = [];

async function shot(page, name) {
  const path = join(mediaDir, name);
  await page.screenshot({ path, fullPage: true });
  shots.push(path);
  console.log("SHOT", path);
}

// Invitee: signed-out preview
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.goto(`${BASE}/invite/${token}`, { waitUntil: "networkidle" });
await page.getByText("Portugal UI M3").waitFor();
await page.getByText("Participants").waitFor();
await shot(page, "01-invite-preview-signed-out.png");

await page.getByRole("link", { name: /Sign in to continue/i }).click();
await page.waitForURL(/sign-in/);
await shot(page, "02-sign-in-preserves-next.png");

await page.fill('input[name="email"]', inviteeEmail);
await page.fill('input[name="password"]', password);
await page.getByRole("button", { name: /Sign in/i }).click();
await page.waitForURL(new RegExp(`/invite/${token}/join`));
await page.getByText(/Before you join/i).waitFor();
await shot(page, "03-disclosure-before-join.png");

const continueBtn = page.getByRole("button", { name: /Continue to request join/i });
if (await continueBtn.isEnabled()) throw new Error("Continue should be disabled before ack");
await page.getByRole("checkbox").check();
await continueBtn.click();
await page.waitForURL(new RegExp(`/invite/${token}/status`));
await page.getByText(/Waiting for approval/i).waitFor();
await shot(page, "04-pending-no-financials.png");

// Owner approve in API then invitee opens challenge
const adminDecide = client();
await adminDecide.auth.signInWithPassword({ email: ownerEmail, password });
const pending = await adminDecide.rpc("list_challenge_membership_admin", {
  p_challenge_id: challengeId,
});
const pendingRow = (pending.data || []).find((m) => m.status === "pending");
const decided = await adminDecide.rpc("decide_membership_request", {
  p_membership_id: pendingRow.id,
  p_decision: "approve",
});
if (decided.error) throw decided.error;

await page.goto(`${BASE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.getByText(/Portugal UI M3/i).waitFor();
await shot(page, "05-approved-overview-savings-inactive.png");

// Owner session: invite panel
const ownerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const ownerPage = await ownerCtx.newPage();
await ownerPage.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
await ownerPage.fill('input[name="email"]', ownerEmail);
await ownerPage.fill('input[name="password"]', password);
await ownerPage.getByRole("button", { name: /Sign in/i }).click();
await ownerPage.waitForURL(/home/);
await ownerPage.goto(`${BASE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await ownerPage.getByText(/Invite links/i).waitFor();
await shot(ownerPage, "06-owner-invite-panel.png");

await browser.close();

writeFileSync(
  join(process.cwd(), ".data", "m3-supabase-ui-evidence.json"),
  JSON.stringify({ stamp, challengeId, token, shots, base: BASE }, null, 2),
);
console.log("M3 UI evidence complete");
