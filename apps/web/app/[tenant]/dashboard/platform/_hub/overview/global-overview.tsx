'use client';

import { AlertTriangle, ArrowUpRight, Building2, CheckCircle2, CreditCard, Headset, Hourglass, TrendingUp, Users } from 'lucide-react';
import { date, dateTime, money } from '../format';
import type { GlobalOverview } from '../types';
import { Kpi, Panel, Empty, Row } from './blocks';

export function GlobalOverviewPanel({ data, onOpenCompany, onFinance }: { data: GlobalOverview; onOpenCompany: (id: string, name?: string) => void; onFinance: () => void }) {
  const c = data.companies;
  const attention = data.attention.overdue.length + data.attention.trials.length + data.attention.nearLimit.length + (data.integrations.webhookFailures > 0 ? 1 : 0);
  return (
    <div className="space-y-5">
      <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-semibold ${attention ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>
        {attention ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
        {attention ? `${attention} ponto(s) precisam da sua atenção hoje. Veja abaixo.` : 'Tudo certo: nenhuma pendência na plataforma agora.'}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Empresas" value={c.total} hint={`${c.byStatus.ACTIVE ?? 0} ativas · +${c.newLast30Days} em 30 dias`} icon={Building2} />
        <Kpi label="Usuários ativos" value={data.usage.users} icon={Users} />
        <Kpi label="Funcionários" value={data.usage.employees} icon={Users} />
        {data.finance && <Kpi label={`Recebido em ${data.finance.month}`} value={money(data.finance.received)} tone="good" icon={TrendingUp} />}
        {data.finance && <Kpi label="Em atraso" value={money(data.finance.overdue)} tone={data.finance.overdue ? 'bad' : 'default'} icon={CreditCard} />}
        <Kpi label="Chamados abertos" value={data.support.open} icon={Headset} tone={data.support.open ? 'warn' : 'default'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Inadimplência" icon={AlertTriangle} tone="bad">
          {data.attention.overdue.length === 0 ? <Empty>Nenhuma empresa com fatura vencida.</Empty> : (
            <ul className="space-y-0.5">{data.attention.overdue.map((row) => (
              <Row key={row.companyId} onClick={() => onOpenCompany(row.companyId, row.name)}><span className="truncate font-semibold">{row.name}</span><span className="shrink-0 tabular-nums text-rose-700">{money(row.amount)} <span className="text-xs text-fg-sub">({row.invoices})</span></span></Row>
            ))}</ul>
          )}
        </Panel>
        <Panel title="Testes terminando em 7 dias" icon={Hourglass} tone="warn">
          {data.attention.trials.length === 0 ? <Empty>Nenhum teste perto do fim.</Empty> : (
            <ul className="space-y-0.5">{data.attention.trials.map((row) => (
              <Row key={row.companyId} onClick={() => onOpenCompany(row.companyId, row.name)}><span className="truncate font-semibold">{row.name}</span><span className="shrink-0 text-fg-sub">{date(row.endsAt)}</span></Row>
            ))}</ul>
          )}
        </Panel>
        <Panel title="Perto do limite do plano" icon={Users} tone="warn">
          {data.attention.nearLimit.length === 0 ? <Empty>Nenhuma empresa perto do limite.</Empty> : (
            <ul className="space-y-0.5">{data.attention.nearLimit.map((row) => (
              <Row key={row.id} onClick={() => onOpenCompany(row.id, row.name)}><span className="min-w-0"><span className="block truncate font-semibold">{row.name}</span><span className="text-xs text-fg-sub">Usuários {row.users}/{row.maxUsers} · Funcionários {row.employees}/{row.maxEmployees}</span></span></Row>
            ))}</ul>
          )}
        </Panel>
      </div>

      {data.integrations.webhookFailures > 0 && (
        <button type="button" onClick={() => onFinance()} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900">
          <span><strong>{data.integrations.webhookFailures} evento(s) de pagamento falharam.</strong> Reprocese em Financeiro.</span><span className="flex items-center gap-1 font-bold">Ver <ArrowUpRight size={14} aria-hidden="true" /></span>
        </button>
      )}

      <Panel title="Atividade recente">
        <ul className="divide-y divide-border text-sm">
          {data.recentActivity.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0 truncate"><strong>{item.summary ?? item.action.replace(/_/g, ' ').toLowerCase()}</strong> <span className="text-fg-sub">· {item.company?.name ?? '—'}</span></span><span className="shrink-0 text-xs text-fg-sub">{dateTime(item.at)}</span></li>
          ))}
          {data.recentActivity.length === 0 && <li className="py-3 text-fg-sub">Sem atividade registrada.</li>}
        </ul>
      </Panel>
    </div>
  );
}
