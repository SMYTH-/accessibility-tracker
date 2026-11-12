import { AuthCard } from "@/components/AuthCard";
import { SignUpForm } from "@/components/AuthForms";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : undefined;

  return (
    <AuthCard title="Create account" subtitle="Register with email, then verify before sign-in.">
      <SignUpForm nextPath={nextPath} />
    </AuthCard>
  );
}
