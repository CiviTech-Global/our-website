export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  permissions: string[];
  /** Whether the address has been confirmed by following an emailed link. */
  emailVerified?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

/**
 * What POST /auth/login returns when the account has a second factor.
 *
 * No session is issued at this point, and no refresh cookie is set — a
 * half-finished sign-in must leave nothing behind that could be used.
 */
export interface MfaChallenge {
  mfaRequired: true;
  challengeToken: string;
}

export type LoginResult = { mfaRequired?: false; user: AuthUser } | MfaChallenge;

export function isMfaChallenge(result: LoginResult): result is MfaChallenge {
  return result.mfaRequired === true;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
}
