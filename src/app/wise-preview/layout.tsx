import { notFound } from "next/navigation";

/**
 * Design-preview fixture route — excluded from production / private-beta builds.
 *
 * Enable locally or in non-prod with ENABLE_WISE_PREVIEW=1.
 * Production (`NODE_ENV=production`) returns 404 unless that flag is set.
 */
export default function WisePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled =
    process.env.ENABLE_WISE_PREVIEW === "1" ||
    process.env.NEXT_PUBLIC_ENABLE_WISE_PREVIEW === "1";
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !enabled) {
    notFound();
  }

  return children;
}
