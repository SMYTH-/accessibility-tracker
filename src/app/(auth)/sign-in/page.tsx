import { AuthCard } from "@/components/AuthCard";
import { SignInForm } from "@/components/AuthForms";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/home";

  return (
    <AuthCard title="Sign in" subtitle="Access your challenges after email verification.">
      <SignInForm nextPath={nextPath} />
    </AuthCard>
  );
}
