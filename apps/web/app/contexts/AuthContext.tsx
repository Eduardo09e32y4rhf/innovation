'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { resetAllQueryStates } from '@/app/hooks/use-data';
import {
  clearAuthSession,
  persistAuthSession,
  readParsedAuthSession,
  setAuthScopeSnapshot,
  startLocalStorageGuard,
} from '@/app/lib/auth-session';
import api from '@/app/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  profile: string;
  companyId: string;
  customPermissions?: string[];
}

export interface Company {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  passwordChangeRequired: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOCAL_SESSION_TOKEN = 'innovation-rh-connect-local-session';
const LOCAL_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const LOCAL_SESSION_ENABLED =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_LOCAL_SESSION === 'true';

const LOCAL_USER: User = {
  id: LOCAL_COMPANY_ID,
  name: 'Operador local',
  email: 'local@innovationrhconnect.com',
  profile: 'admin',
  companyId: LOCAL_COMPANY_ID,
};

const LOCAL_COMPANY: Company = {
  id: LOCAL_COMPANY_ID,
  name: 'Innovation RH System',
};

const isLocalBrowser = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const canUseLocalSession = () => process.env.NODE_ENV !== 'production' && (LOCAL_SESSION_ENABLED || isLocalBrowser());
const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || '/api';


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // readParsedAuthSession lê do sessionStorage (isolado por aba) e já deserializa
  const initialSession = readParsedAuthSession();
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  useEffect(() => {
    setAuthScopeSnapshot({
      token,
      userId: user?.id ?? null,
      companyId: company?.id ?? null,
      role: user?.profile?.toUpperCase() ?? null,
    });

    if (token && user && company) {
      // persistAuthSession recebe objetos brutos — serialização acontece dentro do módulo
      persistAuthSession(token, user, company, passwordChangeRequired);
      return;
    }

    clearAuthSession();
  }, [token, user, company, passwordChangeRequired]);

  useEffect(() => {
    // Ativa o guard: localStorage vira zona proibida para auth nesta aba
    const cleanupGuard = startLocalStorageGuard();
    let active = true;

    const bootstrap = async () => {
      // Carrega a sessão inicial do client-side
      const session = readParsedAuthSession();
      if (session.token) {
        setToken(session.token);
        setUser(session.user);
        setCompany(session.company);
        setPasswordChangeRequired(session.passwordChangeRequired);
      }

      if (!session.token) {
        if (LOCAL_SESSION_ENABLED) {
          startLocalSession();
        }
        if (active) setLoading(false);
        return;
      }

      if (session.token === LOCAL_SESSION_TOKEN) {
        if (!canUseLocalSession()) {
          clearStoredSession();
        }
        if (active) setLoading(false);
        return;
      }

      if (!session.user || !session.company) {
        if (active) setLoading(false);
        return;
      }

      await refreshStoredUser(session.token, session.company);
      if (active) setLoading(false);
    };

    void bootstrap();

    return () => {
      active = false;
      cleanupGuard();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token || !user || token === LOCAL_SESSION_TOKEN) return;
    api.users.ping().catch(() => {});
    const interval = setInterval(() => {
      api.users.ping().catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [token, user]);

  const refreshStoredUser = async (savedToken: string, savedCompany: Company) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (response.status === 401) {
        clearStoredSession();
        return;
      }
      if (!response.ok) return;
      const payload = await response.json();
      const freshUser = payload.data ?? payload;
      const nextUser: User = {
        id: freshUser.sub,
        name: freshUser.name || freshUser.email?.split('@')[0] || 'Usuário',
        email: freshUser.email,
        profile: String(freshUser.role || 'USER').toLowerCase(),
        companyId: freshUser.companyId,
        customPermissions: Array.isArray(freshUser.customPermissions) ? freshUser.customPermissions : [],
      };
      const nextCompany = { ...savedCompany, id: freshUser.companyId || savedCompany.id };
      const mustChangePassword = Boolean(freshUser.passwordChangeRequired);
      setUser(nextUser);
      setCompany(nextCompany);
      setPasswordChangeRequired(mustChangePassword);
    } catch {
      // Mantém a sessão salva se a atualização do perfil falhar momentaneamente.
    }
  };

  const startLocalSession = () => {
    setToken(LOCAL_SESSION_TOKEN);
    setUser(LOCAL_USER);
    setCompany(LOCAL_COMPANY);
    setPasswordChangeRequired(false);
    resetAllQueryStates();
  };

  const clearStoredSession = () => {
    setToken(null);
    setUser(null);
    setCompany(null);
    setPasswordChangeRequired(false);
    clearAuthSession();
    resetAllQueryStates();
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || payload?.error?.message || 'Não foi possível entrar.');
      }

      const data = await response.json();
      const authData = data.data ?? data;
      const nextToken = authData.access_token;
      const nextUser: User = {
        id: authData.user.sub,
        name: authData.user.name || email.split('@')[0] || 'Usuário',
        email: authData.user.email,
        profile: String(authData.user.role || 'USER').toLowerCase(),
        companyId: authData.user.companyId,
        customPermissions: Array.isArray(authData.user.customPermissions) ? authData.user.customPermissions : [],
      };
      const nextCompany: Company = {
        id: authData.user.companyId,
        name: 'Innovation RH System',
      };
      const mustChangePassword = Boolean(authData.passwordChangeRequired);
      setToken(nextToken);
      setUser(nextUser);
      setCompany(nextCompany);
      setPasswordChangeRequired(mustChangePassword);
      resetAllQueryStates();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) throw new Error('Sessão expirada. Faça login novamente.');
    const response = await fetch(`${getApiUrl()}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || payload?.error?.message || 'Não foi possível trocar a senha.');
    setPasswordChangeRequired(false);
  };

  const logout = () => {
    clearStoredSession();
    setError(null);
  };

  const value: AuthContextType = {
    user,
    company,
    token,
    loading,
    error,
    passwordChangeRequired,
    login,
    changePassword,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

