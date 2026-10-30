'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PortalFooter, PortalLogo } from '../../_components/portal-chrome';
import { VerifyEmailBanner } from './verify-email-banner';
import { candidateApi, getCandidateToken, isUnauthorized, setCandidateToken, type CandidateProfile } from '../../_lib/candidate-api';

type Session = { profile: CandidateProfile; setProfile: (profile: CandidateProfile) => void; signOut: () => Promise<void> };
const SessionContext = createContext<Session | null>(null);

export function useCandidateSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useCandidateSession fora da Área do candidato');
  return value;
}

const NAV = [
  { href: '/carreiras/conta', label: 'Painel' },
  { href: '/carreiras', label: 'Vagas abertas' },
  { href: '/carreiras/conta/perfil', label: 'Meu perfil' },
];

/** Guarda da Área do candidato: sem sessão válida, manda para o login e volta para a mesma página depois. */
export function AccountShell({ children }: { children: ReactNode }) {
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
  if (!value) return <main className="mx-auto max-w-xl p-6"><p role="status">Carregando sua conta…</p></main>;

  const initials = (profile?.name || profile?.email || '?').trim().slice(0, 2).toUpperCase();
  return (
    <SessionContext.Provider value={value}>
      <div className="min-h-screen bg-[#fbfafc] text-[#241b38]">
        <header className="border-b border-[#e9e5f0] bg-white">
          <div className="mx-auto flex min-h-[64px] max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:min-h-[80px] sm:px-9">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
              <PortalLogo />
              <nav aria-label="Área do candidato" className="flex flex-wrap gap-1.5">
                {NAV.map((item) => {
                  const active = item.href === '/carreiras' ? false : pathname === item.href;
                  return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-[10px] px-4 text-sm font-semibold ${active ? 'bg-[#f0eafa] text-[#5b29be]' : 'hover:bg-[#f1ecfb]'}`}>{item.label}</Link>;
                })}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-semibold sm:inline">{profile?.name || profile?.email}</span>
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e1145] text-sm font-bold text-white">{initials}</span>
              <button type="button" onClick={() => void signOut()} className="min-h-11 rounded-[10px] border border-[#d5cceb] px-4 text-sm font-semibold hover:bg-[#f1ecfb]">Sair</button>
            </div>
          </div>
        </header>
        {profile && <VerifyEmailBanner profile={profile} onVerified={setProfile} />}
        {children}
        <PortalFooter />
      </div>
    </SessionContext.Provider>
  );
}
