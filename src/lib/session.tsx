import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CandidateProfile, UserSettings } from '../../shared/types';
import { api, errorMessage, type SessionResponse } from './api';

interface SessionState {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: SessionResponse['user'] | null;
  profile: CandidateProfile | null;
  settings: UserSettings | null;
  demo: boolean;
  completeness: number;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setProfile: (profile: CandidateProfile) => void;
  setSettings: (settings: UserSettings) => void;
  setCompleteness: (value: number) => void;
}

const SessionContext = createContext<SessionState | null>(null);

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  notifyDeadlines: true,
  notifyMatches: true,
  matchThreshold: 60,
  weeklyDigest: true,
};

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('ajh-theme', theme);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState['status']>('loading');
  const [user, setUser] = useState<SessionResponse['user'] | null>(null);
  const [profile, setProfileState] = useState<CandidateProfile | null>(null);
  const [settings, setSettingsState] = useState<UserSettings | null>(null);
  const [demo, setDemo] = useState(false);
  const [completeness, setCompleteness] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('ajh-theme');
    applyTheme(stored === 'light' ? 'light' : 'dark');
  }, []);

  const applySession = useCallback((session: SessionResponse) => {
    setUser(session.user);
    setProfileState(session.profile);
    setSettingsState(session.settings || DEFAULT_SETTINGS);
    setDemo(Boolean(session.demo));
    setCompleteness(session.profileCompleteness ?? 0);
    applyTheme(session.settings?.theme === 'light' ? 'light' : 'dark');
    setStatus('authenticated');
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const session = await api.auth.me();
      applySession(session);
    } catch {
      setStatus('anonymous');
      setUser(null);
      setProfileState(null);
      setSettingsState(null);
    }
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await api.auth.me();
        if (!cancelled) applySession(session);
      } catch {
        if (!cancelled) setStatus('anonymous');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        applySession(await api.auth.login(email, password));
      } catch (caught) {
        setError(errorMessage(caught));
        throw caught;
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setError(null);
      try {
        applySession(await api.auth.register(name, email, password));
      } catch (caught) {
        setError(errorMessage(caught));
        throw caught;
      }
    },
    [applySession],
  );

  const demoLogin = useCallback(async () => {
    setError(null);
    try {
      applySession(await api.auth.demo());
    } catch (caught) {
      setError(errorMessage(caught));
      throw caught;
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => undefined);
    setStatus('anonymous');
    setUser(null);
    setProfileState(null);
    setSettingsState(null);
    setDemo(false);
    setCompleteness(0);
  }, []);

  const setSettings = useCallback((next: UserSettings) => {
    setSettingsState(next);
    applyTheme(next.theme === 'light' ? 'light' : 'dark');
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      status,
      user,
      profile,
      settings,
      demo,
      completeness,
      error,
      login,
      register,
      demoLogin,
      logout,
      refresh,
      setProfile: setProfileState,
      setSettings,
      setCompleteness,
    }),
    [status, user, profile, settings, demo, completeness, error, login, register, demoLogin, logout, refresh, setSettings],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
