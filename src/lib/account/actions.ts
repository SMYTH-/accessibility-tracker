"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  exportOwnPersonalData,
  finalizeAccountDeletion,
  requestAccountDeletion,
  transferChallengeOwnership,
} from "./service";
import type { PersonalDataExport } from "./types";

export type ExportActionState = {
  error?: string;
  message?: string;
  exportJson?: string;
  exportMeta?: Pick<
    PersonalDataExport,
    "exportedAt" | "subjectUserId" | "schemaVersion" | "privacyNote"
  >;
};

export type DeletionActionState = {
  error?: string;
  message?: string;
  status?: string;
  graceEndsAt?: string | null;
  pendingTransfer?: boolean;
  gracePending?: boolean;
  completed?: boolean;
};

export type TransferActionState = {
  error?: string;
  message?: string;
  challengeId?: string;
};

export async function exportPersonalDataAction(
  _prev: ExportActionState,
  _formData: FormData,
): Promise<ExportActionState> {
  void _formData;
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const result = await exportOwnPersonalData(user.id);
  if (!result.ok) return { error: result.error };

  return {
    message:
      "Personal data export ready. Download includes only your authorised records.",
    exportJson: JSON.stringify(result.raw ?? result.export, null, 2),
    exportMeta: {
      exportedAt: result.export.exportedAt,
      subjectUserId: result.export.subjectUserId,
      schemaVersion: result.export.schemaVersion,
      privacyNote: result.export.privacyNote,
    },
  };
}

export async function requestDeletionAction(
  _prev: DeletionActionState,
  _formData: FormData,
): Promise<DeletionActionState> {
  void _formData;
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const result = await requestAccountDeletion(user.id);
  if (!result.ok) return { error: result.error, status: result.code };

  revalidatePath("/profile");
  revalidatePath("/home");
  revalidatePath("/challenge");

  if (result.status === "completed") {
    redirect("/sign-in");
  }

  return {
    status: result.status,
    message: result.message,
    graceEndsAt: result.graceEndsAt,
    pendingTransfer: result.status === "pending_transfer",
    gracePending: result.status === "grace_pending",
    completed: false,
  };
}

export async function finalizeDeletionAction(
  _prev: DeletionActionState,
  _formData: FormData,
): Promise<DeletionActionState> {
  void _formData;
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const result = await finalizeAccountDeletion(user.id);
  if (!result.ok) {
    return {
      error: result.error,
      status: result.code,
      pendingTransfer: result.code === "DELETION_TRANSFER_REQUIRED",
      gracePending: result.code === "DELETION_GRACE_ACTIVE",
    };
  }

  revalidatePath("/profile");
  if (result.status === "completed") {
    redirect("/sign-in");
  }
  return { status: result.status, message: result.message };
}

export async function transferOwnershipAction(
  _prev: TransferActionState,
  formData: FormData,
): Promise<TransferActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const challengeId = String(formData.get("challengeId") ?? "");
  const newOwnerUserId = String(formData.get("newOwnerUserId") ?? "");
  if (!challengeId || !newOwnerUserId) {
    return { error: "Challenge and new owner are required.", challengeId };
  }

  const result = await transferChallengeOwnership(
    user.id,
    challengeId,
    newOwnerUserId,
  );
  if (!result.ok) return { error: result.error, challengeId };

  revalidatePath("/profile");
  revalidatePath(`/challenge/${challengeId}`);
  revalidatePath("/challenge");

  return {
    challengeId,
    message: "Ownership transferred. You can continue account deletion.",
  };
}
