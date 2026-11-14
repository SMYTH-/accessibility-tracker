import { AuthCard } from "@/components/AuthCard";
import { ResetPasswordForm } from "@/components/AuthForms";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      subtitle="Recovery links are time-limited (1 hour in mock / provider policy in Supabase)."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
