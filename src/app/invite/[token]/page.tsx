import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { getCurrentUser } from "@/lib/auth/session";
import { getInvitationPreview, getOwnMembership } from "@/lib/membership/service";

export default async function InvitePreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const previewResult = await getInvitationPreview(token);
  const user = await getCurrentUser();

  if (!previewResult.ok) {
    return (
      <AuthCard title="Invitation unavailable" subtitle="This link cannot be used.">
        <p className="text-sm text-[var(--mute)]">{previewResult.error}</p>
        <p className="mt-4 text-sm">
          <Link href="/sign-in" className="font-semibold text-[var(--deep-sea)] underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  const { preview } = previewResult;
  let membershipStatus: string | null = null;
  if (user) {
    const mem = await getOwnMembership(preview.challengeId, user.id);
    membershipStatus = mem?.status ?? null;
  }

  const nextJoin = `/invite/${token}/join`;
  const nextSignIn = `/sign-in?next=${encodeURIComponent(nextJoin)}`;
  const nextSignUp = `/sign-up?next=${encodeURIComponent(nextJoin)}`;

  return (
    <AuthCard title={preview.name} subtitle="Private challenge invitation">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[var(--mute)]">Description</dt>
          <dd className="font-medium text-[var(--ink)]">
            {preview.description?.trim() ? preview.description : "No description."}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[var(--mute)]">Start</dt>
            <dd className="font-medium">{preview.startDate}</dd>
          </div>
          <div>
            <dt className="text-[var(--mute)]">End</dt>
            <dd className="font-medium">{preview.endDate}</dd>
          </div>
        </div>
        <div>
          <dt className="text-[var(--mute)]">Participants</dt>
          <dd className="font-medium">{preview.participantCount}</dd>
        </div>
        <div>
          <dt className="text-[var(--mute)]">Invite expires</dt>
          <dd className="font-medium">{new Date(preview.expiresAt).toLocaleString()}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-[var(--mute)]">
        Preview shows only name, description, dates, and participant count — no amounts, targets, or
        totals (G1.1-07).
      </p>

      {membershipStatus === "approved" ? (
        <Link
          href={`/challenge/${preview.challengeId}`}
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white"
        >
          Open challenge
        </Link>
      ) : membershipStatus === "pending" ? (
        <Link
          href={`/invite/${token}/status`}
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white"
        >
          View request status
        </Link>
      ) : user ? (
        <Link
          href={nextJoin}
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white"
        >
          Continue to join disclosure
        </Link>
      ) : (
        <div className="mt-5 space-y-2">
          <Link
            href={nextSignIn}
            className="flex w-full items-center justify-center rounded-xl bg-[var(--deep-sea)] px-4 py-3 text-sm font-semibold text-white"
          >
            Sign in to continue
          </Link>
          <Link
            href={nextSignUp}
            className="flex w-full items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold"
          >
            Create account
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
