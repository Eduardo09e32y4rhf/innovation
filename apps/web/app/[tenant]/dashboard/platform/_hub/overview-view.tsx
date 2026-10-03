'use client';

import { AlertTriangle, Building2, CreditCard, Headset, Users } from 'lucide-react';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { BILLING_STATUS, COMPANY_STATUS, INVOICE_STATUS, WORKFLOW_STATUS, date, dateTime, money } from './format';
import { platformHub } from './hub-api';
import type { CompanyOverview, GlobalOverview, HubTab } from './types';

function Kpi({ label, value, hint, tone = 'default', icon: Icon }: { label: string; value: string | number; hint?: string; tone?: 'default' | 'good' | 'warn' | 'bad'; icon?: typeof Users }) {
  const tones = { default: 'text-fg', good: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-rose-600' };
  return (
    <article className="card-v2 p-4">
      <div className="flex items-center justify-between text-fg-sub"><p className="text-sm">{label}</p>{Icon && <Icon size={16} aria-hidden="true" />}</div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-sub">{hint}</p>}
    </article>
  );
}

function Pill({ map, value }: { map: Record<string, { label: string; tone: string }>; value: string }) {
  const item = map[value] ?? { label: value, tone: 'bg-zinc-100 text-zinc-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${item.tone}`}>{item.label}</span>;
}

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-fg-sub">{used} / {max}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Global({ data, onOpenCompany, onTab }: { data: GlobalOverview; onOpenCompany: (id: string, name?: string) => void; onTab: (tab: HubTab) => void }) {
  const c = data.companies;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Empresas" value={c.total} hint={`${c.byStatus.ACTIVE ?? 0} ativas · +${c.newLast30Days} em 30 dias`} icon={Building2} />
        <Kpi label="Usuários ativos" value={data.usage.users} icon={Users} />
        <Kpi label="Funcionários" value={data.usage.employees} icon={Users} />
        {data.finance && <Kpi label={`Recebido (${data.finance.month})`} value={money(data.finance.received)} tone="good" icon={CreditCard} />}
        {data.finance && <Kpi label="Em atraso" value={money(data.finance.overdue)} tone={data.finance.overdue ? 'bad' : 'default'} />}
        <Kpi label="Chamados abertos" value={data.support.open} icon={Headset} tone={data.support.open ? 'warn' : 'default'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-v2 p-4" aria-label="Inadimplência">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={15} className="text-rose-600" aria-hidden="true" /> Inadimplência</h2>
          {data.attention.overdue.length === 0 ? <p className="mt-3 text-sm text-fg-sub">Nenhuma empresa com fatura vencida.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.attention.overdue.map((row) => (
                <li key={row.companyId}><button type="button" className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-bg-sub" onClick={() => onOpenCompany(row.companyId, row.name)}>
                  <span className="truncate font-medium">{row.name}</span><span className="tabular-nums text-rose-700">{money(row.amount)} <span className="text-xs text-fg-sub">({row.invoices})</span></span>
                </button></li>
              ))}
            </ul>
          )}
        </section>
        <section className="card-v2 p-4" aria-label="Testes terminando">
          <h2 className="text-sm font-semibold">Testes terminando em 7 dias</h2>
          {data.attention.trials.length === 0 ? <p className="mt-3 text-sm text-fg-sub">Nenhum teste próximo do fim.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.attention.trials.map((row) => (
                <li key={row.companyId}><button type="button" className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-bg-sub" onClick={() => onOpenCompany(row.companyId, row.name)}><span className="truncate font-medium">{row.name}</span><span className="text-fg-sub">{date(row.endsAt)}</span></button></li>
              ))}
            </ul>
          )}
        </section>
        <section className="card-v2 p-4" aria-label="Perto do limite">
          <h2 className="text-sm font-semibold">Perto do limite do plano</h2>
          {data.attention.nearLimit.length === 0 ? <p className="mt-3 text-sm text-fg-sub">Nenhuma empresa perto do limite.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.attention.nearLimit.map((row) => (
                <li key={row.id}><button type="button" className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-bg-sub" onClick={() => onOpenCompany(row.id, row.name)}>
                  <span className="block truncate font-medium">{row.name}</span><span className="text-xs text-fg-sub">Usuários {row.users}/{row.maxUsers} · Funcionários {row.employees}/{row.maxEmployees}</span>
                </button></li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.integrations.webhookFailures > 0 && (
        <button type="button" onClick={() => onTab('financeiro')} className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900">
          <span><strong>{data.integrations.webhookFailures} evento(s) de pagamento falharam.</strong> Reprocesse em Financeiro → Integração.</span><span className="font-medium">Ver →</span>
        </button>
      )}

      <section aria-label="Atividade recente" className="card-v2 p-4">
        <h2 className="text-sm font-semibold">Atividade recente</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {data.recentActivity.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate"><strong>{item.action.replace(/_/g, ' ').toLowerCase()}</strong> <span className="text-fg-sub">· {item.company?.name ?? '—'}</span></span><span className="shrink-0 text-xs text-fg-sub">{dateTime(item.at)}</span></li>
          ))}
          {data.recentActivity.length === 0 && <li className="py-3 text-fg-sub">Sem atividade registrada.</li>}
        </ul>
      </section>
    </div>
  );
}

