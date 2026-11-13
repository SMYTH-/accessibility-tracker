import type { Membership } from "@/lib/challenge/types";

export type SavingsSetup = {
  membershipId: string;
  challengeId: string;
  userId: string;
  /** Integer minor units (e.g. pence). Always positive when present. */
  targetMinor: number;
  weeklyCommitmentMinor: number;
  activatedAt: string;
  /** Monday YYYY-MM-DD of first assessed commitment week (challenge TZ). */
  firstAssessedWeekStart: string;
  /** G1.1-10: current target applies from this Monday inclusive. */
  targetEffectiveFrom: string;
  updatedAt: string;
};

export type SavingsSetupAuditAction = "activate" | "target_change";

export type SavingsSetupAuditEvent = {
  id: string;
  challengeId: string;
  membershipId: string | null;
  actorUserId: string | null;
  action: SavingsSetupAuditAction;
  fromTargetMinor: number | null;
  toTargetMinor: number | null;
  fromWeeklyCommitmentMinor: number | null;
  toWeeklyCommitmentMinor: number | null;
  effectiveFrom: string | null;
  firstAssessedWeekStart: string | null;
  detail: string;
  at: string;
};

export type ActivateSavingsInput = {
  challengeId: string;
  /** Major-unit decimal string from UI, e.g. "2000" or "50.00". */
  targetMajor: string;
  weeklyCommitmentMajor: string;
};

export type ActivateSavingsResult =
  | { ok: true; membership: Membership; setup: SavingsSetup }
  | { ok: false; error: string };

export type UpdateTargetResult =
  | {
      ok: true;
      membership: Membership;
      setup: SavingsSetup;
      unchanged: boolean;
    }
  | { ok: false; error: string };

export type OwnSavingsView = {
  membership: Membership;
  setup: SavingsSetup | null;
  savingsParticipationActive: boolean;
};
