import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { UpdatePasswordForm } from "@/components/AuthForms";
import { getAuthMode } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/session";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; code?: string }>;
}) {
  const { token, code } = await searchParams;

  // Safety net: old recovery emails that pointed at /update-password?code=…
  // must still exchange via the callback before the form can update the password.
  if (code && getAuthMode() === "supabase") {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent("/update-password")}`);
  }

  const mode = getAuthMode();
  const user = mode === "supabase" ? await getCurrentUser() : null;
  const subtitle =
    mode === "mock"
      ? "Use the recovery link from mock mode (token in the URL)."
      : user
        ? "Recovery session active — choose a new password, then sign in again."
        : "Open the recovery link from your email in a signed-out browser (exchanges via /auth/callback).";

  return (
    <AuthCard title="Choose a new password" subtitle={subtitle}>
      {mode === "supabase" && !user ? (
        <p className="text-sm text-[var(--mute)]" role="status">
          No recovery session yet. Use the link in the password-reset email (it should land on{" "}
          <code className="text-[var(--ink)]">/auth/callback?next=/update-password</code>
          ).
        </p>
      ) : (
        <UpdatePasswordForm token={token} />
      )}
    </AuthCard>
  );
}
