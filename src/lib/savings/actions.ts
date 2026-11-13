"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { activateSavingsSetup, updateSavingsTarget } from "./service";

export type SavingsActionState = {
  error?: string;
  message?: string;
};

export async function activateSavingsAction(
  _prev: SavingsActionState,
  formData: FormData,
): Promise<SavingsActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const challengeId = String(formData.get("challengeId") ?? "");
  const targetMajor = String(formData.get("targetMajor") ?? "");
  const weeklyCommitmentMajor = String(formData.get("weeklyCommitmentMajor") ?? "");

  const result = await activateSavingsSetup(
    user.id,
    challengeId,
    targetMajor,
    weeklyCommitmentMajor,
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/challenge/${challengeId}`);
  revalidatePath("/home");
  return {
    message: `Savings participation active. First assessed week starts ${result.setup.firstAssessedWeekStart}.`,
  };
}

export async function updateTargetAction(
  _prev: SavingsActionState,
  formData: FormData,
): Promise<SavingsActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const challengeId = String(formData.get("challengeId") ?? "");
  const targetMajor = String(formData.get("targetMajor") ?? "");

  const result = await updateSavingsTarget(user.id, challengeId, targetMajor);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/challenge/${challengeId}`);
  if (result.unchanged) {
    return { message: "Target unchanged." };
  }
  return {
    message: `Target updated. Effective from ${result.setup.targetEffectiveFrom} (next weekly period — G1.1-10).`,
  };
}
