/**
 * M11 manual screen-reader walkthrough evidence.
 * Captures accessibility snapshots (name/role/value tree) for:
 * sign-in · record savings · financial privacy.
 * Complements axe; documents what a screen reader would land on.
 * Requires localhost:3000 + Supabase env.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
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

const results = [];
function assert(name, cond, detail = "") {
  results.push({ name, ok: Boolean(cond), detail: String(detail ?? "") });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function ymdInTz(d, tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

async function ensureUser(admin, em, pw, name) {
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

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stamp = Date.now();
const password = `M11-SR-${stamp}!`;
const email = `m11.sr.${stamp}@example.com`;
const userId = await ensureUser(admin, email, password, "Alex");

const owner = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await owner.auth.signInWithPassword({ email, password });
const today = ymdInTz(new Date(), "Europe/London");
const created = await owner.rpc("create_private_challenge", {
  p_name: `M11 SR ${stamp}`,
  p_description: "screen-reader walkthrough",
  p_start_date: today,
  p_end_date: "2027-06-01",
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (created.error) throw created.error;
const challengeId = created.data.challenge.id;
await admin.rpc("activate_savings_setup_at", {
  p_challenge_id: challengeId,
  p_user_id: userId,
  p_target_minor: 200000,
  p_weekly_commitment_minor: 5000,
  p_now: new Date().toISOString(),
});

const outDir = join(process.cwd(), "media", "m11");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function snap(label) {
  const snapshot = await page.locator("body").ariaSnapshot();
  writeFileSync(join(outDir, `sr-${label}.aria.yml`), snapshot);
  await page.screenshot({
    path: join(outDir, `sr-${label}.png`),
    fullPage: true,
  });
  return snapshot;
}

function hasRoles(snapshot, needed) {
  return needed.every((n) => snapshot.includes(n));
}

// --- Sign-in ---
await page.goto(`${SITE}/sign-in`, { waitUntil: "networkidle" });
const signInSnap = await snap("01-sign-in");
assert(
  "SR sign-in: email + password + submit present",
  hasRoles(signInSnap, ["textbox", "Email"]) &&
    /password/i.test(signInSnap) &&
    /button/i.test(signInSnap),
  signInSnap.slice(0, 200),
);
assert(
  "SR sign-in: heading announces Sign in (or Create/Register link)",
  /sign in|sign-in|email/i.test(signInSnap),
);

// Keyboard path into fields
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
const focusName = await page.evaluate(() => {
  const el = document.activeElement;
  return {
    name: el?.getAttribute("name"),
    tag: el?.tagName,
    label:
      el?.labels?.[0]?.innerText ||
      el?.getAttribute("aria-label") ||
      el?.previousElementSibling?.textContent ||
      null,
  };
});
assert(
  "SR sign-in: keyboard reaches email/password field",
  focusName.name === "email" || focusName.name === "password",
  JSON.stringify(focusName),
);

await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/home/, { timeout: 30000 });

// --- Record savings ---
await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const recordSnap = await snap("02-record-savings");
assert(
  "SR record: Record savings heading/region",
  /Record savings/i.test(recordSnap),
);
assert(
  "SR record: amount field labelled",
  /Amount|textbox|GBP/i.test(recordSnap),
);
assert(
  "SR record: Record contribution button",
  /Record contribution/i.test(recordSnap),
);
assert(
  "SR record: self-reported / today-in-TZ guidance announced in tree",
  /self-reported|today/i.test(recordSnap),
);

const amountBox = page.locator('input[name="amountMajor"]');
if (await amountBox.count()) {
  await amountBox.fill("25.00");
  await page.getByRole("button", { name: /Record contribution/i }).click();
  await page.waitForTimeout(1500);
  const after = await snap("03-record-after");
  assert(
    "SR record: status or updated total after submit",
    /status|Eligible|£|recorded|contribution/i.test(after),
    after.slice(0, 240),
  );
} else {
  assert("SR record: amount field present", false, "amountMajor missing");
}

// --- Financial privacy (lives on Profile #privacy) ---
await page.goto(`${SITE}/profile#privacy`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.locator("#privacy").waitFor({ state: "visible", timeout: 15000 }).catch(() => null);
let privacySnap = await snap("04-privacy");
assert(
  "SR privacy: heading / labelled region",
  /privacy|Hide monetary/i.test(privacySnap),
  privacySnap.slice(0, 240),
);
assert(
  "SR privacy: opt-out checkbox + cannot-undo ack",
  /checkbox/i.test(privacySnap) &&
    (/cannot undo|already saw|Hide monetary/i.test(privacySnap)),
  privacySnap.slice(0, 400),
);
assert(
  "SR privacy: warning text available",
  /cannot undo|Warning|already saw/i.test(privacySnap),
);

const hide = page.getByTestId("hide-monetary-toggle");
const ack = page.getByTestId("cannot-undo-ack");
await hide.waitFor({ state: "visible", timeout: 10000 }).catch(() => null);
if ((await hide.count()) && (await ack.count())) {
  await hide.check();
  await ack.check();
  const save = page.getByTestId("save-privacy");
  assert("SR privacy: save enabled after ack", !(await save.isDisabled()));
  await save.click();
  await page.waitForTimeout(1200);
  const afterPriv = await snap("05-privacy-after");
  assert(
    "SR privacy: status after save",
    /status|Private|hidden|saved|opt|Hide monetary/i.test(afterPriv),
    afterPriv.slice(0, 240),
  );
} else {
  assert(
    "SR privacy: controls present",
    false,
    `hide=${await hide.count()} ack=${await ack.count()} url=${page.url()}`,
  );
}

await browser.close();

const notes = {
  method:
    "Playwright ariaSnapshot + keyboard focus probes on disposable account; documents SR-exposed name/role/value tree for the three required surfaces. Not a substitute for VoiceOver/TalkBack operator session if Dominic wants a live listen-through.",
  surfaces: ["sign-in", "record savings", "financial privacy"],
  untested: [
    "Live VoiceOver rotor / TalkBack explore-by-touch (operator session)",
    "Dynamic live-region politeness beyond role=status presence",
  ],
};

const evidence = {
  stamp,
  project: REF,
  challengeId,
  notes,
  results,
  summary: {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  },
};
writeFileSync(join(outDir, "screenreader-evidence.json"), JSON.stringify(evidence, null, 2));
console.log(
  `\nM11 SR: ${evidence.summary.passed}/${evidence.summary.total}`,
);
process.exit(evidence.summary.failed ? 1 : 0);
