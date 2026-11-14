import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { RecoveryPasswordPanel } from "@/components/RecoveryPasswordPanel";
import { getAuthMode } from "@/lib/auth/config";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; code?: string }>;
}) {
  const { token, code } = await searchParams;

  // Safety net: old recovery emails that pointed at /update-password?code=…
  // must still exchange via the callback before the form can update the password.
  if (code && getAuthMode() === "supabase") {
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent("/update-password")}`,
    );
  }

  const mode = getAuthMode();
  const subtitle =
    mode === "mock"
      ? "Use the recovery link from mock mode (token in the URL)."
      : "Recovery session from your reset email — choose a new password, then sign in again.";

  return (
    <AuthCard title="Choose a new password" subtitle={subtitle}>
      <RecoveryPasswordPanel mockToken={mode === "mock" ? token : undefined} />
    </AuthCard>
  );
}
