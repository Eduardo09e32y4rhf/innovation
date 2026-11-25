'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'pt' | 'en' | 'es';

const STORAGE_KEY = 'app_locale';
const SUPPORTED_LOCALES: Locale[] = ['pt', 'en', 'es'];

const MESSAGES = {
  pt: {
    'nav.jobs': 'Vagas',
    'nav.account': 'Minha conta',
    'nav.login': 'Entrar',
    'share.label': 'Compartilhar:',
    'share.copied': 'Link copiado',
    'share.copy': 'Copiar link',
    'apply.title': 'Enviar candidatura',
    'apply.requiredHint': 'Campos com * são obrigatórios.',
    'apply.phonePlaceholder': '+55 (11) 91234-5678',
    'apply.submit': 'Enviar candidatura',
    'profile.save': 'Salvar perfil',
    'profile.saved': 'Tudo salvo.',
    'profile.unsaved': 'Alterações não salvas',
    'user.seatLimit':
      'A empresa usou todas as licenças contratadas. Aumente as licenças em Plano e cobrança para liberar novos acessos.',
  },
  en: {
    'nav.jobs': 'Jobs',
    'nav.account': 'My account',
    'nav.login': 'Sign in',
    'share.label': 'Share:',
    'share.copied': 'Link copied',
    'share.copy': 'Copy link',
    'apply.title': 'Submit application',
    'apply.requiredHint': 'Fields marked with * are required.',
    'apply.phonePlaceholder': '+1 (555) 123-4567',
    'apply.submit': 'Submit application',
    'profile.save': 'Save profile',
    'profile.saved': 'All changes saved.',
    'profile.unsaved': 'Unsaved changes',
    'user.seatLimit':
      'The company has used all contracted seats. Upgrade seats in Plan & Billing to enable new users.',
  },
  es: {
    'nav.jobs': 'Empleos',
    'nav.account': 'Mi cuenta',
    'nav.login': 'Iniciar sesión',
    'share.label': 'Compartir:',
    'share.copied': 'Enlace copiado',
    'share.copy': 'Copiar enlace',
    'apply.title': 'Enviar postulación',
    'apply.requiredHint': 'Los campos con * son obligatorios.',
    'apply.phonePlaceholder': '+34 (612) 345-678',
    'apply.submit': 'Enviar postulación',
    'profile.save': 'Guardar perfil',
    'profile.saved': 'Todo guardado.',
    'profile.unsaved': 'Cambios sin guardar',
    'user.seatLimit':
      'La empresa ha utilizado todas las licencias contratadas. Amplía las licencias en Plan y facturación para habilitar nuevos accesos.',
  },
} as const;

export type MessageKey = keyof typeof MESSAGES.pt;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') return 'pt';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch {
    // ignora bloqueio de storage
  }
  const navLang = (navigator.language || 'pt').toLowerCase();
  if (navLang.startsWith('en')) return 'en';
  if (navLang.startsWith('es')) return 'es';
  return 'pt';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt');

  useEffect(() => {
    const detected = detectBrowserLocale();
    setLocaleState(detected);
    document.documentElement.lang = detected === 'pt' ? 'pt-BR' : detected;
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 'pt' ? 'pt-BR' : next;
      document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignora bloqueio de storage
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      let text: string = MESSAGES[locale]?.[key] ?? MESSAGES.pt[key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replaceAll(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n deve ser usado dentro de <I18nProvider>');
  }
  return ctx;
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <label className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}>
      <span className="sr-only">Idioma / Language / Idioma</span>
      <select
        aria-label="Selecionar idioma"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="min-h-9 rounded-lg border border-[#e9e5f0] bg-white px-2.5 py-1 text-xs font-semibold text-[#241b38] hover:border-[#c7b0ed] focus:outline-none"
      >
        <option value="pt">PT</option>
        <option value="en">EN</option>
        <option value="es">ES</option>
      </select>
    </label>
  );
}
