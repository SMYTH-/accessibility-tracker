import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAccountErrorCode, mapAccountRpcError } from "./errors";
import { mapPersonalDataExport } from "./map";
import type {
  DeletionHold,
  DeletionRequestResult,
  DeletionStatusView,
  ExportResult,
  TransferCandidate,
  TransferResult,
} from "./types";

function mapHold(raw: Record<string, unknown>): DeletionHold {
  return {
    challengeId: String(raw.challenge_id ?? ""),
    name: raw.name == null ? undefined : String(raw.name),
    lifecycleStatus:
      raw.lifecycle_status == null ? undefined : String(raw.lifecycle_status),
    holdKind: String(raw.hold_kind ?? ""),
    graceEndsAt: raw.grace_ends_at == null ? null : String(raw.grace_ends_at),
    eligibleReplacements:
      raw.eligible_replacements == null
        ? undefined
        : Number(raw.eligible_replacements),
    resolvedAt: raw.resolved_at == null ? null : String(raw.resolved_at),
    resolution: raw.resolution == null ? null : String(raw.resolution),
  };
}

function mapDeletionPayload(data: unknown): DeletionRequestResult {
  const row = (data ?? {}) as Record<string, unknown>;
  const status = String(row.status ?? "ready") as DeletionRequestResult extends {
    ok: true;
    status: infer S;
  }
    ? S
    : never;
  const holds = Array.isArray(row.holds)
    ? (row.holds as Record<string, unknown>[]).map(mapHold)
    : undefined;
  return {
    ok: true,
    status,
    requestId: row.request_id == null ? undefined : String(row.request_id),
    graceEndsAt: row.grace_ends_at == null ? null : String(row.grace_ends_at),
    holds,
    message: row.message == null ? undefined : String(row.message),
    cancelledChallenges:
      row.cancelled_challenges == null
        ? undefined
        : Number(row.cancelled_challenges),
    idempotent: Boolean(row.idempotent),
  };
}

export async function pgExportOwnPersonalData(
  supabase: SupabaseClient,
): Promise<ExportResult> {
  const { data, error } = await supabase.rpc("export_own_personal_data");
  if (error) return { ok: false, error: mapAccountRpcError(error) };
  const mapped = mapPersonalDataExport(data);
  return { ok: true, export: mapped, raw: data };
}

export async function pgRequestAccountDeletion(
  supabase: SupabaseClient,
): Promise<DeletionRequestResult> {
  const { data, error } = await supabase.rpc("request_account_deletion");
  if (error) {
    return {
      ok: false,
      error: mapAccountRpcError(error),
      code: mapAccountErrorCode(error.message),
    };
  }
  return mapDeletionPayload(data);
}

export async function pgFinalizeAccountDeletion(
  supabase: SupabaseClient,
): Promise<DeletionRequestResult> {
  const { data, error } = await supabase.rpc("finalize_account_deletion");
  if (error) {
    return {
      ok: false,
      error: mapAccountRpcError(error),
      code: mapAccountErrorCode(error.message),
    };
  }
  return mapDeletionPayload(data);
}

export async function pgGetOwnDeletionStatus(
  supabase: SupabaseClient,
): Promise<DeletionStatusView> {
  const { data, error } = await supabase.rpc("get_own_deletion_status");
  if (error) throw new Error(mapAccountRpcError(error));
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    status: String(row.status ?? "none") as DeletionStatusView["status"],
    requestId: row.request_id == null ? undefined : String(row.request_id),
    requestedAt: row.requested_at == null ? undefined : String(row.requested_at),
    graceEndsAt: row.grace_ends_at == null ? null : String(row.grace_ends_at),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
    holds: Array.isArray(row.holds)
      ? (row.holds as Record<string, unknown>[]).map(mapHold)
      : [],
  };
}

export async function pgListTransferCandidates(
  supabase: SupabaseClient,
  challengeId: string,
): Promise<TransferCandidate[]> {
  const { data, error } = await supabase.rpc("list_ownership_transfer_candidates", {
    p_challenge_id: challengeId,
  });
  if (error) throw new Error(mapAccountRpcError(error));
  const row = (data ?? {}) as Record<string, unknown>;
  const candidates = Array.isArray(row.candidates)
    ? (row.candidates as Record<string, unknown>[])
    : [];
  return candidates.map((c) => ({
    userId: String(c.user_id ?? ""),
    membershipId: String(c.membership_id ?? ""),
    displayName: String(c.display_name ?? "Member"),
    email: String(c.email ?? ""),
  }));
}

export async function pgTransferOwnership(
  supabase: SupabaseClient,
  challengeId: string,
  newOwnerUserId: string,
): Promise<TransferResult> {
  const { data, error } = await supabase.rpc("transfer_challenge_ownership", {
    p_challenge_id: challengeId,
    p_new_owner_user_id: newOwnerUserId,
  });
  if (error) return { ok: false, error: mapAccountRpcError(error) };
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    challengeId: String(row.challenge_id ?? challengeId),
    fromUserId: String(row.from_user_id ?? ""),
    toUserId: String(row.to_user_id ?? newOwnerUserId),
    lifecycleStatus: String(row.lifecycle_status ?? ""),
  };
}

export async function pgTickDeletionGrace(
  supabase: SupabaseClient,
): Promise<{ finalised: number; skipped: number; errors: number }> {
  const { data, error } = await supabase.rpc("tick_account_deletion_grace");
  if (error) throw new Error(mapAccountRpcError(error));
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    finalised: Number(row.finalised ?? 0),
    skipped: Number(row.skipped ?? 0),
    errors: Number(row.errors ?? 0),
  };
}
