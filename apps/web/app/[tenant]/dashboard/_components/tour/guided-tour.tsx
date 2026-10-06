'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, Building2, CalendarDays, Calculator, Check, CheckCheck, Clock3, FileText, HelpCircle, Home, Inbox, KeyRound, Layers, LineChart, Palmtree, Users, Wallet, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { tourFor, type TourIcon } from './tour-content';

const ICONS: Record<TourIcon, LucideIcon> = {
  home: Home, clock: Clock3, calendar: CalendarDays, inbox: Inbox, palm: Palmtree, help: HelpCircle, users: Users, key: KeyRound,
  layers: Layers, check: CheckCheck, wallet: Wallet, file: FileText, chart: LineChart, building: Building2, briefcase: Briefcase, calculator: Calculator,
};

export const OPEN_TOUR_EVENT = 'iw:open-tour';
const storageKey = (userId: string) => `iw:tour:v1:${userId}`;
const readSeen = (userId: string) => { try { return window.localStorage.getItem(storageKey(userId)) === '1'; } catch { return false; } };
const writeSeen = (userId: string) => { try { window.localStorage.setItem(storageKey(userId), '1'); } catch { /* sem armazenamento: so reaparece no proximo login */ } };

/** Abre o passo a passo de qualquer lugar (botao "Como usar"). */
export function openGuidedTour() { window.dispatchEvent(new Event(OPEN_TOUR_EVENT)); }

/**
 * Apresentacao em passos, por perfil. Abre sozinha no primeiro acesso ao dashboard (depois das boas-vindas)
 * e pode ser reaberta a qualquer momento pelo botao "Como usar".
 */
export function GuidedTour() {
  const { user } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const tenant = String(params?.tenant ?? '');
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const userId = user?.id ?? '';
  const tour = tourFor(role);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => { setOpen(false); if (userId) writeSeen(userId); }, [userId]);

  useEffect(() => {
    const listener = () => { setIndex(0); setOpen(true); };
    window.addEventListener(OPEN_TOUR_EVENT, listener);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, listener);
  }, []);

  // Primeiro acesso: so na pagina inicial, e so depois que as boas-vindas forem fechadas.
  useEffect(() => {
    if (!userId || !tenant || pathname.replace(/\/+$/, '') !== `/${tenant}/dashboard` || readSeen(userId)) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (document.querySelector('.iw-overlay')) { if (tries > 90) window.clearInterval(timer); return; }
      window.clearInterval(timer);
      setIndex(0); setOpen(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [userId, tenant, pathname]);

  const steps = tour.steps;
  const last = index === steps.length - 1;

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowRight') setIndex((current) => Math.min(steps.length - 1, current + 1));
      else if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1));
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [open, close, steps.length]);

  if (!open || !userId) return null;
  const step = steps[index];
  const Icon = ICONS[step.icon];
  const href = step.href ? `/${tenant}${step.href}` : null;

  return (
    <div className="fixed inset-0 z-[100001] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text"
        className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-bg shadow-2xl outline-none sm:max-h-[92dvh] sm:rounded-3xl">
        <header className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-800 px-5 py-5 text-white sm:px-8 sm:py-6">
          <button type="button" onClick={close} aria-label="Fechar passo a passo" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/15"><X size={20} aria-hidden="true" /></button>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Como usar · {tour.label}</p>
          <p className="mt-1 max-w-md pr-10 text-sm text-white/85">{index === 0 ? tour.intro : `Passo ${index + 1} de ${steps.length}`}</p>
          <div className="mt-4 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1} aria-label={`Passo ${index + 1} de ${steps.length}`}>
            {steps.map((item, position) => (
              <button key={item.title} type="button" onClick={() => setIndex(position)} aria-label={`Ir para o passo ${position + 1}: ${item.title}`} aria-current={position === index ? 'step' : undefined}
                className={`h-2 flex-1 rounded-full transition ${position < index ? 'bg-white/70' : position === index ? 'bg-white' : 'bg-white/25'}`} />
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700"><Icon size={26} aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 id="tour-title" className="text-xl font-black leading-snug text-fg sm:text-2xl">{step.title}</h2>
              {step.where && <p className="mt-1 inline-flex max-w-full rounded-full bg-bg-sub px-3 py-1 text-xs font-semibold text-fg-sub">Onde: {step.where}</p>}
            </div>
          </div>
          <p id="tour-text" className="mt-5 text-base leading-relaxed text-fg">{step.text}</p>
          {step.tip && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Dica:</strong> {step.tip}</p>}
          {href && (
            <Link href={href} onClick={close} className="btn btn-outline mt-5 inline-flex">Abrir esta tela <ArrowRight size={16} aria-hidden="true" /></Link>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-8">
          <button type="button" onClick={close} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-fg-sub hover:text-fg">Pular</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0} className="btn btn-outline"><ArrowLeft size={16} aria-hidden="true" /> Voltar</button>
            {last
              ? <button type="button" onClick={close} className="btn btn-primary"><Check size={16} aria-hidden="true" /> Concluir</button>
              : <button type="button" onClick={() => setIndex((current) => Math.min(steps.length - 1, current + 1))} className="btn btn-primary" autoFocus>Próximo <ArrowRight size={16} aria-hidden="true" /></button>}
          </div>
        </footer>
      </div>
    </div>
  );
}
