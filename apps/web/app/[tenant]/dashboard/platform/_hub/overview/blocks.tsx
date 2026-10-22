'use client';

import { CheckCircle2, Users } from 'lucide-react';

export type Tone = 'default' | 'good' | 'warn' | 'bad';
export const TONE: Record<Tone, { text: string; chip: string }> = {
  default: { text: 'text-fg', chip: 'bg-violet-50 text-violet-600' },
  good: { text: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
  warn: { text: 'text-amber-600', chip: 'bg-amber-50 text-amber-600' },
  bad: { text: 'text-rose-600', chip: 'bg-rose-50 text-rose-600' },
};

export function Kpi({ label, value, hint, tone = 'default', icon: Icon }: { label: string; value: string | number; hint?: string; tone?: Tone; icon: typeof Users }) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-border bg-bg p-4 shadow-sm">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONE[tone].chip}`}><Icon size={22} aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className={`truncate text-2xl font-black tabular-nums ${TONE[tone].text}`}>{value}</p>
        <p className="truncate text-xs font-semibold text-fg-sub">{label}</p>
        {hint && <p className="truncate text-[11px] text-fg-mut">{hint}</p>}
      </div>
    </article>
  );
}

export function Pill({ map, value }: { map: Record<string, { label: string; tone: string }>; value: string }) {
  const item = map[value] ?? { label: value, tone: 'bg-zinc-100 text-zinc-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.tone}`}>{item.label}</span>;
}

export function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-fg-sub">{used} / {max}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function Panel({ title, icon: Icon, tone = 'default', action, children }: { title: string; icon?: typeof Users; tone?: Tone; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-bg p-4 shadow-sm" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-fg">{Icon && <Icon size={15} className={TONE[tone].text} aria-hidden="true" />} {title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export const Empty = ({ children }: { children: React.ReactNode }) => <p className="flex items-center gap-2 rounded-xl bg-bg-sub p-3 text-sm text-fg-sub"><CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" /> {children}</p>;
export const Row = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => <li><button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-bg-sub">{children}</button></li>;
