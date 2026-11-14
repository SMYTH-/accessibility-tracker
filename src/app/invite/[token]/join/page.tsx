import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { JoinDisclosureForm } from "@/components/JoinDisclosureForm";
import { getCurrentUser } from "@/lib/auth/session";
import { getInvitationPreview, getOwnMembership } from "@/lib/membership/service";

export default async function InviteJoinDisclosurePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}/join`)}`);
  }

  const previewResult = await getInvitationPreview(token);
  if (!previewResult.ok) {
    return (
      <AuthCard title="Before you join" subtitle="Invitation unavailable">
        <p className="text-sm text-[var(--mute)]">{previewResult.error}</p>
        <Link href={`/invite/${token}`} className="mt-4 inline-block text-sm font-semibold text-[var(--accent)] underline">
          Back
        </Link>
      </AuthCard>
    );
  }

  const { preview } = previewResult;
  const mem = await getOwnMembership(preview.challengeId, user.id);
  if (mem?.status === "approved") {
    redirect(`/challenge/${preview.challengeId}`);
  }
  if (mem?.status === "pending") {
    redirect(`/invite/${token}/status`);
  }

  return (
    <AuthCard title="Before you join" subtitle={preview.name}>
      <p className="mb-4 text-sm text-[var(--mute)]">
        Invite preview showed name, description, dates, and participant count only — no amounts.
        Financial privacy disclosure comes <strong className="font-semibold text-[var(--ink)]">before</strong>{" "}
        requesting to join.
      </p>
      <JoinDisclosureForm token={token} challengeName={preview.name} />
      <Link
        href={`/invite/${token}`}
        className="at-btn-secondary mt-3 w-full"
      >
        Cancel
      </Link>
    </AuthCard>
  );
}
