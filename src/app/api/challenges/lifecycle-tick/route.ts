import { NextResponse } from "next/server";
import { getAuthMode } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { createClient } from "@/lib/auth/supabase/server";
import { pgReconcile } from "@/lib/challenge/postgres";
import { reconcileAllChallenges } from "@/lib/challenge/service";

/**
 * Manual / scheduled tick to apply midnight transitions in each challenge TZ.
 * Reads also reconcile; this endpoint exists for explicit cron-style runs.
 */
async function run() {
  if (getAuthMode() === "supabase") {
    try {
      const admin = createAdminClient();
      return await pgReconcile(admin);
    } catch {
      const supabase = await createClient();
      return await pgReconcile(supabase);
    }
  }
  return reconcileAllChallenges();
}

export async function POST() {
  const result = await run();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  const result = await run();
  return NextResponse.json({ ok: true, ...result });
}
