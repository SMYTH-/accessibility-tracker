import { getAuthMode } from "./config";
import { getMockSessionUser } from "./mock/session";
import { createClient } from "./supabase/server";
import type { AuthUser } from "./types";

async function isAccessDenied(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("account_access_denied_for_me");
  if (error) {
    // Fail closed: unexpected probe errors must not leave a revoked JWT usable.
    return true;
  }
  return Boolean(data);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (getAuthMode() === "mock") {
    const user = await getMockSessionUser();
    if (!user) return null;
    try {
      const { accountAccessDeniedMock } = await import("@/lib/account/mock");
      if (accountAccessDeniedMock(user.id)) {
        const { clearMockSession } = await import("./mock/session");
        await clearMockSession();
        return null;
      }
    } catch {
      // mock helper unavailable
    }
    return user;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (await isAccessDenied(supabase)) {
    await supabase.auth.signOut();
    return null;
  }

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
