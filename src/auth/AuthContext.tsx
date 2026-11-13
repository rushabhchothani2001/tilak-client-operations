import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../api';
import { setUnauthorizedHandler } from '../api/http';
import { useI18n } from '../i18n';
import type { Language, User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  /** True until the initial "who am I" check finishes. */
  loading: boolean;
  /** Set when the user was signed out because their session expired. */
  sessionExpired: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  /** Switches the app language now and, when signed in, remembers it on the account. */
  setLanguage: (language: Language) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { lang, setLang } = useI18n();
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const langRef = useRef(lang);
  langRef.current = lang;

  /**
   * When someone signs in: use the language saved on their account. If they have none yet,
   * save the one this device is showing so it follows them next time.
   */
  const applyAccountLanguage = useCallback(
    (signedIn: User) => {
      if (signedIn.language) {
        setLang(signedIn.language);
      } else {
        authApi
          .setLanguage(langRef.current)
          .then(setUserState)
          .catch(() => undefined);
      }
    },
    [setLang],
  );

  useEffect(() => {
    authApi
      .me()
      .then((me) => {
        setUserState(me);
        applyAccountLanguage(me);
      })
      .catch(() => setUserState(null))
      .finally(() => setLoading(false));

    setUnauthorizedHandler(() => {
      setUserState((current) => {
        if (current) setSessionExpired(true);
        return null;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, [applyAccountLanguage]);

  const login = useCallback(
    async (username: string, password: string) => {
      const loggedIn = await authApi.login(username, password);
      setSessionExpired(false);
      setUserState(loggedIn);
      applyAccountLanguage(loggedIn);
      return loggedIn;
    },
    [applyAccountLanguage],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setSessionExpired(false);
      setUserState(null);
    }
  }, []);

  const setLanguage = useCallback(
    (language: Language) => {
      setLang(language);
      if (user && user.language !== language) {
        authApi
          .setLanguage(language)
          .then(setUserState)
          .catch(() => undefined);
      }
    },
    [setLang, user],
  );

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, logout, setUser: setUserState, setLanguage }),
    [user, loading, sessionExpired, login, logout, setLanguage],
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
