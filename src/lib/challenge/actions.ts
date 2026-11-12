"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createChallenge } from "./service";

export type CreateChallengeActionState = {
  error?: string;
};

export async function createChallengeAction(
  _prev: CreateChallengeActionState,
  formData: FormData,
): Promise<CreateChallengeActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to create a challenge." };
  }

  const result = await createChallenge(user.id, {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    timeZone: String(formData.get("timeZone") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/challenge/${result.challenge.id}`);
}
