/**
 * One-shot local setup for M1 live auth against the linked non-prod project.
 * Writes .env.local and patches Auth URL settings. Does not print secrets.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const REF = "gdrkejobqlvtwnlaedpu";
const ROOT = "/Users/dom.smyth/Local Sites/accessibility-tracker";

function getCliToken() {
  return execFileSync(
    "security",
    ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"],
    { encoding: "utf8" },
  ).trim();
}

async function patchAuth(token) {
  const payload = {
    site_url: "http://localhost:3000",
    uri_allow_list: [
      "http://localhost:3000/**",
      "http://localhost:3000/auth/callback",
      "http://localhost:3000/auth/callback?next=/update-password",
    ].join(","),
    mailer_autoconfirm: false,
    external_email_enabled: true,
  };

  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    let msg = `status=${res.status}`;
    try {
      const j = JSON.parse(bodyText);
      msg += ` message=${j.message || j.error || Object.keys(j).join(",")}`;
    } catch {
      msg += ` len=${bodyText.length}`;
    }
    throw new Error(`AUTH_PATCH_FAILED ${msg}`);
  }

  const cfg = JSON.parse(bodyText);
  console.log("AUTH_PATCH_OK", res.status);
  console.log("site_url", cfg.site_url);
  console.log("mailer_autoconfirm", cfg.mailer_autoconfirm);
  console.log(
    "uri_allow_list_entries",
    String(cfg.uri_allow_list || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  console.log("external_email_enabled", cfg.external_email_enabled);
}

function writeEnvLocal() {
  const raw = execFileSync("supabase", ["projects", "api-keys", "--output-format", "json"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const keys = JSON.parse(raw).keys;
  const anon = keys.find((k) => k.name === "anon")?.api_key;
  if (!anon || !anon.startsWith("eyJ")) {
    throw new Error("anon key missing or unexpected shape");
  }

  const envPath = join(ROOT, ".env.local");
  writeFileSync(
    envPath,
    [
      `NEXT_PUBLIC_SUPABASE_URL=https://${REF}.supabase.co`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
      "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  const text = readFileSync(envPath, "utf8");
  console.log("ENV_LOCAL_WRITTEN", existsSync(envPath), "bytes", statSync(envPath).size);
  console.log("env_has_url", text.includes(`NEXT_PUBLIC_SUPABASE_URL=https://${REF}.supabase.co`));
  console.log("env_has_anon", text.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ"));
  console.log("env_has_site", text.includes("NEXT_PUBLIC_SITE_URL=http://localhost:3000"));
}

function patchConfigToml() {
  const p = join(ROOT, "supabase/config.toml");
  let text = readFileSync(p, "utf8");
  text = text.replace('site_url = "http://127.0.0.1:3000"', 'site_url = "http://localhost:3000"');
  text = text.replace(
    'additional_redirect_urls = ["https://127.0.0.1:3000"]',
    'additional_redirect_urls = ["http://localhost:3000/**", "http://localhost:3000/auth/callback", "http://localhost:3000/auth/callback?next=/update-password"]',
  );
  const marker =
    "# If enabled, users need to confirm their email address before signing in.\nenable_confirmations = false";
  if (!text.includes(marker)) {
    throw new Error("auth.email enable_confirmations marker not found");
  }
  text = text.replace(
    marker,
    "# If enabled, users need to confirm their email address before signing in.\nenable_confirmations = true",
  );
  writeFileSync(p, text);
  console.log("CONFIG_TOML_UPDATED");
}

const token = getCliToken();
await patchAuth(token);
writeEnvLocal();
patchConfigToml();
console.log("SETUP_DONE");
