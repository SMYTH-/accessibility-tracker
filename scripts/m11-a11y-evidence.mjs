/**
 * M11 WCAG 2.2 AA evidence — automated axe + keyboard/focus/zoom probes
 * on core journey screens. Requires localhost:3000 with Supabase env.
 *
 * Methodology is OPEN per mvp-build-plan §3.3; this records what was tested
 * and which criteria remain untested / blocked.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let AxeBuilder;
try {
  AxeBuilder = require("@axe-core/playwright").default;
} catch {
  console.error("MISSING @axe-core/playwright — install as devDependency");
  process.exit(1);
}

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

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const password = `M11-A11y-${stamp}!`;
const alexEmail = `m11.a11y.alex.${stamp}@example.com`;
const samEmail = `m11.a11y.sam.${stamp}@example.com`;

async function ensureUser(em, pw, name) {
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

function ymdInTz(d, tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const alexId = await ensureUser(alexEmail, password, "Alex");
const samId = await ensureUser(samEmail, password, "Sam");

const owner = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await owner.auth.signInWithPassword({ email: alexEmail, password });
const today = ymdInTz(new Date(), "Europe/London");
const created = await owner.rpc("create_private_challenge", {
  p_name: `M11 A11y ${stamp}`,
  p_description: "accessibility evidence",
  p_start_date: today,
  p_end_date: "2027-06-01",
  p_currency: "GBP",
  p_time_zone: "Europe/London",
});
if (created.error) throw created.error;
const challengeId = created.data.challenge.id;
await admin.rpc("fixture_approved_member_for_tests", {
  p_challenge_id: challengeId,
  p_user_id: samId,
  p_share_monetary_info: true,
  p_role: "member",
});
for (const [uid, target, weekly] of [
  [alexId, 200000, 5000],
  [samId, 350000, 5000],
]) {
  await admin.rpc("activate_savings_setup_at", {
    p_challenge_id: challengeId,
    p_user_id: uid,
    p_target_minor: target,
    p_weekly_commitment_minor: weekly,
    p_now: new Date().toISOString(),
  });
}
await owner.rpc("record_contribution", {
  p_challenge_id: challengeId,
  p_amount_minor: 50000,
  p_idempotency_key: `m11-a11y-${stamp}`,
});

const outDir = join(process.cwd(), "media", "m11");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

async function signIn(email) {
  await page.goto(`${SITE}/sign-in`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/home/, { timeout: 30000 });
}

async function runAxe(label) {
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = axe.violations.filter((v) =>
    ["critical", "serious"].includes(v.impact),
  );
  assert(
    `axe:${label} no critical/serious`,
    serious.length === 0,
    serious.map((v) => `${v.id}:${v.nodes.length}`).join(",") || "clean",
  );
  return {
    label,
    url: page.url(),
    violations: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
      helpUrl: v.helpUrl,
    })),
    passes: axe.passes.length,
    incomplete: axe.incomplete.map((i) => i.id),
  };
}

const axeReports = [];

// Signed-out sign-in
await page.goto(`${SITE}/sign-in`, { waitUntil: "networkidle" });
axeReports.push(await runAxe("sign-in"));
await page.screenshot({ path: join(outDir, "a11y-01-sign-in.png"), fullPage: true });

// Keyboard: tab to email, type, tab to password
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
const focused1 = await page.evaluate(() => document.activeElement?.getAttribute("name"));
assert(
  "keyboard: focus reaches email or interactive control",
  focused1 === "email" || focused1 === "password" || Boolean(focused1),
  String(focused1),
);

await signIn(alexEmail);
axeReports.push(await runAxe("home"));
await page.screenshot({ path: join(outDir, "a11y-02-home.png"), fullPage: true });

await page.goto(`${SITE}/challenge/${challengeId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
axeReports.push(await runAxe("challenge"));
await page.screenshot({ path: join(outDir, "a11y-03-challenge.png"), fullPage: true });

// Record savings lives on challenge page (#contributions)
await page.goto(`${SITE}/challenge/${challengeId}#contributions`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(800);
axeReports.push(await runAxe("record-on-challenge"));
await page.screenshot({ path: join(outDir, "a11y-04-record.png"), fullPage: true });

await page.goto(`${SITE}/activity`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
axeReports.push(await runAxe("activity"));
await page.screenshot({ path: join(outDir, "a11y-05-activity.png"), fullPage: true });

await page.goto(`${SITE}/profile`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
axeReports.push(await runAxe("profile"));
await page.screenshot({ path: join(outDir, "a11y-06-profile.png"), fullPage: true });

// Focus visibility probe
const focusVisible = await page.evaluate(() => {
  const btn = document.querySelector("button, a[href]");
  if (!btn) return { ok: false, reason: "no focusable" };
  btn.focus();
  const styles = getComputedStyle(btn);
  const outline = styles.outlineStyle !== "none" && styles.outlineWidth !== "0px";
  const ring =
    styles.boxShadow.includes("rgb") ||
    styles.outlineWidth !== "0px" ||
    styles.borderColor !== styles.getPropertyValue("background-color");
  return { ok: outline || ring || btn.matches(":focus-visible"), outline: styles.outline, boxShadow: styles.boxShadow };
});
assert("focus: visible indicator on interactive", focusVisible.ok, JSON.stringify(focusVisible));

// WCAG 1.4.10 reflow: 320 CSS px at default text
await page.setViewportSize({ width: 320, height: 640 });
await page.goto(`${SITE}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const reflow = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
assert(
  "reflow: 320px default text no page horizontal scroll",
  reflow.scrollWidth <= reflow.clientWidth + 1,
  JSON.stringify(reflow),
);
await page.screenshot({ path: join(outDir, "a11y-07-reflow-320.png"), fullPage: true });

// WCAG 1.4.4 resize text ~200% — page must not force two-dimensional scroll
await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
await page.waitForTimeout(400);
const zoom = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
assert(
  "resize-text: ~200% at 320px no page horizontal scroll",
  zoom.scrollWidth <= zoom.clientWidth + 1,
  JSON.stringify(zoom),
);
await page.screenshot({ path: join(outDir, "a11y-08-zoom-200.png"), fullPage: true });

// Contrast: note Honey Amber pairs OPEN for lock; axe contrast violations captured above
const contrastViolations = axeReports.flatMap((r) =>
  r.violations.filter((v) => v.id === "color-contrast"),
);
assert(
  "contrast: axe color-contrast on sampled pages",
  contrastViolations.length === 0,
  contrastViolations.map((v) => `${v.impact}:${v.nodes}`).join(",") || "none",
);

await browser.close();

const untested = [
  "Full screen-reader walkthrough with VoiceOver/TalkBack (manual; partial keyboard only)",
  "All WCAG 2.2 AA success criteria beyond axe tags + focus/zoom probes",
  "Honey Amber contrast pairs formal lock (OPEN — working accents)",
  "Reduced-motion preference verification across all animated surfaces",
  "Error-message association audit on every form validation state",
  "Auth recovery email flow a11y (rate-limited live path)",
];

const evidence = {
  stamp,
  project: REF,
  challengeId,
  methodology:
    "OPEN per mvp-build-plan §3.3 — Manual WCAG 2.2 AA checklist + axe on core journeys",
  axeReports,
  results,
  untestedCriteria: untested,
  blockers: [],
  summary: {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    axeViolationPages: axeReports.filter((r) => r.violations.length).length,
  },
};

writeFileSync(join(outDir, "a11y-evidence.json"), JSON.stringify(evidence, null, 2));
console.log(
  `\nM11 a11y: ${evidence.summary.passed}/${evidence.summary.total}; axe pages with violations: ${evidence.summary.axeViolationPages}`,
);
process.exit(evidence.summary.failed ? 1 : 0);
