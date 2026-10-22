'use client';

import Link from 'next/link';
import { Clock3, ExternalLink } from 'lucide-react';
import type { PublicPlatformPlan } from '@/app/lib/api';
import { Button } from '@/app/components/ui';
import { DataTable, type Column } from '../../../_components/data-table';
import { lifecycleLabel, money, plainDate, planPricing, statusTone, type SubscriptionCompany } from './subscription-model';

interface SubscriptionListProps {
  rows: SubscriptionCompany[]; planById: Map<string, PublicPlatformPlan>; fichaHref: (companyId: string) => string; onDetails: (company: SubscriptionCompany) => void;
}

/** Uma linha por empresa: plano e preço, ciclo, integração e atalhos. Clicar em "Detalhes" abre o painel. */
export function SubscriptionList({ rows, planById, fichaHref, onDetails }: SubscriptionListProps) {
  const seatsOf = (c: SubscriptionCompany) => c.subscription?.seatQuantity ?? c.usersCount ?? 0;
  const columns: Column<SubscriptionCompany>[] = [
    { key: 'company', label: 'Empresa', cell: (c) => <><p className="font-semibold">{c.name}</p><p className="text-xs text-fg-sub">{c.document || 'Sem CNPJ'} · criada em {plainDate(c.createdAt)}</p></> },
    { key: 'plan', label: 'Plano', cell: (c) => {
      const plan = planById.get(c.platformPlanId || '');
      const pricing = planPricing(plan, seatsOf(c));
      return <><p className="font-semibold">{plan?.name || c.plan || 'Sem plano vinculado'}</p><p className="text-xs text-fg-sub">{pricing ? `Base ${money(pricing.base)} + ${money(pricing.user)} por usuário` : '—'}</p></>;
    } },
    { key: 'cycle', label: 'Ciclo', cell: (c) => {
      const status = c.billingStatus || c.subscription?.status || 'TRIAL';
      const next = c.subscription?.nextDueDate || c.trialEndsAt || c.subscription?.currentPeriodEnd;
      return (
        <div className="space-y-1">
          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusTone(status)}`}>{lifecycleLabel(c)}</span>
          <p className="flex items-center gap-1 text-xs text-fg-sub"><Clock3 size={11} aria-hidden="true" /> {next ? `Próximo marco: ${plainDate(next)}` : 'Sem vencimento definido'}</p>
          {c.subscription?.pendingSeatQuantity ? <p className="text-xs font-bold text-amber-700">Redução pendente para {c.subscription.pendingSeatQuantity} usuários</p> : null}
        </div>
      );
    } },
    { key: 'monthly', label: 'Mensalidade', cell: (c) => { const pricing = planPricing(planById.get(c.platformPlanId || ''), seatsOf(c)); return <><strong>{pricing ? money(pricing.total) : '—'}</strong><p className="text-xs text-fg-sub">{c.asaasCustomerId || c.asaasSubscriptionId ? 'Integrada ao provedor' : 'Aguardando integração'}</p></>; } },
    { key: 'seats', label: 'Usuários cobráveis', cell: (c) => seatsOf(c) },
    { key: 'actions', label: 'Ações', right: true, cell: (c) => (
      <span className="inline-flex flex-wrap justify-end gap-1.5">
        <Button size="sm" variant="outline" onClick={() => onDetails(c)}>Detalhes</Button>
        {c.asaasCustomerId && <a href={`https://www.asaas.com/customer/view/${c.asaasCustomerId}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm inline-flex items-center gap-1"><ExternalLink size={12} aria-hidden="true" /> Provedor</a>}
        <Link href={fichaHref(c.id)} className="btn btn-outline btn-sm">Ficha</Link>
      </span>
    ) },
  ];
  return <DataTable caption="Assinaturas" columns={columns} rows={rows} rowKey={(c) => c.id} />;
}
