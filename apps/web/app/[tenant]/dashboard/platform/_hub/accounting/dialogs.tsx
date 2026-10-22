'use client';

import { CheckCircle2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { WORKFLOW_STATUS, errorText, money } from '../format';
import { platformHub } from '../hub-api';
import { input, CLOSING_FIELDS, Closing, Payroll } from './parts';

/** Fluxo da contabilidade: revisar, aprovar ou devolver ao RH com motivo. */
export function WorkflowBar({ kind, id, status, onDone, onClose }: { kind: 'closing' | 'payroll'; id: string; status: string; onDone: () => void; onClose: () => void }) {
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
          <textarea aria-label="Motivo da correção para o RH" className={`${input} min-h-16`} maxLength={500} placeholder="Explique ao RH o que precisa ser corrigido" value={reason} onChange={(e) => setReason(e.target.value)} />
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
export function PayrollDialog({ item, canEdit, onClose, onDone }: { item: Payroll | null; canEdit: boolean; onClose: () => void; onDone: () => void }) {
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

export function ClosingDialog({ item, canEdit, onClose, onDone }: { item: Closing | null; canEdit: boolean; onClose: () => void; onDone: () => void }) {
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
