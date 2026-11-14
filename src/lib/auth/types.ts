export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export type AuthResult =
  | {
      ok: true;
      user?: AuthUser;
      message?: string;
      /** Present only in AUTH_MODE=mock for local walkthrough. */
      mockVerifyToken?: string;
      mockRecoveryToken?: string;
    }
  | { ok: false; error: string };
