import type { PrivacySettingItem, PrivacySettingsList } from "./types";

type ItemRow = {
  challenge_id: string;
  challenge_name: string;
  lifecycle_status: string;
  currency: string;
  membership_id: string;
  role: string;
  share_monetary_info: boolean;
  savings_participation_active: boolean;
  updated_at: string;
};

type ListPayload = {
  items: ItemRow[] | null;
  default_visible: boolean;
  reopt_in_status: string;
  small_group_suppression_status: string;
};

export function mapPrivacyItem(row: ItemRow): PrivacySettingItem {
  return {
    challengeId: row.challenge_id,
    challengeName: row.challenge_name,
    lifecycleStatus: row.lifecycle_status,
    currency: row.currency,
    membershipId: row.membership_id,
    role: row.role,
    shareMonetaryInfo: Boolean(row.share_monetary_info),
    savingsParticipationActive: Boolean(row.savings_participation_active),
    updatedAt: row.updated_at,
  };
}

export function mapPrivacySettingsList(payload: ListPayload): PrivacySettingsList {
  const items = Array.isArray(payload.items)
    ? payload.items.map(mapPrivacyItem)
    : [];
  return {
    items,
    defaultVisible: true,
    reoptInStatus: "open_deferred",
    smallGroupSuppressionStatus: "open",
  };
}
