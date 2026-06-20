'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  login: (email: string, password: string) => Promise<void>;
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

  // Carregar apenas sessao real salva. A sessao local precisa ser habilitada por env no desenvolvimento.
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
        name: freshUser.name || freshUser.email?.split('@')[0] || 'Usuario',
        email: freshUser.email,
        profile: String(freshUser.role || 'USER').toLowerCase(),
        companyId: freshUser.companyId,
      };
      const nextCompany = { ...savedCompany, id: freshUser.companyId || savedCompany.id };
      setUser(nextUser);
      setCompany(nextCompany);
      localStorage.setItem('user', JSON.stringify(nextUser));
      localStorage.setItem('company', JSON.stringify(nextCompany));
    } catch {
      // Mantem a sessao salva se a atualizacao do perfil falhar momentaneamente.
    }
  };

  const startLocalSession = () => {
    setToken(LOCAL_SESSION_TOKEN);
    setUser(LOCAL_USER);
    setCompany(LOCAL_COMPANY);
    localStorage.setItem('token', LOCAL_SESSION_TOKEN);
    localStorage.setItem('user', JSON.stringify(LOCAL_USER));
    localStorage.setItem('company', JSON.stringify(LOCAL_COMPANY));
  };

  const clearStoredSession = () => {
    setToken(null);
    setUser(null);
    setCompany(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Tentar backend real primeiro
      const apiUrl = getApiUrl();

      try {
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(3000), // timeout 3s
        });

        if (response.ok) {
          const data = await response.json();
          const authData = data.data ?? data;
          const nextToken = authData.access_token;
          const nextUser = {
            id: authData.user.sub,
            name: authData.user.name || email.split('@')[0] || 'Usuario',
            email: authData.user.email,
            profile: String(authData.user.role || 'USER').toLowerCase(),
            companyId: authData.user.companyId,
          };
          const nextCompany = {
            id: authData.user.companyId,
            name: 'Innovation RH Connect',
          };
          setToken(nextToken);
          setUser(nextUser);
          setCompany(nextCompany);
          localStorage.setItem('token', nextToken);
          localStorage.setItem('user', JSON.stringify(nextUser));
          localStorage.setItem('company', JSON.stringify(nextCompany));
          return;
        }
      } catch {
        throw new Error('Nao foi possivel entrar.');
      }

      throw new Error('Nao foi possivel entrar.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
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
    login,
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
