import { getAuthMode } from "./config";
import { getMockSessionUser } from "./mock/session";
import { createClient } from "./supabase/server";
import type { AuthUser } from "./types";

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (getAuthMode() === "mock") {
    return getMockSessionUser();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Member";

  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
