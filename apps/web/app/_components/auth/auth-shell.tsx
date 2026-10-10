import { Briefcase, CalendarRange, CheckCircle2, Clock3 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import '../../landing.css';

const HIGHLIGHTS = [
  { icon: Briefcase, text: 'Vagas, portal de carreiras e funil de candidatos' },
  { icon: CalendarRange, text: 'Escalas, férias e fechamento da equipe' },
  { icon: Clock3, text: 'Ponto por localização, com ajuste aprovado pelo gestor' },
];

/** Moldura única das telas de acesso (login, recuperação, cadastro), no mesmo visual da página inicial. */
export function AuthShell({ title, subtitle, children, footer, wide = false }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  return (
    <main className="relative min-h-[100svh] overflow-x-hidden"
      style={{ background: 'linear-gradient(170deg, var(--auth-bg-start) 0%, var(--auth-bg-mid) 45%, var(--auth-bg-end) 100%)' }}>
      <div aria-hidden="true" className="lp-grid-bg absolute inset-0" />
      <div aria-hidden="true" className="lp-glow pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-[110px]" />
      <div aria-hidden="true" className="lp-glow pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-amber-400/20 blur-[110px]" />

      <div className={`relative z-10 mx-auto grid min-h-[100svh] max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:gap-16 ${wide ? 'lg:grid-cols-[1fr_minmax(0,40rem)]' : 'lg:grid-cols-[1fr_minmax(0,28rem)]'}`}>
        {/* Painel da marca (só em telas largas) */}
        <aside className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Innovation RH Connect — página inicial">
            <Image src="/logo-innovation-clean.png" alt="" width={96} height={96} priority className="h-12 w-12 rounded-full object-cover" />
            <span className="text-lg font-bold tracking-tight text-white">Innovation <span className="font-medium text-purple-300">RH Connect</span></span>
          </Link>
          <h2 className="mt-10 text-5xl font-extrabold leading-[1.08] tracking-tight text-white">Contrate bem.<span className="lp-text-warm block">Cuide melhor.</span></h2>
          <p className="mt-5 max-w-md text-lg text-white/75">Da vaga aberta ao mês fechado, tudo no mesmo lugar.</p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 shadow-lg shadow-fuchsia-900/40"><Icon size={18} aria-hidden="true" /></span>{text}
              </li>
            ))}
          </ul>
          <div className="lp-float-slow mt-10 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-[#120a2e]/80 px-4 py-3 text-sm text-white shadow-xl backdrop-blur">
            <span className="lp-wiggle text-2xl" aria-hidden="true">🎉</span>
            <span><span className="block font-semibold">Contratação fechada</span><span className="flex items-center gap-1 text-xs text-white/60"><CheckCircle2 size={12} className="text-emerald-300" aria-hidden="true" /> documentos recebidos por link</span></span>
          </div>
        </aside>

        <div className="w-full">
          {/* Logo no celular, onde o painel some */}
          <Link href="/" className="mb-5 flex justify-center lg:hidden" aria-label="Innovation RH Connect — página inicial">
            <Image src="/logo-innovation-clean.png" alt="Innovation RH Connect" width={190} height={190} priority className="lp-float h-auto w-[clamp(100px,28vw,130px)] rounded-full object-contain drop-shadow-2xl" />
          </Link>
          <div className="rounded-3xl bg-gradient-to-br from-fuchsia-400/60 via-purple-400/30 to-amber-300/60 p-px shadow-[0_24px_80px_-20px_rgba(217,70,239,.55)]">
            <div className="rounded-[calc(1.5rem-1px)] bg-white p-5 sm:p-8">
              <header className="mb-6 text-center">
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{title}</h1>
                {subtitle && <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>}
              </header>
              {children}
            </div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-white/80">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

export function AuthAlert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const tone = kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-purple-200 bg-purple-50 text-purple-900';
  return <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2.5 text-sm ${tone}`}>{children}</p>;
}

export const authInput = 'w-full min-h-11 rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 disabled:opacity-60 sm:text-sm';
export const authButton = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 text-sm font-bold text-white shadow-lg shadow-fuchsia-900/20 transition hover:-translate-y-0.5 hover:from-fuchsia-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';
export const authLink = 'font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-700)] hover:underline';
