import { AuthCard } from "@/components/AuthCard";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import { SignInForm } from "@/components/AuthForms";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; verified?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/home";
  const verified = params.verified === "1" || params.verified === "true";
  const callbackError = params.error === "auth_callback";

  return (
    <AuthCard title="Sign in" subtitle="Access your challenges after email verification.">
      <div className="space-y-4">
        {/* Recover hash if a confirmation link still lands here with tokens. */}
        <AuthHashHandler nextPath={nextPath} mode="sign-in" />
        {verified ? (
          <div
            className="rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--ink)]"
            role="status"
          >
            Email verified. Sign in to continue.
          </div>
        ) : null}
        {callbackError && !verified ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
            role="status"
          >
            This authentication link is invalid or expired. Request a new email and try
            again.
          </div>
        ) : null}
        <SignInForm nextPath={nextPath} />
      </div>
    </AuthCard>
  );
}
