'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Appearance = 'light' | 'dark' | 'system';
const AppearanceContext = createContext<{ appearance: Appearance; dark: boolean; setAppearance: (value: Appearance) => void } | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setMode] = useState<Appearance>('light');
  const [dark, setDark] = useState(false);
  const apply = useCallback((mode: Appearance) => {
    const nextDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', nextDark);
    document.documentElement.style.colorScheme = nextDark ? 'dark' : 'light';
    setDark(nextDark);
  }, []);
  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem('theme'); } catch { /* Storage may be restricted by the browser. */ }
    const mode: Appearance = stored === 'dark' || stored === 'system' ? stored : 'light';
    setMode(mode);
    apply(mode);
  }, [apply]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => { if (appearance === 'system') apply('system'); };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [appearance, apply]);
  const setAppearance = useCallback((mode: Appearance) => {
    try { localStorage.setItem('theme', mode); } catch { /* Keep the current session usable. */ }
    setMode(mode);
    apply(mode);
  }, [apply]);
  return <AppearanceContext.Provider value={{ appearance, dark, setAppearance }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('AppearanceProvider ausente.');
  return context;
}
