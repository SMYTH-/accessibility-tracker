import type { PersonalDataExport } from "./types";

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

export function mapPersonalDataExport(raw: unknown): PersonalDataExport {
  const row = (raw ?? {}) as Record<string, unknown>;
  const profile = (row.profile ?? {}) as Record<string, unknown>;
  return {
    schemaVersion: Number(row.schema_version ?? 1),
    exportedAt: String(row.exported_at ?? ""),
    subjectUserId: String(row.subject_user_id ?? ""),
    scope: "personal_authorised_only",
    privacyNote: String(row.privacy_note ?? ""),
    profile: {
      userId: String(profile.user_id ?? ""),
      email: String(profile.email ?? ""),
      displayName: String(profile.display_name ?? ""),
      emailConfirmedAt:
        profile.email_confirmed_at == null ? null : String(profile.email_confirmed_at),
      createdAt: profile.created_at == null ? null : String(profile.created_at),
    },
    memberships: asArray(row.memberships),
    challenges: asArray(row.challenges),
    savingsSetups: asArray(row.savings_setups),
    contributions: asArray(row.contributions),
    contributionRevisions: asArray(row.contribution_revisions),
    weeklyAssessments: asArray(row.weekly_assessments),
    progressMilestones: asArray(row.progress_milestones),
    invitationsCreated: asArray(row.invitations_created),
  };
}
