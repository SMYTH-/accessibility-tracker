import { cookies } from "next/headers";
import type { AuthUser } from "../types";
import { findUserById } from "./store";

export const MOCK_SESSION_COOKIE = "at_mock_session";

export async function getMockSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const userId = jar.get(MOCK_SESSION_COOKIE)?.value;
  if (!userId) return null;
  const user = await findUserById(userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  };
}

export async function setMockSession(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(MOCK_SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearMockSession(): Promise<void> {
  try {
    const jar = await cookies();
    jar.delete(MOCK_SESSION_COOKIE);
  } catch {
    // Scripts / smokes may finalise deletion outside a Next request scope.
  }
}
