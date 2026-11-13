export type PrivacySettingItem = {
  challengeId: string;
  challengeName: string;
  lifecycleStatus: string;
  currency: string;
  membershipId: string;
  role: string;
  shareMonetaryInfo: boolean;
  savingsParticipationActive: boolean;
  updatedAt: string;
};

export type PrivacySettingsList = {
  items: PrivacySettingItem[];
  /** Product default: visible to approved members (not private-by-default). */
  defaultVisible: true;
  /** Re-opt-in remains OPEN — signed-in path parks re-enable. */
  reoptInStatus: "open_deferred";
  /** Small-group suppression remains OPEN — not invented. */
  smallGroupSuppressionStatus: "open";
};

export type OptOutResult =
  | {
      ok: true;
      membershipId: string;
      challengeId: string;
      shareMonetaryInfo: false;
      changed: boolean;
      updatedAt: string;
    }
  | { ok: false; error: string };
