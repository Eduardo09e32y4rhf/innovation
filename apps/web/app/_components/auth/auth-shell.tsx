import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** Moldura única das telas de acesso (login, recuperação, cadastro), na identidade roxa da marca. */
export function AuthShell({ title, subtitle, children, footer, wide = false }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-x-hidden px-4 py-8"
      style={{ background: 'linear-gradient(135deg, var(--auth-bg-start) 0%, var(--auth-bg-mid) 55%, var(--auth-bg-end) 100%)' }}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-violet-400/15 blur-3xl" />
      <div className={`relative z-10 w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <Link href="/" className="mb-5 flex justify-center" aria-label="Innovation RH Connect — página inicial">
          <Image src="/logo-innovation-clean.png" alt="Innovation RH Connect" width={190} height={190} priority className="h-auto w-[clamp(120px,32vw,170px)] object-contain drop-shadow-2xl" />
        </Link>
        <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>}
          </header>
          {children}
        </div>
        {footer && <div className="mt-5 text-center text-sm text-white/80">{footer}</div>}
      </div>
    </main>
  );
}

export function AuthAlert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const tone = kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-purple-200 bg-purple-50 text-purple-900';
  return <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2.5 text-sm ${tone}`}>{children}</p>;
}

export const authInput = 'w-full min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 disabled:opacity-60 sm:text-sm';
export const authButton = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-60';
export const authLink = 'font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-700)] hover:underline';
