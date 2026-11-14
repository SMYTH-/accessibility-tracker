import { NextResponse } from "next/server";

/** Railway healthcheck — must return HTTP 200 without redirect. */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
