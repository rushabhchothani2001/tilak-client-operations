import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { setUnauthorizedHandler } from '../api/http';
import type { User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  /** True until the initial "who am I" check finishes. */
  loading: boolean;
  /** Set when the user was signed out because their session expired. */
  sessionExpired: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then(setUserState)
      .catch(() => setUserState(null))
      .finally(() => setLoading(false));

    setUnauthorizedHandler(() => {
      setUserState((current) => {
        if (current) setSessionExpired(true);
        return null;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const loggedIn = await authApi.login(username, password);
    setSessionExpired(false);
    setUserState(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setSessionExpired(false);
      setUserState(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, logout, setUser: setUserState }),
    [user, loading, sessionExpired, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Where each role lands after logging in. */
export const homePathFor = (role: UserRole) => (role === 'admin' ? '/orders' : '/manufacturing');

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  worker: 'Worker',
};
