'use client';

import Link from 'next/link';
import { CreditCard, X } from 'lucide-react';
import { useOverlay } from '@/app/components/ui/use-overlay';
import type { PublicPlatformPlan } from '@/app/lib/api';
import { lifecycleLabel, money, plainDate, planPricing, type SubscriptionCompany } from './subscription-model';

interface DetailProps {
  company: SubscriptionCompany; plan?: PublicPlatformPlan; onClose: () => void; fichaHref: string; faturasHref: string;
  canRunCheckout: boolean; working: boolean; onCheckout: () => void;
}

/** Painel lateral com os dados da assinatura e a estimativa de preço. */
export function SubscriptionDetail({ company, plan, onClose, fichaHref, faturasHref, canRunCheckout, working, onCheckout }: DetailProps) {
  const ref = useOverlay<HTMLDivElement>(true, onClose);
  const seats = company.subscription?.seatQuantity ?? company.usersCount ?? 0;
  const pricing = planPricing(plan, seats);
  const facts: Array<[string, string]> = [
    ['Plano', plan?.name || company.plan || 'Sem plano'], ['Situação financeira', company.billingStatus || company.subscription?.status || 'TRIAL'],
    ['Usuários cobrados', String(seats)], ['Próximo vencimento', plainDate(company.subscription?.nextDueDate || company.trialEndsAt || company.subscription?.currentPeriodEnd)],
    ['Cliente no provedor', company.asaasCustomerId || '-'], ['Assinatura no provedor', company.asaasSubscriptionId || '-'],
  ];
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Assinatura da empresa" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 p-0 sm:p-4">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-bg shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-fg-mut">Detalhe da assinatura</p>
            <h2 className="mt-1 truncate text-lg font-black text-fg">{company.name}</h2>
            <p className="mt-1 text-xs text-fg-sub">{company.document || 'Sem CNPJ'} · {lifecycleLabel(company)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-fg-mut hover:bg-bg-sub"><X size={18} /></button>
        </header>
        <div className="grid gap-4 overflow-y-auto p-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            {facts.map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-bg-sub p-3"><dt className="text-xs font-semibold text-fg-mut">{label}</dt><dd className="mt-1 break-all text-sm font-bold text-fg">{value}</dd></div>)}
          </dl>
          <dl className="grid gap-3 sm:grid-cols-3" aria-label="Precificação estimada">
            {([['Base', pricing?.base], ['Adicional por usuário', pricing?.user], ['Total', pricing?.total]] as const).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border p-3"><dt className="text-xs font-semibold text-fg-mut">{label}</dt><dd className="mt-1 text-sm font-black text-fg">{value === undefined ? '—' : money(value)}</dd></div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link href={faturasHref} className="btn btn-outline inline-flex min-h-11 items-center text-sm">Ver faturas</Link>
            <Link href={fichaHref} className="btn btn-outline inline-flex min-h-11 items-center text-sm">Abrir ficha do cliente</Link>
            {canRunCheckout && <button type="button" onClick={onCheckout} disabled={working} className="btn btn-primary inline-flex min-h-11 items-center gap-2 text-sm"><CreditCard size={14} aria-hidden="true" /> {working ? 'Gerando...' : 'Gerar cobrança'}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
