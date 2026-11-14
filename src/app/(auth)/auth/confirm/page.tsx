import { AuthCard } from "@/components/AuthCard";
import { AuthHashHandler } from "@/components/AuthHashHandler";

/**
 * Client handoff for Supabase implicit/hash redirects.
 * /auth/callback cannot read `#access_token=…`; it redirects here so the
 * browser can establish the session (or show a clear verified / error state).
 */
export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/home";

  return (
    <AuthCard
      title="Confirming…"
      subtitle="Finishing email confirmation. You will be redirected in a moment."
    >
      <AuthHashHandler nextPath={nextPath} mode="confirm" />
    </AuthCard>
  );
}
