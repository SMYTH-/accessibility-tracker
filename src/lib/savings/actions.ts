"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { activateSavingsSetup } from "./service";

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

/** Parked until G1.1-10 progress/milestone rules are approved. */
export async function updateTargetAction(
  _prev: SavingsActionState,
  _formData: FormData,
): Promise<SavingsActionState> {
  return {
    error:
      "Changing your personal target after activation is not available yet.",
  };
}
