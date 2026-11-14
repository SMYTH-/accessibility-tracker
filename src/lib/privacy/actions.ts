"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { optOutShareMonetaryInfo } from "./service";

export type PrivacyActionState = {
  error?: string;
  message?: string;
  challengeId?: string;
};

export async function optOutMonetaryInfoAction(
  _prev: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const challengeId = String(formData.get("challengeId") ?? "");
  const acknowledged = String(formData.get("cannotUndoAck") ?? "") === "on";
  const hide = String(formData.get("hideMonetary") ?? "") === "on";

  if (!challengeId) return { error: "Challenge is required." };
  if (!hide) {
    return {
      error: "Turn on Hide monetary information to opt out for this challenge.",
    };
  }
  if (!acknowledged) {
    return {
      error:
        "Confirm that opting out cannot undo what others already saw before saving.",
    };
  }

  const result = await optOutShareMonetaryInfo(user.id, challengeId);
  if (!result.ok) return { error: result.error, challengeId };

  revalidatePath("/profile");
  revalidatePath("/home");
  revalidatePath(`/challenge/${challengeId}`);
  revalidatePath("/challenge");

  return {
    challengeId,
    message: result.changed
      ? "Monetary information is now hidden from other approved members for this challenge."
      : "You were already opted out for this challenge.",
  };
}
