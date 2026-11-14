import { NextRequest, NextResponse } from "next/server";
import { pgTickDeletionGrace } from "@/lib/account/postgres";
import { getAuthMode } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { createClient } from "@/lib/auth/supabase/server";
import { pgReconcile } from "@/lib/challenge/postgres";
import { reconcileAllChallenges } from "@/lib/challenge/service";

/**
 * Manual / scheduled tick to apply midnight transitions in each challenge TZ
 * and finalise expired account-deletion grace windows (Option A).
 *
 * Requires `LIFECYCLE_TICK_SECRET` (Bearer or `x-lifecycle-tick-secret`).
 * Unauthenticated callers receive 401 — must not run service_role work publicly.
 */
function authorizeTick(request: NextRequest): boolean {
  const expected = process.env.LIFECYCLE_TICK_SECRET?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : null;
  const alt = request.headers.get("x-lifecycle-tick-secret")?.trim() ?? null;
  const provided = bearer || alt;
  if (!provided || provided.length !== expected.length) return false;
  // Constant-time-ish compare for equal-length secrets
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

async function run() {
  if (getAuthMode() === "supabase") {
    try {
      const admin = createAdminClient();
      const lifecycle = await pgReconcile(admin);
      const deletion = await pgTickDeletionGrace(admin);
      return { ...lifecycle, deletion };
    } catch {
      const supabase = await createClient();
      const lifecycle = await pgReconcile(supabase);
      return { ...lifecycle, deletion: { finalised: 0, skipped: 0, errors: 0 } };
    }
  }
  return reconcileAllChallenges();
}

async function handle(request: NextRequest) {
  if (!authorizeTick(request)) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED_LIFECYCLE_TICK" },
      { status: 401 },
    );
  }
  const result = await run();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
