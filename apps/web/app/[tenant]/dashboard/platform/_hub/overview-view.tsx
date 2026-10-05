'use client';

import { AlertTriangle, ArrowUpRight, Building2, CheckCircle2, CreditCard, Headset, Hourglass, TrendingUp, Users } from 'lucide-react';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { BILLING_STATUS, COMPANY_STATUS, INVOICE_STATUS, WORKFLOW_STATUS, date, dateTime, money } from './format';
import { platformHub } from './hub-api';
import type { CompanyOverview, GlobalOverview, HubTab } from './types';

type Tone = 'default' | 'good' | 'warn' | 'bad';
const TONE: Record<Tone, { text: string; chip: string }> = {
  default: { text: 'text-fg', chip: 'bg-violet-50 text-violet-600' },
  good: { text: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
  warn: { text: 'text-amber-600', chip: 'bg-amber-50 text-amber-600' },
  bad: { text: 'text-rose-600', chip: 'bg-rose-50 text-rose-600' },
};

function Kpi({ label, value, hint, tone = 'default', icon: Icon }: { label: string; value: string | number; hint?: string; tone?: Tone; icon: typeof Users }) {
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

function Pill({ map, value }: { map: Record<string, { label: string; tone: string }>; value: string }) {
  const item = map[value] ?? { label: value, tone: 'bg-zinc-100 text-zinc-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.tone}`}>{item.label}</span>;
}

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-fg-sub">{used} / {max}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Panel({ title, icon: Icon, tone = 'default', action, children }: { title: string; icon?: typeof Users; tone?: Tone; action?: React.ReactNode; children: React.ReactNode }) {
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

const Empty = ({ children }: { children: React.ReactNode }) => <p className="flex items-center gap-2 rounded-xl bg-bg-sub p-3 text-sm text-fg-sub"><CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" /> {children}</p>;
const Row = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => <li><button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-bg-sub">{children}</button></li>;

function Global({ data, onOpenCompany, onTab }: { data: GlobalOverview; onOpenCompany: (id: string, name?: string) => void; onTab: (tab: HubTab) => void }) {
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
        <button type="button" onClick={() => onTab('financeiro')} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900">
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

function Company({ data, onTab }: { data: CompanyOverview; onTab: (tab: HubTab) => void }) {
  const { company, usage, finance, accounting } = data;
  const sub = company.subscription;
  const closingsTotal = accounting.closings.reduce((total, row) => total + row.count, 0);
  const closingsPending = accounting.closings.filter((row) => ['DRAFT', 'IN_REVIEW'].includes(row.status)).reduce((total, row) => total + row.count, 0);
  const net = accounting.closings.reduce((total, row) => total + row.net, 0);
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-bg p-5 shadow-sm">
        <div className="min-w-0">
          <h2 className="text-xl font-black">{company.name}</h2>
          <p className="text-sm text-fg-sub">{company.document} · {company.slug} · cliente desde {date(company.createdAt)}</p>
          <div className="mt-2 flex flex-wrap gap-2"><Pill map={COMPANY_STATUS} value={company.status} /><Pill map={BILLING_STATUS} value={company.billingStatus} /><span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">{sub?.plan?.name ?? company.plan}</span></div>
          {company.suspensionReason && <p className="mt-2 text-sm font-medium text-amber-700">Motivo da suspensão: {company.suspensionReason}</p>}
        </div>
        <div className="grid min-w-[240px] gap-3"><Meter label="Usuários" used={usage.users} max={usage.maxUsers} /><Meter label="Funcionários" used={usage.activeEmployees} max={usage.maxEmployees} /></div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {finance && <Kpi label="Em atraso" value={money(finance.overdueTotal)} hint={`${finance.overdueCount} fatura(s)`} tone={finance.overdueCount ? 'bad' : 'good'} icon={CreditCard} />}
        {sub && <Kpi label="Próximo vencimento" value={date(sub.nextDueDate)} hint={sub.billingPaused ? 'Cobrança pausada' : `${sub.seatQuantity} licença(s)`} icon={Hourglass} />}
        <Kpi label={`Fechamentos (${accounting.month})`} value={closingsTotal} hint={closingsPending ? `${closingsPending} pendente(s)` : 'Em dia'} tone={closingsPending ? 'warn' : 'default'} icon={CheckCircle2} />
        <Kpi label="Líquido do mês" value={money(net)} hint="Soma dos fechamentos" icon={TrendingUp} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {finance && (
          <Panel title="Últimas faturas" action={<button type="button" className="text-xs font-bold text-purple-700 underline" onClick={() => onTab('financeiro')}>Ver financeiro</button>}>
            <ul className="divide-y divide-border text-sm">
              {finance.invoices.slice(0, 6).map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-2 py-2"><span>{date(invoice.dueDate)} <span className="text-fg-sub">{invoice.invoiceNumber ? `· NF ${invoice.invoiceNumber}` : ''}</span></span><span className="flex items-center gap-2"><span className="tabular-nums font-semibold">{money(invoice.amount)}</span><Pill map={INVOICE_STATUS} value={invoice.status} /></span></li>
              ))}
              {finance.invoices.length === 0 && <li className="py-3 text-fg-sub">Nenhuma fatura.</li>}
            </ul>
          </Panel>
        )}
        <Panel title="Contratos e suporte">
          <ul className="space-y-2 text-sm">
            {data.contracts.map((contract) => <li key={contract.id} className="flex justify-between gap-2"><span>Contrato {contract.status.toLowerCase()} · desde {date(contract.startsAt)}</span><span className="tabular-nums font-semibold">{money(contract.agreedAmount)}</span></li>)}
            {data.contracts.length === 0 && <li className="text-fg-sub">Sem contrato manual.</li>}
            <li className="border-t border-border pt-2"><button type="button" className="font-semibold underline" onClick={() => onTab('suporte')}>{data.support.open} chamado(s) aberto(s)</button></li>
          </ul>
        </Panel>
        <Panel title="Contabilidade do mês" action={<button type="button" className="text-xs font-bold text-purple-700 underline" onClick={() => onTab('contabilidade')}>Abrir</button>}>
          <ul className="space-y-1.5 text-sm">
            {accounting.closings.map((row) => <li key={row.status} className="flex justify-between"><span>Fechamentos {WORKFLOW_STATUS[row.status] ?? row.status}</span><span className="tabular-nums">{row.count} · {money(row.net)}</span></li>)}
            {accounting.payroll.map((row) => <li key={`p${row.status}`} className="flex justify-between"><span>Folha {WORKFLOW_STATUS[row.status] ?? row.status}</span><span className="tabular-nums">{row.count} · {money(row.net)}</span></li>)}
            {accounting.closings.length + accounting.payroll.length === 0 && <li className="text-fg-sub">Nada gerado neste mês.</li>}
          </ul>
        </Panel>
        <Panel title="Atividade recente">
          <ul className="divide-y divide-border text-sm">
            {data.recentActivity.slice(0, 6).map((item) => <li key={item.id} className="flex justify-between gap-2 py-2"><span className="truncate"><strong>{item.summary ?? item.action.replace(/_/g, ' ').toLowerCase()}</strong> <span className="text-fg-sub">{item.user ? `· ${item.user}` : ''}</span></span><span className="shrink-0 text-xs text-fg-sub">{dateTime(item.at)}</span></li>)}
            {data.recentActivity.length === 0 && <li className="py-2 text-fg-sub">Sem atividade.</li>}
          </ul>
        </Panel>
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
