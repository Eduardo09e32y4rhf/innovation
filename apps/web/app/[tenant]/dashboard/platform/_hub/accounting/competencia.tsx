'use client';

import { AlertTriangle, Building2, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { WORKFLOW_STATUS, errorText, money } from '../format';
import { platformHub } from '../hub-api';
import type { AccountingCompany, AccountingGlobal } from '../types';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { input, Closing, Payroll, saveCsv, Kpi, StatusPill, Obligations } from './parts';
import { PayrollDialog, ClosingDialog } from './dialogs';

export type GlobalFilter = 'todas' | 'pendentes' | 'sem';

export function GlobalCompetencia({ g, month, onOpenCompany }: { g: AccountingGlobal; month: string; onOpenCompany: (id: string, name?: string) => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GlobalFilter>('todas');
  const t = g.totals;
  const rows = useMemo(() => g.companies.filter((row) => {
    if (filter === 'pendentes' && row.closingsPending + row.payrollsPending === 0) return false;
    if (filter === 'sem' && (row.closings > 0 || row.payrolls > 0)) return false;
    return !search.trim() || row.name.toLowerCase().includes(search.trim().toLowerCase()) || (row.document ?? '').includes(search.trim());
  }), [g.companies, search, filter]);
  const counts = { todas: g.companies.length, pendentes: g.companies.filter((r) => r.closingsPending + r.payrollsPending > 0).length, sem: g.companies.filter((r) => r.closings === 0 && r.payrolls === 0).length };
  const pendingTotal = t.closingsPending + t.payrollsPending;

  return (
    <div className="space-y-4">
      <p className={`flex items-center gap-2 rounded-2xl border p-3.5 text-sm font-semibold ${pendingTotal ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>
        {pendingTotal ? <AlertTriangle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
        {pendingTotal ? `${pendingTotal} item(ns) ainda pendente(s) de revisão em ${counts.pendentes} empresa(s).` : 'Nenhuma pendência de revisão nesta competência.'}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Empresas com folha" value={`${t.withClosings} / ${t.companies}`} />
        <Kpi label="Fechamentos" value={String(t.closings)} hint={t.closingsPending ? `${t.closingsPending} pendente(s)` : 'Todos revisados'} tone={t.closingsPending ? 'warn' : 'good'} />
        <Kpi label="Folhas" value={String(t.payrolls ?? 0)} hint={t.payrollsPending ? `${t.payrollsPending} pendente(s)` : undefined} tone={t.payrollsPending ? 'warn' : undefined} />
        <Kpi label="Bruto" value={money(t.gross)} />
        <Kpi label="Encargos" value={money(t.inss + t.irrf + t.fgts)} hint="INSS + IRRF + FGTS" />
        <Kpi label="Líquido" value={money(t.net)} tone="good" />
      </div>
      <Obligations month={month} inss={t.inss} irrf={t.irrf} fgts={t.fgts} />

      <section aria-label="Empresas" className="rounded-2xl border border-border bg-bg shadow-sm">
        <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-3 text-fg-sub" aria-hidden="true" />
            <input className="input-v2 !rounded-full !pl-10 w-full text-sm" placeholder="Buscar empresa ou CNPJ" aria-label="Buscar empresa" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {([['todas', 'Todas'], ['pendentes', 'Com pendência'], ['sem', 'Sem fechamento']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`min-h-9 rounded-full px-3.5 text-xs font-bold ${filter === id ? 'bg-slate-900 text-white' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{label} · {counts[id]}</button>
          ))}
          <Button variant="outline" size="sm" onClick={() => saveCsv(`contabilidade-${month}.csv`, [['Empresa', 'CNPJ', 'Fechamentos', 'Pendentes', 'Bruto', 'INSS', 'IRRF', 'FGTS', 'Líquido'], ...rows.map((r) => [r.name, r.document ?? '', r.closings, r.closingsPending, r.gross, r.inss, r.irrf, r.fgts, r.net])])}><FileSpreadsheet size={14} aria-hidden="true" /> CSV</Button>
        </header>
        {rows.length === 0 ? <div className="p-4"><EmptyState message="Nenhuma empresa para este filtro." /></div> : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => onOpenCompany(row.id, row.name)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 p-4 text-left hover:bg-bg-sub md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 text-sm font-black text-white"><Building2 size={17} aria-hidden="true" /></span>
                    <span className="min-w-0"><span className="block truncate text-sm font-bold text-fg">{row.name}</span><span className="block text-xs text-fg-sub">{row.document ?? 'Sem CNPJ'}</span></span>
                  </span>
                  <span className="hidden md:block"><span className="block text-[11px] font-semibold uppercase text-fg-mut">Fechamentos</span><span className="text-sm font-semibold tabular-nums">{row.closings}{row.closingsPending > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-800">{row.closingsPending} pend.</span>}</span></span>
                  <span className="hidden md:block"><span className="block text-[11px] font-semibold uppercase text-fg-mut">Bruto</span><span className="text-sm tabular-nums">{money(row.gross)}</span></span>
                  <span className="hidden md:block"><span className="block text-[11px] font-semibold uppercase text-fg-mut">Encargos</span><span className="text-sm tabular-nums">{money(row.inss + row.irrf + row.fgts)}</span></span>
                  <span className="text-right"><span className="block text-[11px] font-semibold uppercase text-fg-mut">Líquido</span><span className="text-sm font-black tabular-nums text-emerald-600">{money(row.net)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- uma empresa ----------

export function CompanyCompetencia({ c, month, canEdit, refetch }: { c: AccountingCompany; month: string; canEdit: boolean; refetch: () => void }) {
  const [tab, setTab] = useState<'fechamentos' | 'folha'>('fechamentos');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [closing, setClosing] = useState<Closing | null>(null);
  const [busy, setBusy] = useState(false);

  const list = (tab === 'fechamentos' ? c.closings : c.payrolls) as Array<Closing | Payroll>;
  const statuses = [...new Set(list.map((row) => row.status))];
  const filtered = list.filter((row) => (!status || row.status === status) && (!search.trim() || (row.employee?.name ?? '').toLowerCase().includes(search.trim().toLowerCase())));
  const pending = c.closings.filter((r) => ['DRAFT', 'IN_REVIEW'].includes(r.status)).length;
  const rule = Object.values(c.ruleVersions).filter(Boolean).join(' · ');

  const approvable = list.filter((row) => row.status === 'DRAFT' || (tab === 'fechamentos' && row.status === 'IN_REVIEW'));
  const askConfirm = useConfirm();
  async function approveAll() {
    if (busy) return;
    if (!(await askConfirm({ title: 'Aprovar em lote', description: `Aprovar ${approvable.length} item(ns) de uma vez? Confira os valores antes.`, confirmText: `Aprovar ${approvable.length} item(ns)`, variant: 'primary' }))) return;
    setBusy(true);
    let ok = 0; let fail = 0;
    for (const row of approvable) {
      try { if (tab === 'fechamentos') await platformHub.closingWorkflow(row.id, 'APPROVE'); else await platformHub.payrollWorkflow(row.id, 'APPROVE'); ok++; } catch { fail++; }
    }
    setBusy(false); refetch();
    if (fail) toast.warning(`${ok} aprovado(s); ${fail} não puderam ser aprovados (confira valores inválidos).`); else toast.success(`${ok} item(ns) aprovado(s).`);
  }

  async function recalc() {
    setBusy(true);
    try { const out = await platformHub.recalculateClosings(c.company.id, month); toast.success(`${out.generated} fechamento(s) recalculado(s) com as regras atuais.`); refetch(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível recalcular.')); }
    finally { setBusy(false); }
  }

  const fields = (row: Closing | Payroll) => 'grossPay' in row
    ? { gross: row.grossPay, inss: row.inssDiscount, irrf: row.irrfDiscount, fgts: row.fgtsAmount, net: row.netPay }
    : { gross: row.grossSalary, inss: row.inssAmount, irrf: row.irrfAmount, fgts: row.fgtsAmount, net: row.netSalary };

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-bg p-4 shadow-sm">
        <div className="min-w-0"><h2 className="truncate text-lg font-black text-fg">{c.company.name}</h2><p className="text-xs text-fg-sub">{c.company.document ?? 'Sem CNPJ'}{rule ? ` · regras: ${rule}` : ''}</p></div>
        <div className="flex flex-wrap gap-2">
          {canEdit && approvable.length > 0 && <Button isLoading={busy} onClick={approveAll}><CheckCircle2 size={15} aria-hidden="true" /> Aprovar {approvable.length} pendente(s)</Button>}
          {canEdit && <Button variant="outline" isLoading={busy} onClick={recalc}><RefreshCw size={15} aria-hidden="true" /> Recalcular rascunhos</Button>}
          <Button variant="outline" onClick={() => saveCsv(`${c.company.name}-${tab}-${month}.csv`, [['Funcionário', 'Cargo', 'Situação', 'Bruto', 'INSS', 'IRRF', 'FGTS', 'Líquido'], ...filtered.map((row) => { const f = fields(row); return [row.employee?.name ?? '', row.employee?.position ?? '', WORKFLOW_STATUS[row.status] ?? row.status, f.gross, f.inss, f.irrf, f.fgts, f.net]; })])}><Download size={15} aria-hidden="true" /> CSV</Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Fechamentos" value={String(c.totals.closings)} hint={pending ? `${pending} em revisão/rascunho` : 'Todos revisados'} tone={pending ? 'warn' : 'good'} />
        <Kpi label="Folhas" value={String(c.payrolls.length)} />
        <Kpi label="Bruto" value={money(c.totals.gross)} />
        <Kpi label="INSS" value={money(c.totals.inss)} />
        <Kpi label="IRRF" value={money(c.totals.irrf)} />
        <Kpi label="Líquido" value={money(c.totals.net)} tone="good" />
      </div>
      <Obligations month={month} inss={c.totals.inss} irrf={c.totals.irrf} fgts={c.totals.fgts} />

      <section className="rounded-2xl border border-border bg-bg shadow-sm">
        <header className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          {([['fechamentos', 'Fechamentos de ponto', c.closings.length], ['folha', 'Folha de pagamento', c.payrolls.length]] as const).map(([id, label, n]) => (
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setStatus(''); }} className={`min-h-9 rounded-full px-4 text-sm font-bold ${tab === id ? 'bg-purple-600 text-white' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{label} · {n}</button>
          ))}
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-3 text-fg-sub" aria-hidden="true" />
            <input className="input-v2 !rounded-full !pl-9 w-full text-sm" placeholder="Buscar funcionário" aria-label="Buscar funcionário" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </header>
        {statuses.length > 1 && (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
            <button type="button" aria-pressed={!status} onClick={() => setStatus('')} className={`rounded-full px-3 py-1 text-xs font-bold ${!status ? 'bg-slate-900 text-white' : 'border border-border text-fg-sub'}`}>Todos</button>
            {statuses.map((s) => <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 text-xs font-bold ${status === s ? 'bg-slate-900 text-white' : 'border border-border text-fg-sub'}`}>{WORKFLOW_STATUS[s] ?? s} · {list.filter((r) => r.status === s).length}</button>)}
          </div>
        )}
        {filtered.length === 0 ? <p className="p-6 text-center text-sm text-fg-sub">{list.length === 0 ? `Nenhum ${tab === 'fechamentos' ? 'fechamento' : 'registro de folha'} nesta competência.` : 'Nada encontrado com esses filtros.'}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">{tab === 'fechamentos' ? 'Fechamentos de ponto' : 'Folha de pagamento'}</caption>
              <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Funcionário', 'Situação', 'Bruto', 'INSS', 'IRRF', 'FGTS', 'Líquido'].map((l) => <th key={l} scope="col" className="px-4 py-2.5 font-semibold">{l}</th>)}</tr></thead>
              <tbody>
                {filtered.map((row) => {
                  const f = fields(row);
                  return (
                    <tr key={row.id} tabIndex={0} className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-sub focus:bg-bg-sub focus:outline-none" onClick={() => ('grossPay' in row ? setClosing(row) : setPayroll(row))} onKeyDown={(e) => { if (e.key === 'Enter') ('grossPay' in row ? setClosing(row) : setPayroll(row)); }}>
                      <th scope="row" className="px-4 py-3 text-left"><span className="block font-bold text-fg">{row.employee?.name}</span><span className="block text-xs font-normal text-fg-sub">{row.employee?.position ?? ''}</span></th>
                      <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                      <td className="px-4 py-3 tabular-nums">{money(f.gross)}</td>
                      <td className="px-4 py-3 tabular-nums text-rose-600">{money(f.inss)}</td>
                      <td className="px-4 py-3 tabular-nums text-rose-600">{money(f.irrf)}</td>
                      <td className="px-4 py-3 tabular-nums text-fg-sub">{money(f.fgts)}</td>
                      <td className="px-4 py-3 font-black tabular-nums text-emerald-600">{money(f.net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <PayrollDialog item={payroll} canEdit={canEdit} onClose={() => setPayroll(null)} onDone={refetch} />
      <ClosingDialog item={closing} canEdit={canEdit} onClose={() => setClosing(null)} onDone={refetch} />
    </div>
  );
}

export function Competencia({ companyId, month, canEdit, onOpenCompany }: { companyId?: string; month: string; canEdit: boolean; onOpenCompany: (id: string, name?: string) => void }) {
  const data = useQuery(() => platformHub.accounting(month, companyId), [month, companyId]);
  if (data.error) return <ErrorState message={data.error} onRetry={data.refetch} />;
  if (data.loading && !data.data) return <LoadingState label="Carregando competência…" />;
  const value = data.data;
  if (!value) return null;
  return value.scope === 'GLOBAL'
    ? <GlobalCompetencia g={value as AccountingGlobal} month={month} onOpenCompany={onOpenCompany} />
    : <CompanyCompetencia c={value as AccountingCompany} month={month} canEdit={canEdit} refetch={data.refetch} />;
}
