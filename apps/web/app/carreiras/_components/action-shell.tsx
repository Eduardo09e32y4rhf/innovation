import type { ReactNode } from 'react';
import { PortalFooter, PortalHeader } from './portal-chrome';

/** Moldura das paginas abertas pelos links do e-mail (entrevista, horarios, proposta, teste). */
export function ActionShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fbfafc] text-[#241b38]">
      <PortalHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-8 sm:py-12">{children}</main>
      <PortalFooter />
    </div>
  );
}

export const actionCard = 'rounded-[18px] border border-[#ebe6f3] bg-white p-5 shadow-[0_1px_2px_rgba(30,17,69,0.04)] sm:p-6';
export const primaryBtn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[#7240da] px-5 text-sm font-bold text-white transition hover:bg-[#5b29be] disabled:opacity-60';
export const outlineBtn = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-[#d9cdee] bg-white px-5 text-sm font-bold text-[#5b29be] transition hover:bg-[#f0eafa] disabled:opacity-60';

export function Notice({ tone, children }: { tone: 'success' | 'error' | 'info'; children: ReactNode }) {
  const tones = { success: 'border-emerald-200 bg-emerald-50 text-emerald-900', error: 'border-rose-200 bg-rose-50 text-rose-900', info: 'border-[#e4d9f4] bg-[#f8f5fd] text-[#3b2a63]' };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[14px] border p-4 text-sm ${tones[tone]}`}>{children}</div>;
}
