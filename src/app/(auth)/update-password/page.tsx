import { AuthCard } from "@/components/AuthCard";
import { UpdatePasswordForm } from "@/components/AuthForms";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Choose a new password" subtitle="Use the recovery link from your email (or mock token).">
      <UpdatePasswordForm token={token} />
    </AuthCard>
  );
}
