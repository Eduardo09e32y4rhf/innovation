'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  profile: string;
  companyId: string;
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
  name: 'Innovation RH Connect',
};

const isLocalBrowser = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const canUseLocalSession = () => process.env.NODE_ENV !== 'production' && (LOCAL_SESSION_ENABLED || isLocalBrowser());
const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || '/api';
const isStoredJsonValue = (value: string | null) => Boolean(value && value !== 'undefined' && value !== 'null');

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedCompany = localStorage.getItem('company');

    if (savedToken === LOCAL_SESSION_TOKEN && !canUseLocalSession()) {
      clearStoredSession();
      setLoading(false);
      return;
    }

    if (!savedToken && LOCAL_SESSION_ENABLED) {
      startLocalSession();
      setLoading(false);
      return;
    }

    if (savedToken && isStoredJsonValue(savedUser) && isStoredJsonValue(savedCompany)) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const parsedCompany = JSON.parse(savedCompany);
        if (canUseLocalSession() && savedToken === LOCAL_SESSION_TOKEN && parsedUser?.companyId !== LOCAL_COMPANY_ID) {
          startLocalSession();
        } else {
          setToken(savedToken);
          setUser(parsedUser);
          setCompany(parsedCompany);
          setPasswordChangeRequired(localStorage.getItem('passwordChangeRequired') === 'true');
          void refreshStoredUser(savedToken, parsedCompany);
        }
      } catch {
        clearStoredSession();
      }
    } else if (LOCAL_SESSION_ENABLED) {
      startLocalSession();
    }
    setLoading(false);
  }, []);

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
      const nextUser = {
        id: freshUser.sub,
        name: freshUser.name || freshUser.email?.split('@')[0] || 'Usuário',
        email: freshUser.email,
        profile: String(freshUser.role || 'USER').toLowerCase(),
        companyId: freshUser.companyId,
      };
      const nextCompany = { ...savedCompany, id: freshUser.companyId || savedCompany.id };
      const mustChangePassword = Boolean(freshUser.passwordChangeRequired);
      setUser(nextUser);
      setCompany(nextCompany);
      setPasswordChangeRequired(mustChangePassword);
      localStorage.setItem('user', JSON.stringify(nextUser));
      localStorage.setItem('company', JSON.stringify(nextCompany));
      localStorage.setItem('passwordChangeRequired', String(mustChangePassword));
    } catch {
      // Mantém a sessão salva se a atualização do perfil falhar momentaneamente.
    }
  };

  const startLocalSession = () => {
    setToken(LOCAL_SESSION_TOKEN);
    setUser(LOCAL_USER);
    setCompany(LOCAL_COMPANY);
    setPasswordChangeRequired(false);
    localStorage.setItem('token', LOCAL_SESSION_TOKEN);
    localStorage.setItem('user', JSON.stringify(LOCAL_USER));
    localStorage.setItem('company', JSON.stringify(LOCAL_COMPANY));
    localStorage.setItem('passwordChangeRequired', 'false');
  };

  const clearStoredSession = () => {
    setToken(null);
    setUser(null);
    setCompany(null);
    setPasswordChangeRequired(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    localStorage.removeItem('passwordChangeRequired');
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
      const nextUser = {
        id: authData.user.sub,
        name: authData.user.name || email.split('@')[0] || 'Usuário',
        email: authData.user.email,
        profile: String(authData.user.role || 'USER').toLowerCase(),
        companyId: authData.user.companyId,
      };
      const nextCompany = {
        id: authData.user.companyId,
        name: 'Innovation RH Connect',
      };
      const mustChangePassword = Boolean(authData.passwordChangeRequired);
      setToken(nextToken);
      setUser(nextUser);
      setCompany(nextCompany);
      setPasswordChangeRequired(mustChangePassword);
      localStorage.setItem('token', nextToken);
      localStorage.setItem('user', JSON.stringify(nextUser));
      localStorage.setItem('company', JSON.stringify(nextCompany));
      localStorage.setItem('passwordChangeRequired', String(mustChangePassword));
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
    localStorage.setItem('passwordChangeRequired', 'false');
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
