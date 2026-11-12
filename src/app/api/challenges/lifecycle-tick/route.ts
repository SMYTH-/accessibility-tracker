import { NextResponse } from "next/server";
import { reconcileAllChallenges } from "@/lib/challenge/service";

/**
 * Manual / scheduled tick to apply midnight transitions in each challenge TZ.
 * Reads also reconcile; this endpoint exists for explicit cron-style runs.
 */
export async function POST() {
  const result = await reconcileAllChallenges();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  const result = await reconcileAllChallenges();
  return NextResponse.json({ ok: true, ...result });
}
