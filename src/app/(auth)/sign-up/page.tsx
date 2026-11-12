import { AuthCard } from "@/components/AuthCard";
import { SignUpForm } from "@/components/AuthForms";

export default function SignUpPage() {
  return (
    <AuthCard title="Create account" subtitle="Register with email, then verify before sign-in.">
      <SignUpForm />
    </AuthCard>
  );
}
