import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/supabase/server";
import { getAuthMode } from "@/lib/auth/config";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

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
