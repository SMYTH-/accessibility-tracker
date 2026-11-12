import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/supabase/server";
import { getAuthMode } from "@/lib/auth/config";

/** Only allow same-origin relative paths (open-redirect guard). */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/home";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (getAuthMode() === "mock") {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback`);
}
