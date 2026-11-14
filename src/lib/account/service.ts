import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";
import { createClient } from "@/lib/auth/supabase/server";
import {
  mockExportOwnPersonalData,
  mockFinalizeAccountDeletion,
  mockGetOwnDeletionStatus,
  mockListTransferCandidates,
  mockRequestAccountDeletion,
  mockTransferOwnership,
} from "./mock";
import {
  pgExportOwnPersonalData,
  pgFinalizeAccountDeletion,
  pgGetOwnDeletionStatus,
  pgListTransferCandidates,
  pgRequestAccountDeletion,
  pgTransferOwnership,
} from "./postgres";
import type {
  DeletionRequestResult,
  DeletionStatusView,
  ExportResult,
  TransferCandidate,
  TransferResult,
} from "./types";

function isPostgresMode(): boolean {
  return getAuthMode() === "supabase";
}

async function userClient(): Promise<SupabaseClient> {
  return createClient();
}

export async function exportOwnPersonalData(userId: string): Promise<ExportResult> {
  if (isPostgresMode()) {
    void userId;
    return pgExportOwnPersonalData(await userClient());
  }
  return mockExportOwnPersonalData(userId);
}

export async function requestAccountDeletion(
  userId: string,
): Promise<DeletionRequestResult> {
  if (isPostgresMode()) {
    void userId;
    return pgRequestAccountDeletion(await userClient());
  }
  return mockRequestAccountDeletion(userId);
}

export async function finalizeAccountDeletion(
  userId: string,
): Promise<DeletionRequestResult> {
  if (isPostgresMode()) {
    void userId;
    return pgFinalizeAccountDeletion(await userClient());
  }
  return mockFinalizeAccountDeletion(userId);
}

export async function getOwnDeletionStatus(
  userId: string,
): Promise<DeletionStatusView> {
  if (isPostgresMode()) {
    void userId;
    return pgGetOwnDeletionStatus(await userClient());
  }
  return mockGetOwnDeletionStatus(userId);
}

export async function listTransferCandidates(
  userId: string,
  challengeId: string,
): Promise<TransferCandidate[]> {
  if (isPostgresMode()) {
    void userId;
    return pgListTransferCandidates(await userClient(), challengeId);
  }
  return mockListTransferCandidates(userId, challengeId);
}

export async function transferChallengeOwnership(
  userId: string,
  challengeId: string,
  newOwnerUserId: string,
): Promise<TransferResult> {
  if (isPostgresMode()) {
    void userId;
    return pgTransferOwnership(await userClient(), challengeId, newOwnerUserId);
  }
  return mockTransferOwnership(userId, challengeId, newOwnerUserId);
}
