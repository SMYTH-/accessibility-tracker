import { notFound } from "next/navigation";

/**
 * Design-preview fixture — local development only.
 *
 * Always 404 when `NODE_ENV === "production"` (private-beta / prod builds).
 * No env override. Available under `next dev` for Dom’s design comparison work.
 */
export default function WisePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return children;
}
