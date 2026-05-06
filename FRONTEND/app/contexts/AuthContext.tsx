'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  profile: string;
  companyId: number;
}

export interface Company {
  id: number;
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

// Usuário demo para acesso direto sem backend
const DEMO_USER: User = {
  id: 1,
  name: 'Eduardo',
  email: 'admin@innovation.ia',
  profile: 'admin',
  companyId: 1,
};

const DEMO_COMPANY: Company = {
  id: 1,
  name: 'Innovation.ia',
};

const DEMO_TOKEN = 'demo-token-innovation-ia-2025';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-login: carregar sessão salva OU entrar com demo automaticamente
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedCompany = localStorage.getItem('company');

    if (savedToken && savedUser && savedCompany) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setCompany(JSON.parse(savedCompany));
      } catch {
        // Sessão corrompida: fazer auto-login demo
        doAutoLogin();
      }
    } else {
      // Sem sessão: auto-login demo para o app funcionar
      doAutoLogin();
    }
  }, []);

  const doAutoLogin = () => {
    setToken(DEMO_TOKEN);
    setUser(DEMO_USER);
    setCompany(DEMO_COMPANY);
    localStorage.setItem('token', DEMO_TOKEN);
    localStorage.setItem('user', JSON.stringify(DEMO_USER));
    localStorage.setItem('company', JSON.stringify(DEMO_COMPANY));
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Tentar backend real primeiro
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      try {
        const response = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(3000), // timeout 3s
        });

        if (response.ok) {
          const data = await response.json();
          setToken(data.token);
          setUser(data.user);
          setCompany(data.company);
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('company', JSON.stringify(data.company));
          return;
        }
      } catch {
        // Backend indisponível — usar credenciais demo
      }

      // Credenciais demo aceitas sempre para funcionamento offline
      if (email && password) {
        const demoUser: User = {
          ...DEMO_USER,
          name: email.split('@')[0] || 'Usuário',
          email,
        };
        setToken(DEMO_TOKEN);
        setUser(demoUser);
        setCompany(DEMO_COMPANY);
        localStorage.setItem('token', DEMO_TOKEN);
        localStorage.setItem('user', JSON.stringify(demoUser));
        localStorage.setItem('company', JSON.stringify(DEMO_COMPANY));
      } else {
        throw new Error('Preencha email e senha');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setCompany(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
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
