'use client';

import { useQuery } from '@/app/hooks/use-data';
import type { FaturasCompanyRow } from '@/app/lib/api';
import CompanyFicha from '../../../financeiro/_views/_ficha';
import { StateBlock } from '../../../_components/page-shell';
import { platformHub } from '../../../_hub/hub-api';
import { date, money } from '../../../_hub/format';
import type { CompanyOverview } from '../../../_hub/types';

/** O diálogo de ações do Financeiro trabalha com esta linha resumida da empresa. */
export function toFaturasRow(company: CompanyOverview['company']): FaturasCompanyRow {
  const sub = company.subscription;
  return {
    id: company.id, name: company.name, document: company.document, status: company.status, billingStatus: company.billingStatus, plan: company.plan, trialEndsAt: company.trialEndsAt,
    subscription: sub ? { status: sub.status, seatQuantity: sub.seatQuantity, nextDueDate: sub.nextDueDate, billingPaused: sub.billingPaused } : null,
    open: { total: 0, count: 0 }, overdue: { total: 0, count: 0 },
  };
}

const Card = ({ label, value }: { label: string; value: string }) => <div className="card-v2 p-4"><p className="text-xs text-fg-mut">{label}</p><p className="mt-1 text-lg font-semibold text-fg">{value}</p></div>;

/** Assinatura: plano, limites, valores e as ações de cobrança (trocar plano, usuários, desconto, pausa...). */
export function TabAssinatura({ companyId, canWrite }: { companyId: string; canWrite: boolean }) {
  const overview = useQuery(() => platformHub.overview(companyId), [companyId]);
  const company = overview.data?.scope === 'COMPANY' ? overview.data.company : undefined;
  const sub = company?.subscription;
  return (
    <StateBlock loading={overview.loading && !overview.data} error={overview.error} empty={!company} emptyText="Sem dados da assinatura." loadingLabel="Carregando assinatura…" onRetry={overview.refetch}>
      {company && (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo da assinatura">
            <Card label="Plano" value={sub?.plan?.name ?? company.plan} />
            <Card label="Limite de usuários" value={`${company.maxUsers}`} />
            <Card label="Limite de funcionários" value={`${company.maxEmployees}`} />
            <Card label="Próximo vencimento" value={sub ? date(sub.nextDueDate) : 'Sem assinatura'} />
            <Card label="Mensalidade base" value={sub ? money(sub.baseMonthlyPrice) : '—'} />
            <Card label="Por usuário" value={sub ? money(sub.userMonthlyPrice) : '—'} />
            <Card label="Desconto" value={sub ? `${sub.discountPercent}%` : '—'} />
            <Card label="Cobrança" value={sub ? (sub.billingPaused ? 'Pausada' : 'Ativa') : '—'} />
          </section>
          {canWrite
            ? <CompanyFicha company={toFaturasRow(company)} part="acoes" onChanged={overview.refetch} />
            : <p className="card-v2 p-4 text-sm text-fg-sub">Seu perfil só consulta a assinatura. Alterações são feitas pelo CEO ou pelo DEV.</p>}
        </div>
      )}
    </StateBlock>
  );
}
