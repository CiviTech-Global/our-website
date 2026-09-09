import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, refreshAccessToken, setAccessToken } from '@/config/api';
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload, UpdateProfilePayload } from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Revokes every session for this account, on every device. */
  logoutEverywhere: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: silently try to refresh the access token from the httpOnly cookie,
  // then fetch the current user. Any failure just means "not logged in".
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Through the shared single-flight refresh, never the endpoint
        // directly. Calling POST /auth/refresh here was its own request, so it
        // could run at the same time as one started by a 401 — or simply twice,
        // since React invokes mount effects twice in development. The server
        // ROTATES the refresh token on every call, so two concurrent refreshes
        // minted two tokens and the second overwrote the first's cookie,
        // orphaning a token that had just been issued.
        await refreshAccessToken();
        const meRes = await api.get<{ user: AuthUser }>('/auth/me');
        if (!cancelled) setUser(meRes.data.user);
      } catch {
        setAccessToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await api.post<AuthResponse>('/auth/login', payload);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await api.post<AuthResponse>('/auth/register', payload);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  // The server bumps tokenVersion, which invalidates every outstanding access
  // and refresh token at once — this is what someone reaches for after losing a
  // laptop or sharing a password, so it must not fail quietly.
  const logoutEverywhere = useCallback(async () => {
    try {
      await api.post('/auth/logout-all');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get<{ user: AuthUser }>('/auth/me');
    setUser(res.data.user);
  }, []);

  // NOTE: PUT /api/auth/me is assumed — see ProfilePage for the backend follow-up note.
  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const res = await api.put<{ user: AuthUser }>('/auth/me', payload);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      logoutEverywhere,
      refreshUser,
      updateProfile,
    }),
    [user, isLoading, login, register, logout, logoutEverywhere, refreshUser, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
