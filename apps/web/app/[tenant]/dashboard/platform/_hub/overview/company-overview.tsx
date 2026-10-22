'use client';

import { CheckCircle2, CreditCard, Hourglass, TrendingUp } from 'lucide-react';
import { BILLING_STATUS, COMPANY_STATUS, INVOICE_STATUS, WORKFLOW_STATUS, date, dateTime, money } from '../format';
import type { CompanyOverview } from '../types';
import { Kpi, Pill, Meter, Panel } from './blocks';

export function CompanyOverviewPanel({ data, onGo }: { data: CompanyOverview; onGo: (target: 'faturas' | 'suporte' | 'contabilidade') => void }) {
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
          <Panel title="Últimas faturas" action={<button type="button" className="text-xs font-bold text-purple-700 underline" onClick={() => onGo('faturas')}>Ver financeiro</button>}>
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
            <li className="border-t border-border pt-2"><button type="button" className="font-semibold underline" onClick={() => onGo('suporte')}>{data.support.open} chamado(s) aberto(s)</button></li>
          </ul>
        </Panel>
        <Panel title="Contabilidade do mês" action={<button type="button" className="text-xs font-bold text-purple-700 underline" onClick={() => onGo('contabilidade')}>Abrir</button>}>
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
