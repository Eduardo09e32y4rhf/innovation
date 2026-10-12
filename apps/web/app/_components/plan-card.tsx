'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PublicPlatformPlan } from '@/app/lib/api';

export const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const num = (value: unknown) => { const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

/** Texto padrão quando o plano ainda não tem itens cadastrados na área de planos. */
const FALLBACK: Record<string, (n: number) => string[]> = {
  RS: (n) => [`${n} vagas por mês inclusas`, 'Recrutamento completo', 'Portal de carreiras e funil de candidatos'],
  BASICO: (n) => [`${n} colaboradores inclusos`, 'Escalas, férias e fechamento da equipe', 'Ponto por localização, com ajuste aprovado pelo gestor'],
  PREMIUM: (n) => [`${n} colaboradores inclusos`, 'Tudo do plano Básico', 'Recrutamento e Seleção completo'],
};

/** Tudo que o card mostra vem do plano cadastrado (editável na área de planos): preço, itens e adicional. */
export function planCardData(plan: PublicPlatformPlan) {
  const price = num(plan.baseMonthlyPrice) || num(plan.price);
  const features = plan.features?.length ? plan.features : (FALLBACK[plan.code ?? '']?.(plan.includedUnits ?? 0) ?? []);
  const extraPrice = num(plan.userMonthlyPrice);
  const unit = plan.extraUnitLabel === 'vaga' || plan.code === 'RS' ? 'vaga' : 'colaborador';
  return { price, features, extra: extraPrice > 0 ? { label: unit === 'vaga' ? 'Vaga adicional' : 'Colaborador adicional', text: `${brl(extraPrice)} por ${unit}` } : null };
}

export type PlanCardTone = 'dark' | 'light';

/** Card de plano usado na landing e no cadastro: mesmo desenho nos dois lugares. */
export function PlanCard({ plan, tone = 'dark', selected, onSelect, footer }: { plan: PublicPlatformPlan; tone?: PlanCardTone; selected?: boolean; onSelect?: () => void; footer?: ReactNode }) {
  const { price, features, extra } = planCardData(plan);
  const light = tone === 'light' || Boolean(plan.isRecommended);
  const [reais, cents] = price.toFixed(2).split('.');
  const interactive = Boolean(onSelect);
  const ring = selected ? 'ring-2 ring-[var(--color-brand)]' : '';
  const body = (
    <>
      {plan.isRecommended && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">⚡ Mais popular</span>}
      <h3 className="text-xl font-bold">{plan.name}</h3>
      {plan.description && <p className={`mt-1 text-xs ${light ? 'text-purple-600' : 'text-purple-200'}`}>{plan.description}</p>}
      <p className="mt-5 flex items-baseline gap-1 font-bold tabular-nums">
        {plan.isFree ? <span className="text-4xl">Grátis</span> : (<><span className="text-sm">R$</span><span className="text-5xl">{reais},{cents}</span><span className={`text-xs font-medium ${light ? 'text-zinc-500' : 'text-white/60'}`}>/mês</span></>)}
      </p>
      <hr className={`my-4 ${light ? 'border-zinc-200' : 'border-white/15'}`} />
      <ul className={`flex-1 space-y-2 text-sm ${light ? 'text-zinc-700' : 'text-white/85'}`}>
        {features.map((item) => <li key={item} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[var(--color-brand-400)]" aria-hidden="true" />{item}</li>)}
      </ul>
      {extra && <p className={`mt-5 rounded-lg px-3 py-2 text-xs ${light ? 'bg-purple-50 text-zinc-700' : 'bg-white/10 text-white/80'}`}>{extra.label}: <strong>{extra.text}</strong></p>}
      {footer}
    </>
  );
  const base = `relative flex h-full w-full flex-col rounded-2xl p-6 text-left ${light ? `bg-white text-zinc-900 ${plan.isRecommended ? 'shadow-[0_0_40px_rgba(192,132,252,0.55)]' : 'border border-zinc-200 shadow-sm'}` : 'border border-white/15 bg-white/5 text-white'} ${ring}`;
  if (interactive) return <button type="button" role="radio" aria-checked={Boolean(selected)} onClick={onSelect} className={`${base} transition hover:border-purple-300`}>{body}</button>;
  return <article className={base}>{body}</article>;
}