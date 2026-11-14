import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/home", "/challenge", "/activity", "/profile"];
const AUTH_PAGES = ["/sign-in", "/sign-up", "/reset-password", "/verify-email"];

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
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (isAuthPage && session && pathname !== "/verify-email") {
      const url = request.nextUrl.clone();
      url.pathname = nextFromQuery || "/home";
      url.search = "";
      return NextResponse.redirect(url);
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

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user && pathname !== "/verify-email") {
    const url = request.nextUrl.clone();
    url.pathname = nextFromQuery || "/home";
    url.search = "";
    return NextResponse.redirect(url);
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
