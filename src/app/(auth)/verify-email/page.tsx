import { AuthCard } from "@/components/AuthCard";
import { VerifyEmailPanel } from "@/components/AuthForms";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Verify email" subtitle="Confirm your address to unlock sign-in.">
      <VerifyEmailPanel token={token} />
    </AuthCard>
  );
}
