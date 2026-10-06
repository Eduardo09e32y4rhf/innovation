'use client';

import { AlertTriangle, Building2, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown, FileSpreadsheet, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { csvDocument } from '../_components/csv';
import { WORKFLOW_STATUS, errorText, monthKey, monthLabel, money, shiftMonth } from './format';
import { platformHub } from './hub-api';
import { RulesPanel } from './rules-panel';
import type { AccountingCompany, AccountingGlobal } from './types';

const input = 'input-v2 w-full text-base sm:text-sm';
const CLOSING_FIELDS = [['salaryBase', 'Salário base (R$)'], ['overtime50', 'Hora extra 50% (h)'], ['overtime100', 'Hora extra 100% (h)'], ['nightShift', 'Adicional noturno (h)'], ['absenceMinutes', 'Faltas (min)'], ['lateMinutes', 'Atrasos (min)'], ['earlyLeaveMinutes', 'Saídas antecipadas (min)']] as const;
const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', IN_REVIEW: 'bg-sky-100 text-sky-800', PROCESSING: 'bg-sky-100 text-sky-800', APPROVED: 'bg-emerald-100 text-emerald-800', CLOSED: 'bg-emerald-200 text-emerald-900', PAID: 'bg-emerald-200 text-emerald-900', CANCELLED: 'bg-rose-100 text-rose-800',
};
type Closing = AccountingCompany['closings'][number];
type Payroll = AccountingCompany['payrolls'][number];

function saveCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([csvDocument(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-rose-600' : 'text-fg';
  return (
    <article className="rounded-2xl border border-border bg-bg p-4 shadow-sm">
      <p className="text-xs font-semibold text-fg-sub">{label}</p>
      <p className={`mt-1 truncate text-xl font-black tabular-nums ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-fg-mut">{hint}</p>}
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_TONE[status] ?? 'bg-slate-100 text-slate-700'}`}>{WORKFLOW_STATUS[status] ?? status}</span>;
}

/** Guias do mês: INSS (GPS), IRRF (DARF) e FGTS vencem no dia 20 do mês seguinte à competência. */
function Obligations({ month, inss, irrf, fgts }: { month: string; inss: number; irrf: number; fgts: number }) {
  const due = new Date(`${shiftMonth(month, 1)}-20T12:00:00`);
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  const late = days < 0;
  const items: Array<[string, string, number]> = [['INSS descontado dos funcionários', 'GPS / eSocial', inss], ['IRRF retido', 'DARF 0561', irrf], ['FGTS do mês', 'Guia do FGTS Digital', fgts]];
  return (
    <section aria-label="Obrigações do mês" className="rounded-2xl border border-border bg-bg p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><CalendarClock size={15} aria-hidden="true" /> Obrigações da competência</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${late ? 'bg-rose-100 text-rose-800' : days <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
          Vencimento {due.toLocaleDateString('pt-BR')} · {late ? `${Math.abs(days)} dia(s) atrás` : days === 0 ? 'hoje' : `em ${days} dia(s)`}
        </span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map(([label, guide, value]) => (
          <li key={label} className="rounded-xl bg-bg-sub p-3"><p className="text-xs font-semibold text-fg-sub">{label}</p><p className="text-lg font-black tabular-nums text-fg">{money(value)}</p><p className="text-[11px] text-fg-mut">{guide}</p></li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-fg-mut">Valores calculados sobre os fechamentos da competência. Confira com o eSocial antes de pagar as guias.</p>
    </section>
  );
}

/** Fluxo da contabilidade: revisar, aprovar ou devolver ao RH com motivo. */
function WorkflowBar({ kind, id, status, onDone, onClose }: { kind: 'closing' | 'payroll'; id: string; status: string; onDone: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');
  const canReview = kind === 'closing' && status === 'DRAFT';
  const canApprove = status === 'DRAFT' || (kind === 'closing' && status === 'IN_REVIEW');
  const canReturn = status === 'APPROVED' || (kind === 'closing' && status === 'IN_REVIEW');
  if (!canReview && !canApprove && !canReturn) return null;

  async function run(action: 'REVIEW' | 'APPROVE' | 'RETURN', success: string) {
    setBusy(true);
    try {
      if (kind === 'closing') await platformHub.closingWorkflow(id, action, reason.trim() || undefined);
      else await platformHub.payrollWorkflow(id, action === 'REVIEW' ? 'APPROVE' : action, reason.trim() || undefined);
      toast.success(success); onDone(); onClose();
    } catch (cause) { toast.error(errorText(cause, 'Não foi possível concluir.')); }
    finally { setBusy(false); }
  }

  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-border bg-bg-sub p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-fg-sub">Revisão da contabilidade</p>
      {returning ? (
        <div className="space-y-2">
          <textarea className={`${input} min-h-16`} maxLength={500} placeholder="Explique ao RH o que precisa ser corrigido" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setReturning(false)} disabled={busy}>Voltar</Button><Button size="sm" isLoading={busy} disabled={reason.trim().length < 5} onClick={() => run('RETURN', 'Devolvido ao RH.')}>Devolver ao RH</Button></div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canReview && <Button variant="outline" size="sm" isLoading={busy} onClick={() => run('REVIEW', 'Marcado em revisão.')}>Marcar em revisão</Button>}
          {canApprove && <Button size="sm" isLoading={busy} onClick={() => run('APPROVE', 'Aprovado pela contabilidade.')}><CheckCircle2 size={14} aria-hidden="true" /> Aprovar</Button>}
          {canReturn && <Button variant="outline" size="sm" disabled={busy} onClick={() => setReturning(true)}>Devolver ao RH</Button>}
        </div>
      )}
    </div>
  );
}

// ---------- edição ----------
function PayrollDialog({ item, canEdit, onClose, onDone }: { item: Payroll | null; canEdit: boolean; onClose: () => void; onDone: () => void }) {
  const [values, setValues] = useState({ baseSalary: '', overtimeAmount: '', nightShiftAmount: '' });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!item) return null;
  const editable = ['DRAFT', 'PROCESSING'].includes(item.status);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try { await action(); toast.success(success); onDone(); onClose(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível concluir.')); }
    finally { setBusy(false); }
  }

  const rows: Array<[string, number, boolean?]> = [['Salário base', item.baseSalary], ['Horas extras', item.overtimeAmount], ['Adicional noturno', item.nightShiftAmount], ['Bruto', item.grossSalary], ['INSS', item.inssAmount, true], ['IRRF', item.irrfAmount, true], ['FGTS (patronal)', item.fgtsAmount], ['Líquido', item.netSalary]];
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={`Folha de ${item.employee?.name ?? 'funcionário'}`} description={`${WORKFLOW_STATUS[item.status] ?? item.status} · regras ${item.calculationVersion ?? 'não registradas'}`} maxWidth="max-w-xl">
      <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {rows.map(([label, value, deduction]) => (
          <div key={label} className="flex justify-between border-b border-border/60 py-1.5"><dt className="text-fg-sub">{label}</dt><dd className={`font-semibold tabular-nums ${deduction ? 'text-rose-600' : label === 'Líquido' ? 'text-emerald-600' : ''}`}>{money(value)}</dd></div>
        ))}
      </dl>
      {canEdit && <WorkflowBar kind="payroll" id={item.id} status={item.status} onDone={onDone} onClose={onClose} />}
      {!editable ? <p className="rounded-xl bg-bg-sub p-3 text-sm text-fg-sub">Folhas aprovadas ou pagas não podem ser alteradas por aqui. O RH precisa reabrir a folha.</p> : (
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void run(() => platformHub.correctPayroll(item.id, { ...(values.baseSalary ? { baseSalary: Number(values.baseSalary) } : {}), ...(values.overtimeAmount ? { overtimeAmount: Number(values.overtimeAmount) } : {}), ...(values.nightShiftAmount ? { nightShiftAmount: Number(values.nightShiftAmount) } : {}), reason: reason.trim() }), 'Folha corrigida e impostos recalculados.'); }}>
          <p className="text-xs text-fg-sub">Corrija só os proventos. INSS, IRRF, FGTS e líquido são sempre recalculados pelas regras da Contabilidade.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {([['baseSalary', 'Salário base'], ['overtimeAmount', 'Horas extras'], ['nightShiftAmount', 'Noturno']] as const).map(([key, label]) => <label key={key} className="space-y-1 text-xs font-semibold">{label} (R$)<input type="number" step="0.01" min="0" className={input} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}
          </div>
          <label className="block space-y-1 text-xs font-semibold">Motivo da correção<textarea className={`${input} min-h-16`} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3">
            <Button variant="outline" isLoading={busy} onClick={() => run(() => platformHub.recalculatePayroll(item.id), 'Folha recalculada com as regras vigentes.')}><RefreshCw size={14} aria-hidden="true" /> Só recalcular</Button>
            <Button type="submit" isLoading={busy} disabled={!reason.trim() || !(values.baseSalary || values.overtimeAmount || values.nightShiftAmount)}>Corrigir e recalcular</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ClosingDialog({ item, canEdit, onClose, onDone }: { item: Closing | null; canEdit: boolean; onClose: () => void; onDone: () => void }) {
  const [field, setField] = useState<(typeof CLOSING_FIELDS)[number][0]>('salaryBase');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!item) return null;
  const editable = ['DRAFT', 'IN_REVIEW'].includes(item.status);
  const rows: Array<[string, number, boolean?]> = [['Bruto', item.grossPay], ['INSS', item.inssDiscount, true], ['IRRF', item.irrfDiscount, true], ['FGTS (patronal)', item.fgtsAmount], ['Líquido', item.netPay]];
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={`Fechamento de ${item.employee?.name ?? 'funcionário'}`} description={`${WORKFLOW_STATUS[item.status] ?? item.status} · regras ${item.calculationVersion}`}>
      <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {rows.map(([label, v, deduction]) => <div key={label} className="flex justify-between border-b border-border/60 py-1.5"><dt className="text-fg-sub">{label}</dt><dd className={`font-semibold tabular-nums ${deduction ? 'text-rose-600' : label === 'Líquido' ? 'text-emerald-600' : ''}`}>{money(v)}</dd></div>)}
      </dl>
      {canEdit && <WorkflowBar kind="closing" id={item.id} status={item.status} onDone={onDone} onClose={onClose} />}
      {!editable ? <p className="rounded-xl bg-bg-sub p-3 text-sm text-fg-sub">Fechamentos aprovados ou fechados só podem ser alterados pelo RH, reabrindo o período.</p> : (
        <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await platformHub.adjustClosing(item.id, { field, newValue: Number(value), reason: reason.trim() }); toast.success('Ajuste registrado; valores recalculados.'); onDone(); onClose(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível ajustar.')); } finally { setBusy(false); } }}>
          <label className="block space-y-1 text-xs font-semibold">Campo<select className={input} value={field} onChange={(event) => setField(event.target.value as typeof field)}>{CLOSING_FIELDS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="block space-y-1 text-xs font-semibold">Novo valor<input type="number" step="any" min="0" className={input} value={value} onChange={(event) => setValue(event.target.value)} /></label>
          <label className="block space-y-1 text-xs font-semibold">Motivo<textarea className={`${input} min-h-16`} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={value === '' || !reason.trim()}>Ajustar e recalcular</Button></div>
        </form>
      )}
    </Modal>
  );
}

// ---------- visão geral (todas as empresas) ----------

type GlobalFilter = 'todas' | 'pendentes' | 'sem';

function GlobalCompetencia({ g, month, onOpenCompany }: { g: AccountingGlobal; month: string; onOpenCompany: (id: string, name?: string) => void }) {
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

function CompanyCompetencia({ c, month, canEdit, refetch }: { c: AccountingCompany; month: string; canEdit: boolean; refetch: () => void }) {
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
  async function approveAll() {
    if (!window.confirm(`Aprovar  item(ns) de uma vez? Confira os valores antes.`)) return;
    setBusy(true);
    let ok = 0; let fail = 0;
    for (const row of approvable) {
      try { if (tab === 'fechamentos') await platformHub.closingWorkflow(row.id, 'APPROVE'); else await platformHub.payrollWorkflow(row.id, 'APPROVE'); ok++; } catch { fail++; }
    }
    setBusy(false); refetch();
    if (fail) toast.warning(` aprovado(s);  não puderam ser aprovados (confira valores inválidos).`); else toast.success(` item(ns) aprovado(s).`);
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

function Competencia({ companyId, month, canEdit, onOpenCompany }: { companyId?: string; month: string; canEdit: boolean; onOpenCompany: (id: string, name?: string) => void }) {
  const data = useQuery(() => platformHub.accounting(month, companyId), [month, companyId]);
  if (data.error) return <ErrorState message={data.error} onRetry={data.refetch} />;
  if (data.loading && !data.data) return <LoadingState label="Carregando competência…" />;
  const value = data.data;
  if (!value) return null;
  return value.scope === 'GLOBAL'
    ? <GlobalCompetencia g={value as AccountingGlobal} month={month} onOpenCompany={onOpenCompany} />
    : <CompanyCompetencia c={value as AccountingCompany} month={month} canEdit={canEdit} refetch={data.refetch} />;
}

export function AccountingView({ companyId, canEdit, onOpenCompany }: { companyId?: string; canEdit: boolean; onOpenCompany: (id: string, name?: string) => void }) {
  const [section, setSection] = useState<'competencia' | 'regras'>('competencia');
  const [month, setMonth] = useState(monthKey());
  const [pdfBusy, setPdfBusy] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex gap-1.5">
          {([['competencia', 'Competência'], ['regras', 'Regras e simulador']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={section === id} type="button" onClick={() => setSection(id)} className={`min-h-10 rounded-full px-4 text-sm font-bold ${section === id ? 'bg-slate-900 text-white shadow' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{label}</button>)}
        </div>
        {section === 'competencia' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-border px-1">
              <Button variant="ghost" size="sm" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></Button>
              <span className="min-w-[140px] text-center text-sm font-bold capitalize">{monthLabel(month)}</span>
              <Button variant="ghost" size="sm" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></Button>
            </div>
            <Button variant="outline" isLoading={pdfBusy} onClick={async () => { setPdfBusy(true); try { await platformHub.accountingPdf(month, companyId); } catch (cause) { toast.error(errorText(cause, 'Não foi possível gerar o PDF.')); } finally { setPdfBusy(false); } }}><FileDown size={15} aria-hidden="true" /> Relatório PDF</Button>
          </div>
        )}
      </div>
      {section === 'competencia' ? <Competencia companyId={companyId} month={month} canEdit={canEdit} onOpenCompany={onOpenCompany} /> : <RulesPanel canEdit={canEdit} />}
    </div>
  );
}
