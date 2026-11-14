import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/http/public-origin";

const PROTECTED_PREFIXES = ["/home", "/challenge", "/activity", "/profile"];
const AUTH_PAGES = ["/sign-in", "/sign-up", "/reset-password", "/verify-email"];

/** Absolute redirect that stays on the public Railway host (not localhost:$PORT). */
function redirectToPath(request: NextRequest, pathname: string, nextPath?: string | null) {
  const url = new URL(pathname, `${publicOrigin(request)}/`);
  if (nextPath) url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

function getAuthModeFromEnv(): "supabase" | "mock" {
  if (process.env.AUTH_MODE === "mock" || process.env.NEXT_PUBLIC_AUTH_MODE === "mock") {
    return "mock";
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) return "supabase";
  return "mock";
}

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  // /invite is public for preview; /invite/.../join and /status enforce auth in-page.
  const nextFromQuery = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (getAuthModeFromEnv() === "mock") {
    const session = request.cookies.get("at_mock_session")?.value;
    if (isProtected && !session) {
      return redirectToPath(request, "/sign-in", pathname);
    }
    if (isAuthPage && session && pathname !== "/verify-email") {
      return redirectToPath(request, nextFromQuery || "/home");
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Password recovery must keep the short-lived recovery session on
  // /update-password. Do not run access-denied / signOut here — a failed RPC
  // would clear the session and bounce Dom to sign-in before the form loads.
  if (pathname === "/update-password" || pathname.startsWith("/update-password/")) {
    return response;
  }

  let accessDenied = false;
  if (user) {
    const denied = await supabase.rpc("account_access_denied_for_me");
    accessDenied =
      Boolean(denied.data) ||
      Boolean(denied.error?.message?.includes("ACCOUNT_ACCESS_REVOKED"));
    if (accessDenied) {
      await supabase.auth.signOut();
    }
  }

  if (isProtected && (!user || accessDenied)) {
    return redirectToPath(request, "/sign-in", pathname);
  }

  if (isAuthPage && user && !accessDenied && pathname !== "/verify-email") {
    return redirectToPath(request, nextFromQuery || "/home");
  }

  return response;
}

export const config = {
  matcher: [
    "/home/:path*",
    "/challenge/:path*",
    "/activity/:path*",
    "/profile/:path*",
    "/sign-in",
    "/sign-up",
    "/reset-password",
    "/verify-email",
    "/update-password",
  ],
};
