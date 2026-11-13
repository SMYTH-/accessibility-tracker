import { NextResponse } from "next/server";
import { pgTickDeletionGrace } from "@/lib/account/postgres";
import { getAuthMode } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { createClient } from "@/lib/auth/supabase/server";
import { pgReconcile } from "@/lib/challenge/postgres";
import { reconcileAllChallenges } from "@/lib/challenge/service";

/**
 * Manual / scheduled tick to apply midnight transitions in each challenge TZ
 * and finalise expired account-deletion grace windows (Option A).
 */
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

export async function POST() {
  const result = await run();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  const result = await run();
  return NextResponse.json({ ok: true, ...result });
}
