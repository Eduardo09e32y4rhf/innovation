'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'pt-BR' | 'en-US' | 'es-ES';

const translations = {
  'pt-BR': {
    // Login
    'login.title': 'Acesse sua Conta',
    'login.subtitle': 'Entre no ecossistema Innovation.ia',
    'login.email': 'E-mail Corporativo',
    'login.email_placeholder': 'ex: admin@innovation.ia',
    'login.password': 'Sua Senha',
    'login.forgot_password': 'Esqueceu a senha?',
    'login.button': 'Entrar na Plataforma',
    'login.authenticating': 'Autenticando...',
    'login.no_account': 'Não tem uma conta?',
    'login.contact_consultant': 'Falar com Consultor',
    'login.security': 'Proteção de dados Enterprise de nível bancário',
    'login.encrypted': 'Sistema Criptografado',
    'login.error': 'Erro ao fazer login',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Bem-vindo',
    
    // Common
    'common.logout': 'Sair',
    'common.language': 'Idioma',
    'common.settings': 'Configurações',
  },
  'en-US': {
    // Login
    'login.title': 'Access Your Account',
    'login.subtitle': 'Enter the Innovation.ia ecosystem',
    'login.email': 'Corporate Email',
    'login.email_placeholder': 'ex: admin@innovation.ia',
    'login.password': 'Your Password',
    'login.forgot_password': 'Forgot password?',
    'login.button': 'Enter Platform',
    'login.authenticating': 'Authenticating...',
    'login.no_account': "Don't have an account?",
    'login.contact_consultant': 'Talk to Consultant',
    'login.security': 'Enterprise-grade bank-level data protection',
    'login.encrypted': 'Encrypted System',
    'login.error': 'Login error',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome',
    
    // Common
    'common.logout': 'Logout',
    'common.language': 'Language',
    'common.settings': 'Settings',
  },
  'es-ES': {
    // Login
    'login.title': 'Accede a tu Cuenta',
    'login.subtitle': 'Entra en el ecosistema Innovation.ia',
    'login.email': 'Correo Corporativo',
    'login.email_placeholder': 'ej: admin@innovation.ia',
    'login.password': 'Tu Contraseña',
    'login.forgot_password': '¿Olvidaste la contraseña?',
    'login.button': 'Entrar a la Plataforma',
    'login.authenticating': 'Autenticando...',
    'login.no_account': '¿No tienes cuenta?',
    'login.contact_consultant': 'Hablar con Consultor',
    'login.security': 'Protección de datos de nivel empresarial',
    'login.encrypted': 'Sistema Encriptado',
    'login.error': 'Error al iniciar sesión',
    
    // Dashboard
    'dashboard.title': 'Panel',
    'dashboard.welcome': 'Bienvenido',
    
    // Common
    'common.logout': 'Salir',
    'common.language': 'Idioma',
    'common.settings': 'Configuración',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultValue?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('pt-BR');

  // Carregar idioma salvo do localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language | null;
    if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
      setLanguageState(savedLanguage);
      document.documentElement.lang = savedLanguage;
    }
  }, []);

  const setLanguage = (lang: Language) => {
    if (Object.keys(translations).includes(lang)) {
      setLanguageState(lang);
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang;
    } else {
      console.warn(`Idioma não suportado: ${lang}`);
    }
  };

  const t = (key: string, defaultValue: string = key): string => {
    return translations[language][key as keyof typeof translations['pt-BR']] || defaultValue;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
  }
  return context;
};