function Company({ data, onTab }: { data: CompanyOverview; onTab: (tab: HubTab) => void }) {
  const { company, usage, finance, accounting } = data;
  const sub = company.subscription;
  const closingsTotal = accounting.closings.reduce((total, row) => total + row.count, 0);
  const closingsPending = accounting.closings.filter((row) => ['DRAFT', 'IN_REVIEW'].includes(row.status)).reduce((total, row) => total + row.count, 0);
  const net = accounting.closings.reduce((total, row) => total + row.net, 0);
  return (
    <div className="space-y-5">
      <section className="card-v2 flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{company.name}</h2>
          <p className="text-sm text-fg-sub">{company.document} · {company.slug} · cliente desde {date(company.createdAt)}</p>
          <div className="mt-2 flex flex-wrap gap-2"><Pill map={COMPANY_STATUS} value={company.status} /><Pill map={BILLING_STATUS} value={company.billingStatus} /><span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">{sub?.plan?.name ?? company.plan}</span></div>
          {company.suspensionReason && <p className="mt-2 text-sm text-amber-700">Motivo da suspensão: {company.suspensionReason}</p>}
        </div>
        <div className="grid min-w-[240px] gap-3">
          <Meter label="Usuários" used={usage.users} max={usage.maxUsers} />
          <Meter label="Funcionários" used={usage.activeEmployees} max={usage.maxEmployees} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {finance && <Kpi label="Em atraso" value={money(finance.overdueTotal)} hint={`${finance.overdueCount} fatura(s)`} tone={finance.overdueCount ? 'bad' : 'good'} icon={CreditCard} />}
        {sub && <Kpi label="Próximo vencimento" value={date(sub.nextDueDate)} hint={sub.billingPaused ? 'Cobrança pausada' : `${sub.seatQuantity} licença(s)`} />}
        <Kpi label={`Fechamentos (${accounting.month})`} value={closingsTotal} hint={closingsPending ? `${closingsPending} pendente(s)` : 'Em dia'} tone={closingsPending ? 'warn' : 'default'} />
        <Kpi label="Líquido do mês" value={money(net)} hint="Soma dos fechamentos" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {finance && (
          <section className="card-v2 p-4" aria-label="Faturas">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Últimas faturas</h2><button type="button" className="text-xs text-purple-700 underline" onClick={() => onTab('financeiro')}>Ver financeiro</button></div>
            <ul className="mt-3 divide-y divide-border text-sm">
              {finance.invoices.slice(0, 6).map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-2 py-2"><span>{date(invoice.dueDate)} <span className="text-fg-sub">{invoice.invoiceNumber ? `· NF ${invoice.invoiceNumber}` : ''}</span></span><span className="flex items-center gap-2"><span className="tabular-nums">{money(invoice.amount)}</span><Pill map={INVOICE_STATUS} value={invoice.status} /></span></li>
              ))}
              {finance.invoices.length === 0 && <li className="py-3 text-fg-sub">Nenhuma fatura.</li>}
            </ul>
          </section>
        )}
        <section className="card-v2 p-4" aria-label="Contratos e suporte">
          <h2 className="text-sm font-semibold">Contratos e suporte</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.contracts.map((contract) => <li key={contract.id} className="flex justify-between gap-2"><span>Contrato {contract.status.toLowerCase()} · desde {date(contract.startsAt)}</span><span className="tabular-nums">{money(contract.agreedAmount)}</span></li>)}
            {data.contracts.length === 0 && <li className="text-fg-sub">Sem contrato manual.</li>}
            <li className="border-t border-border pt-2"><button type="button" className="text-left underline" onClick={() => onTab('suporte')}>{data.support.open} chamado(s) aberto(s)</button></li>
          </ul>
        </section>
        <section className="card-v2 p-4" aria-label="Contabilidade">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Contabilidade do mês</h2><button type="button" className="text-xs text-purple-700 underline" onClick={() => onTab('contabilidade')}>Abrir</button></div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {accounting.closings.map((row) => <li key={row.status} className="flex justify-between"><span>Fechamentos {WORKFLOW_STATUS[row.status] ?? row.status}</span><span className="tabular-nums">{row.count} · {money(row.net)}</span></li>)}
            {accounting.payroll.map((row) => <li key={`p${row.status}`} className="flex justify-between"><span>Folha {WORKFLOW_STATUS[row.status] ?? row.status}</span><span className="tabular-nums">{row.count} · {money(row.net)}</span></li>)}
            {accounting.closings.length + accounting.payroll.length === 0 && <li className="text-fg-sub">Nada gerado neste mês.</li>}
          </ul>
        </section>
        <section className="card-v2 p-4" aria-label="Atividade">
          <h2 className="text-sm font-semibold">Atividade recente</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.recentActivity.slice(0, 6).map((item) => <li key={item.id} className="flex justify-between gap-2 py-1.5"><span className="truncate">{item.action.replace(/_/g, ' ').toLowerCase()} <span className="text-fg-sub">{item.user ? `· ${item.user}` : ''}</span></span><span className="shrink-0 text-xs text-fg-sub">{dateTime(item.at)}</span></li>)}
            {data.recentActivity.length === 0 && <li className="py-2 text-fg-sub">Sem atividade.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function OverviewView({ companyId, onOpenCompany, onTab }: { companyId?: string; onOpenCompany: (id: string, name?: string) => void; onTab: (tab: HubTab) => void }) {
  const overview = useQuery(() => platformHub.overview(companyId), [companyId]);
  if (overview.error) return <ErrorState message={overview.error} onRetry={overview.refetch} />;
  if (overview.loading && !overview.data) return <LoadingState label="Carregando resumo…" />;
  const data = overview.data;
  if (!data) return null;
  return data.scope === 'GLOBAL' ? <Global data={data} onOpenCompany={onOpenCompany} onTab={onTab} /> : <Company data={data} onTab={onTab} />;
}
