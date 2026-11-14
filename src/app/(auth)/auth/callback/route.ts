import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";

/** Only allow same-origin relative paths (open-redirect guard). */
function safeNextPath(raw: string | null): string {
  if (!raw) return "/home";
  let value = raw;
  try {
    // Tolerate once- or twice-encoded values from email redirect_to wrapping.
    value = decodeURIComponent(value);
    if (value.includes("%")) value = decodeURIComponent(value);
  } catch {
    /* keep raw */
  }
  if (!value.startsWith("/") || value.startsWith("//")) return "/home";
  return value;
}

function logCallbackError(message: string) {
  try {
    const dir = join(process.cwd(), ".data");
    mkdirSync(dir, { recursive: true });
    appendFileSync(
      join(dir, "auth-callback.log"),
      `${new Date().toISOString()} ${message}\n`,
    );
  } catch {
    /* best-effort local diagnosis only */
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (getAuthMode() === "mock") {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    logCallbackError("missing_supabase_env");
    return NextResponse.redirect(`${origin}/sign-in?error=auth_callback`);
  }

  // Build redirect first so PKCE/session cookies are attached to THIS response
  // (cookieStore.set alone is unreliable for Route Handler exchanges).
  const successRedirect = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          successRedirect.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return successRedirect;
    }
    logCallbackError(`exchange_failed:${error.message}`);
    return NextResponse.redirect(`${origin}/sign-in?error=auth_callback`);
  }

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (!error) {
      return successRedirect;
    }
    logCallbackError(`verify_otp_failed:${error.message}`);
    return NextResponse.redirect(`${origin}/sign-in?error=auth_callback`);
  }

  // No query tokens — Supabase may have put the session in the URL hash
  // (`#access_token=…&type=signup`). The server never sees that fragment;
  // hand off to a client page (browser preserves the hash across this redirect).
  logCallbackError("missing_code_and_token_hash_handoff_confirm");
  const confirm = new URL(`${origin}/auth/confirm`);
  if (next !== "/home") confirm.searchParams.set("next", next);
  return NextResponse.redirect(confirm);
}
