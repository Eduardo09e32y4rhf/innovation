'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PortalFooter, PortalLogo } from '../../_components/portal-chrome';
import { VerifyEmailBanner } from './verify-email-banner';
import { candidateApi, getCandidateToken, isUnauthorized, setCandidateToken, type CandidateProfile } from '../../_lib/candidate-api';
import { useI18n } from '@/app/contexts/I18nContext';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { LogOut } from 'lucide-react';

type Session = { profile: CandidateProfile; setProfile: (profile: CandidateProfile) => void; signOut: () => Promise<void> };
const SessionContext = createContext<Session | null>(null);

export function useCandidateSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useCandidateSession fora da Área do candidato');
  return value;
}

const NAV = [
  { href: '/carreiras/vagas', label: 'Vagas' },
  { href: '/carreiras/conta/candidaturas', label: 'Minhas candidaturas' },
  { href: '/carreiras/conta/perfil', label: 'Meu perfil' },
];

/** Guarda da Área do candidato: sem sessão válida, manda para o login e volta para a mesma página depois. */
export function AccountShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState('');

  const goToLogin = useCallback(() => router.replace(`/carreiras/conta/entrar?next=${encodeURIComponent(pathname)}`), [router, pathname]);

  useEffect(() => {
    if (!getCandidateToken()) { goToLogin(); return; }
    let active = true;
    candidateApi.me().then((result) => { if (active) setProfile(result); }).catch((cause) => {
      if (!active) return;
      if (isUnauthorized(cause)) { setCandidateToken(null); goToLogin(); } else setError(cause instanceof Error ? cause.message : 'Não foi possível carregar sua conta.');
    });
    return () => { active = false; };
  }, [goToLogin]);

  const signOut = useCallback(async () => {
    try { await candidateApi.logout(); } catch { /* sai mesmo sem conexão */ }
    setCandidateToken(null);
    router.replace('/carreiras');
  }, [router]);

  const value = useMemo(() => (profile ? { profile, setProfile, signOut } : null), [profile, signOut]);

  if (error) return <main className="mx-auto max-w-xl p-6"><p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{error}</p></main>;
  if (!value) return <main className="mx-auto max-w-xl p-6"><p role="status">{t('Carregando sua conta…')}</p></main>;

  return (
    <SessionContext.Provider value={value}>
      <div className="min-h-screen bg-[#fbfafc] text-[#241b38]">
        <header className="border-b border-[#e9e5f0] bg-white">
          <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex sm:min-h-[80px] sm:justify-between sm:gap-4 sm:px-9">
            <PortalLogo />
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <LanguageSwitcher compactOnMobile />
              <button type="button" onClick={() => void signOut()} className="inline-flex min-h-11 w-11 items-center justify-center rounded-[10px] border border-[#d5cceb] hover:bg-[#f1ecfb] sm:w-auto sm:gap-2 sm:px-4 sm:text-sm sm:font-semibold" aria-label={t('Sair')} title={t('Sair')}>
                <LogOut aria-hidden="true" size={17} />
                <span className="sr-only sm:not-sr-only">{t('Sair')}</span>
              </button>
            </div>
            <nav aria-label={t('Área do candidato')} className="col-span-2 flex min-w-0 gap-1.5 overflow-x-auto border-t border-[#e9e5f0] pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:col-span-1 sm:border-0 sm:pt-0">
                {NAV.map((item) => {
                  const active = item.href === '/carreiras' ? false : pathname === item.href;
                  return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-[10px] px-3 text-sm font-semibold sm:min-h-11 sm:px-4 ${active ? 'bg-[#f0eafa] text-[#5b29be]' : 'hover:bg-[#f1ecfb]'}`}>{t(item.label)}</Link>;
                })}
            </nav>
          </div>
        </header>
        {profile && <VerifyEmailBanner profile={profile} onVerified={setProfile} />}
        {children}
        <PortalFooter />
      </div>
    </SessionContext.Provider>
  );
}
