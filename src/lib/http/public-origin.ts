import type { NextRequest } from "next/server";

/**
 * Public site origin for absolute redirects behind Railway/proxy.
 *
 * `request.url` / bind address can be `http://localhost:$PORT` (Railway uses
 * 8080). Prefer `NEXT_PUBLIC_SITE_URL`, then forwarded host headers.
 */
export function publicOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  if (host && !/^localhost\b/i.test(host) && !/^127\./.test(host)) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}
