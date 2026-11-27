'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PortalFooter } from '@/app/carreiras/_components/portal-chrome';
import { CandidateHeader } from './candidate-header';
import { VerifyEmailBanner } from './verify-email-banner';
import { candidateApi, getCandidateToken, isUnauthorized, setCandidateToken, type CandidateProfile } from '@/app/carreiras/_lib/candidate-api';
import { useI18n } from '@/app/contexts/I18nContext';

type Session = { profile: CandidateProfile; setProfile: (profile: CandidateProfile) => void; signOut: () => Promise<void> };
const SessionContext = createContext<Session | null>(null);

export function useCandidateSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useCandidateSession fora da Área do candidato');
  return value;
}

/** Guarda da Área do candidato: sem sessão válida, manda para o login e volta para a mesma página depois. */
export function CandidateLayout({ children }: { children: ReactNode }) {
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
      <div className="candidate-portal min-h-screen bg-[#fbfafc] text-[#241b38]">
        <CandidateHeader signOut={signOut} />
        {profile && <VerifyEmailBanner profile={profile} onVerified={setProfile} />}
        {children}
        <PortalFooter />
      </div>
    </SessionContext.Provider>
  );
}
