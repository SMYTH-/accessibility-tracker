import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { getCurrentUser } from "@/lib/auth/session";
import { getInvitationPreview, getOwnMembership, getPendingAccessView } from "@/lib/membership/service";

export default async function InviteStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}/status`)}`);
  }

  const previewResult = await getInvitationPreview(token);
  // Token may still be valid; if not, fall back to membership wait preview via challenge id from membership.
  const challengeId: string | null = previewResult.ok ? previewResult.preview.challengeId : null;
  let previewName = previewResult.ok ? previewResult.preview.name : "Challenge";
  let previewDesc = previewResult.ok ? previewResult.preview.description : null;
  let startDate = previewResult.ok ? previewResult.preview.startDate : "";
  let endDate = previewResult.ok ? previewResult.preview.endDate : "";
  let count = previewResult.ok ? previewResult.preview.participantCount : 0;

  if (!challengeId) {
    // Cannot resolve without valid token and no challenge id — show generic error.
    return (
      <AuthCard title="Request status" subtitle="Unable to load invitation">
        <p className="text-sm text-[var(--mute)]">
          {previewResult.ok ? "Unexpected state." : previewResult.error}
        </p>
      </AuthCard>
    );
  }

  const membership = await getOwnMembership(challengeId, user.id);
  if (!membership) {
    redirect(`/invite/${token}/join`);
  }
  if (membership.status === "approved") {
    redirect(`/challenge/${challengeId}`);
  }

  const wait = await getPendingAccessView(challengeId, user.id);
  if (wait) {
    previewName = wait.preview.name;
    previewDesc = wait.preview.description;
    startDate = wait.preview.startDate;
    endDate = wait.preview.endDate;
    count = wait.preview.participantCount;
  }

  const title =
    membership.status === "pending"
      ? "Waiting for approval"
      : membership.status === "declined"
        ? "Request declined"
        : "No access";

  return (
    <AuthCard title={title} subtitle={previewName}>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[var(--mute)]">Description</dt>
          <dd className="font-medium">{previewDesc?.trim() ? previewDesc : "No description."}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[var(--mute)]">Start</dt>
            <dd className="font-medium">{startDate || "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--mute)]">End</dt>
            <dd className="font-medium">{endDate || "—"}</dd>
          </div>
        </div>
        <div>
          <dt className="text-[var(--mute)]">Participants</dt>
          <dd className="font-medium">{count}</dd>
        </div>
        <div>
          <dt className="text-[var(--mute)]">Your status</dt>
          <dd className="font-medium capitalize">{membership.status}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-[var(--mute)]">
        {membership.status === "pending"
          ? "You do not have access to private challenge financials while your request is pending."
          : "You do not have access to this private challenge."}
      </p>

      <div className="mt-5 space-y-2">
        <Link
          href="/home"
          className="at-btn-primary"
        >
          Go to home
        </Link>
        <Link
          href={`/invite/${token}`}
          className="at-btn-secondary w-full"
        >
          Back to invite
        </Link>
      </div>
    </AuthCard>
  );
}
