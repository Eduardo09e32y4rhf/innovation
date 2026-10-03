'use client';

import { ChevronLeft, ChevronRight, FileDown, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { WORKFLOW_STATUS, errorText, monthKey, monthLabel, money, shiftMonth } from './format';
import { platformHub } from './hub-api';
import { RulesPanel } from './rules-panel';
import type { AccountingCompany, AccountingGlobal } from './types';

const input = 'input-v2 w-full text-base sm:text-sm';
const CLOSING_FIELDS = [['salaryBase', 'Salário base (R$)'], ['overtime50', 'Hora extra 50% (h)'], ['overtime100', 'Hora extra 100% (h)'], ['nightShift', 'Adicional noturno (h)'], ['absenceMinutes', 'Faltas (min)'], ['lateMinutes', 'Atrasos (min)'], ['earlyLeaveMinutes', 'Saídas antecipadas (min)']] as const;

function Totals({ items }: { items: [string, string][] }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{items.map(([label, value]) => <div key={label} className="card-v2 p-4"><p className="text-sm text-fg-sub">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>)}</div>;
}

function PayrollDialog({ item, onClose, onDone }: { item: AccountingCompany['payrolls'][number] | null; onClose: () => void; onDone: () => void }) {
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

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={`Folha — ${item.employee?.name ?? 'Funcionário'}`} description={`Situação: ${WORKFLOW_STATUS[item.status] ?? item.status} · regras ${item.calculationVersion ?? 'não registradas'}`} maxWidth="max-w-xl">
      <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {([['Salário base', item.baseSalary], ['Horas extras', item.overtimeAmount], ['Noturno', item.nightShiftAmount], ['Bruto', item.grossSalary], ['INSS', item.inssAmount], ['IRRF', item.irrfAmount], ['FGTS', item.fgtsAmount], ['Líquido', item.netSalary]] as [string, number][]).map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-border/60 py-1"><dt className="text-fg-sub">{label}</dt><dd className="tabular-nums font-medium">{money(value)}</dd></div>
        ))}
      </dl>
      {!editable ? <p className="rounded-lg bg-bg-sub p-3 text-sm text-fg-sub">Folhas aprovadas ou pagas não podem ser alteradas.</p> : (
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void run(() => platformHub.correctPayroll(item.id, { ...(values.baseSalary ? { baseSalary: Number(values.baseSalary) } : {}), ...(values.overtimeAmount ? { overtimeAmount: Number(values.overtimeAmount) } : {}), ...(values.nightShiftAmount ? { nightShiftAmount: Number(values.nightShiftAmount) } : {}), reason: reason.trim() }), 'Folha corrigida e impostos recalculados.'); }}>
          <p className="text-xs text-fg-sub">Corrija só os proventos. INSS, IRRF, FGTS e líquido são sempre recalculados pelas regras da Contabilidade.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {([['baseSalary', 'Salário base'], ['overtimeAmount', 'Horas extras'], ['nightShiftAmount', 'Noturno']] as const).map(([key, label]) => <label key={key} className="space-y-1 text-xs font-medium">{label} (R$)<input type="number" step="0.01" min="0" className={input} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}
          </div>
          <label className="block space-y-1 text-xs font-medium">Motivo da correção<textarea className={`${input} min-h-16`} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3">
            <Button variant="outline" isLoading={busy} onClick={() => run(() => platformHub.recalculatePayroll(item.id), 'Folha recalculada com as regras vigentes.')}><RefreshCw size={14} aria-hidden="true" /> Só recalcular</Button>
            <Button type="submit" isLoading={busy} disabled={!reason.trim() || !(values.baseSalary || values.overtimeAmount || values.nightShiftAmount)}>Corrigir e recalcular</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ClosingDialog({ item, onClose, onDone }: { item: AccountingCompany['closings'][number] | null; onClose: () => void; onDone: () => void }) {
  const [field, setField] = useState<(typeof CLOSING_FIELDS)[number][0]>('salaryBase');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!item) return null;
  const editable = ['DRAFT', 'IN_REVIEW'].includes(item.status);
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={`Fechamento — ${item.employee?.name ?? 'Funcionário'}`} description={`Situação: ${WORKFLOW_STATUS[item.status] ?? item.status} · regras ${item.calculationVersion}`}>
      <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {([['Bruto', item.grossPay], ['INSS', item.inssDiscount], ['IRRF', item.irrfDiscount], ['FGTS', item.fgtsAmount], ['Líquido', item.netPay]] as [string, number][]).map(([label, v]) => <div key={label} className="flex justify-between border-b border-border/60 py-1"><dt className="text-fg-sub">{label}</dt><dd className="tabular-nums font-medium">{money(v)}</dd></div>)}
      </dl>
      {!editable ? <p className="rounded-lg bg-bg-sub p-3 text-sm text-fg-sub">Fechamentos aprovados ou fechados só podem ser alterados pelo RH, reabrindo o período.</p> : (
        <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await platformHub.adjustClosing(item.id, { field, newValue: Number(value), reason: reason.trim() }); toast.success('Ajuste registrado; valores recalculados.'); onDone(); onClose(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível ajustar.')); } finally { setBusy(false); } }}>
          <label className="block space-y-1 text-xs font-medium">Campo<select className={input} value={field} onChange={(event) => setField(event.target.value as typeof field)}>{CLOSING_FIELDS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="block space-y-1 text-xs font-medium">Novo valor<input type="number" step="any" min="0" className={input} value={value} onChange={(event) => setValue(event.target.value)} /></label>
          <label className="block space-y-1 text-xs font-medium">Motivo<textarea className={`${input} min-h-16`} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={value === '' || !reason.trim()}>Ajustar e recalcular</Button></div>
        </form>
      )}
    </Modal>
  );
}

function Competencia({ companyId, month, canEdit, onOpenCompany }: { companyId?: string; month: string; canEdit: boolean; onOpenCompany: (id: string, name?: string) => void }) {
  const data = useQuery(() => platformHub.accounting(month, companyId), [month, companyId]);
  const [payroll, setPayroll] = useState<AccountingCompany['payrolls'][number] | null>(null);
  const [closing, setClosing] = useState<AccountingCompany['closings'][number] | null>(null);
  const [busy, setBusy] = useState(false);

  if (data.error) return <ErrorState message={data.error} onRetry={data.refetch} />;
  if (data.loading && !data.data) return <LoadingState label="Carregando competência…" />;
  const value = data.data;
  if (!value) return null;

  if (value.scope === 'GLOBAL') {
    const g = value as AccountingGlobal;
    const rows = g.companies.filter((row) => row.closings > 0 || row.payrolls > 0);
    return (
      <div className="space-y-4">
        <Totals items={[['Empresas com folha', `${g.totals.withClosings} / ${g.totals.companies}`], ['Fechamentos', String(g.totals.closings)], ['Pendentes', String(g.totals.closingsPending)], ['Bruto', money(g.totals.gross)], ['Encargos (INSS+IRRF+FGTS)', money(g.totals.inss + g.totals.irrf + g.totals.fgts)], ['Líquido', money(g.totals.net)]]} />
        {rows.length === 0 ? <EmptyState message="Nenhuma empresa gerou fechamento nesta competência." /> : (
          <div className="card-v2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Contabilidade por empresa</caption>
              <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Empresa', 'Fechamentos', 'Pendentes', 'Bruto', 'INSS', 'IRRF', 'FGTS', 'Líquido'].map((label) => <th key={label} scope="col" className="px-3 py-2.5 font-medium">{label}</th>)}</tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-sub" onClick={() => onOpenCompany(row.id, row.name)}>
                  <th scope="row" className="px-3 py-2 text-left font-medium">{row.name}</th><td className="px-3 py-2 tabular-nums">{row.closings}</td><td className={`px-3 py-2 tabular-nums ${row.closingsPending ? 'text-amber-700' : ''}`}>{row.closingsPending}</td>
                  <td className="px-3 py-2 tabular-nums">{money(row.gross)}</td><td className="px-3 py-2 tabular-nums">{money(row.inss)}</td><td className="px-3 py-2 tabular-nums">{money(row.irrf)}</td><td className="px-3 py-2 tabular-nums">{money(row.fgts)}</td><td className="px-3 py-2 tabular-nums font-medium">{money(row.net)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const c = value as AccountingCompany;
  async function recalc() {
    setBusy(true);
    try { const out = await platformHub.recalculateClosings(c.company.id, month); toast.success(`${out.generated} fechamento(s) recalculado(s) com as regras atuais.`); data.refetch(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível recalcular.')); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Totals items={[['Fechamentos', String(c.totals.closings)], ['Bruto', money(c.totals.gross)], ['INSS', money(c.totals.inss)], ['IRRF', money(c.totals.irrf)], ['FGTS', money(c.totals.fgts)], ['Líquido', money(c.totals.net)]]} />
      {canEdit && <div className="flex justify-end"><Button variant="outline" isLoading={busy} onClick={recalc}><RefreshCw size={15} aria-hidden="true" /> Recalcular fechamentos em rascunho</Button></div>}

      <section aria-label="Fechamentos de ponto" className="card-v2 overflow-x-auto">
        <h2 className="px-4 pt-4 text-sm font-semibold">Fechamentos de ponto</h2>
        {c.closings.length === 0 ? <p className="p-4 text-sm text-fg-sub">Nenhum fechamento nesta competência.</p> : (
          <table className="mt-2 w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Fechamentos</caption>
            <thead className="border-y border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Funcionário', 'Situação', 'Bruto', 'INSS', 'IRRF', 'FGTS', 'Líquido'].map((label) => <th key={label} scope="col" className="px-3 py-2 font-medium">{label}</th>)}</tr></thead>
            <tbody>{c.closings.map((row) => (
              <tr key={row.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-sub" onClick={() => setClosing(row)}>
                <th scope="row" className="px-3 py-2 text-left font-medium">{row.employee?.name}</th><td className="px-3 py-2">{WORKFLOW_STATUS[row.status] ?? row.status}</td><td className="px-3 py-2 tabular-nums">{money(row.grossPay)}</td><td className="px-3 py-2 tabular-nums">{money(row.inssDiscount)}</td><td className="px-3 py-2 tabular-nums">{money(row.irrfDiscount)}</td><td className="px-3 py-2 tabular-nums">{money(row.fgtsAmount)}</td><td className="px-3 py-2 tabular-nums font-medium">{money(row.netPay)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>

      <section aria-label="Folha de pagamento" className="card-v2 overflow-x-auto">
        <h2 className="px-4 pt-4 text-sm font-semibold">Folha de pagamento</h2>
        {c.payrolls.length === 0 ? <p className="p-4 text-sm text-fg-sub">Nenhuma folha nesta competência.</p> : (
          <table className="mt-2 w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Folhas</caption>
            <thead className="border-y border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Funcionário', 'Situação', 'Bruto', 'INSS', 'IRRF', 'FGTS', 'Líquido'].map((label) => <th key={label} scope="col" className="px-3 py-2 font-medium">{label}</th>)}</tr></thead>
            <tbody>{c.payrolls.map((row) => (
              <tr key={row.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-sub" onClick={() => setPayroll(row)}>
                <th scope="row" className="px-3 py-2 text-left font-medium">{row.employee?.name}</th><td className="px-3 py-2">{WORKFLOW_STATUS[row.status] ?? row.status}</td><td className="px-3 py-2 tabular-nums">{money(row.grossSalary)}</td><td className="px-3 py-2 tabular-nums">{money(row.inssAmount)}</td><td className="px-3 py-2 tabular-nums">{money(row.irrfAmount)}</td><td className="px-3 py-2 tabular-nums">{money(row.fgtsAmount)}</td><td className="px-3 py-2 tabular-nums font-medium">{money(row.netSalary)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
      {canEdit ? <><PayrollDialog item={payroll} onClose={() => setPayroll(null)} onDone={data.refetch} /><ClosingDialog item={closing} onClose={() => setClosing(null)} onDone={data.refetch} /></> : null}
    </div>
  );
}

export function AccountingView({ companyId, canEdit, onOpenCompany }: { companyId?: string; canEdit: boolean; onOpenCompany: (id: string, name?: string) => void }) {
  const [section, setSection] = useState<'competencia' | 'regras'>('competencia');
  const [month, setMonth] = useState(monthKey());
  const [pdfBusy, setPdfBusy] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex overflow-hidden rounded-lg border border-border">
          {([['competencia', 'Competência'], ['regras', 'Regras e simulador']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={section === id} type="button" onClick={() => setSection(id)} className={`px-4 py-2 text-sm font-medium ${section === id ? 'bg-purple-600 text-white' : 'hover:bg-bg-sub'}`}>{label}</button>)}
        </div>
        {section === 'competencia' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></Button>
              <span className="min-w-[140px] text-center text-sm font-semibold capitalize">{monthLabel(month)}</span>
              <Button variant="outline" size="sm" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></Button>
            </div>
            <Button variant="outline" isLoading={pdfBusy} onClick={async () => { setPdfBusy(true); try { await platformHub.accountingPdf(month, companyId); } catch (cause) { toast.error(errorText(cause, 'Não foi possível gerar o PDF.')); } finally { setPdfBusy(false); } }}><FileDown size={15} aria-hidden="true" /> Relatório PDF</Button>
          </div>
        )}
      </div>
      {section === 'competencia' ? <Competencia companyId={companyId} month={month} canEdit={canEdit} onOpenCompany={onOpenCompany} /> : <RulesPanel canEdit={canEdit} />}
    </div>
  );
}
