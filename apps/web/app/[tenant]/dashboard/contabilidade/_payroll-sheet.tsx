'use client';

import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from '@/app/hooks/use-data';
import { api, type PayrollSheetEmployee, type PayrollSheetItem } from '@/app/lib/api';
import { ItemForm, type ItemFormMode } from './_item-form';
import { brl, fmtDate } from './_model';
import { groupItems } from './_payroll-model';

function Line({ item, canEdit, active, onEdit, onRemove }: { item: PayrollSheetItem; canEdit: boolean; active: boolean; onEdit: () => void; onRemove: () => void }) {
  return (
    <li className={`px-3 py-2 text-sm ${active ? 'bg-indigo-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-medium">{item.description}{item.isManual && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Manual</span>}</p>
          <p className="text-xs text-fg-sub">{item.typeLabel}</p>
        </div>
        <p className="shrink-0 font-semibold">{item.isDeduction ? '- ' : ''}{brl(item.amount)}</p>
      </div>
      {item.isManual && (
        <p className="mt-1 break-words text-xs text-fg-sub">Motivo: {item.manualReason || 'não informado'}{item.editedByName ? ` · ${item.editedByName}` : ''}{item.editedAt ? ` · ${fmtDate(item.editedAt)}` : ''}</p>
      )}
      {canEdit && (item.editable || item.removable) && (
        <div className="mt-2 flex gap-2">
          {item.editable && <button type="button" onClick={onEdit} aria-label={`Editar ${item.description}`} className="btn btn-outline min-h-11 flex-1">Editar</button>}
          {item.removable && <button type="button" onClick={onRemove} aria-label={`Remover ${item.description}`} className="btn btn-outline min-h-11 flex-1">Remover</button>}
        </div>
      )}
    </li>
  );
}

function Group({ title, items, ...rest }: { title: string; items: PayrollSheetItem[]; canEdit: boolean; formItemId: string | null; onEdit: (i: PayrollSheetItem) => void; onRemove: (i: PayrollSheetItem) => void }) {
  if (!items.length) return null;
  return (
    <div>
      <h5 className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-sub">{title}</h5>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {items.map((i) => <Line key={i.id} item={i} canEdit={rest.canEdit} active={rest.formItemId === i.id} onEdit={() => rest.onEdit(i)} onRemove={() => rest.onRemove(i)} />)}
      </ul>
    </div>
  );
}

/** Folha do funcionário no mês: proventos e descontos linha a linha, com inclusão, edição e remoção (tudo com motivo). */
export function PayrollSheet({ data, canEdit, onChanged }: { data: PayrollSheetEmployee | undefined; canEdit: boolean; onChanged: () => void }) {
  const [form, setForm] = useState<ItemFormMode | null>(null);
  const recalc = useMutation(() => api.accounting.recalculatePayroll(data!.payrollId), {
    onSuccess: () => { toast.success('Impostos e líquido recalculados.'); onChanged(); }, onError: (m) => toast.error(m),
  });
  if (!data) return <p className="text-sm text-fg-sub">Este funcionário ainda não tem folha neste mês. Use “Calcular todos”.</p>;

  const editable = canEdit && data.editable;
  const g = groupItems(data.items);
  const formId = form && form.kind !== 'add' ? form.item.id : null;
  const done = () => { setForm(null); onChanged(); };
  const common = { canEdit: editable, formItemId: formId, onEdit: (item: PayrollSheetItem) => setForm({ kind: 'edit', item }), onRemove: (item: PayrollSheetItem) => setForm({ kind: 'remove', item }) };

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {([['Bruto', data.gross], ['INSS', data.inss], ['IRRF', data.irrf], ['Líquido', data.net]] as const).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 p-2"><dt className="text-xs text-fg-sub">{k}</dt><dd className="font-semibold">{brl(v)}</dd></div>
        ))}
      </dl>
      {[data.limits.loan, data.limits.transport].filter((l) => l.exceeded).map((l) => <p key={l.message} role="alert" className="rounded-xl bg-amber-50 p-2 text-sm text-amber-950">{l.message}</p>)}
      <Group title="Proventos" items={g.earnings} {...common} />
      <Group title="Descontos" items={g.deductions} {...common} />
      <Group title="Encargo da empresa (não desconta do funcionário)" items={g.charges} {...common} canEdit={false} />
      {form && <ItemForm key={form.kind === 'add' ? 'add' : `${form.kind}-${form.item.id}`} payrollId={data.payrollId} mode={form} onDone={done} onCancel={() => setForm(null)} />}
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setForm({ kind: 'add' })} className="btn btn-primary min-h-11 flex-1"><Plus size={16} aria-hidden="true" /> Incluir linha</button>
          <button type="button" onClick={() => void recalc.mutate().catch(() => undefined)} disabled={recalc.loading} className="btn btn-outline min-h-11 flex-1"><RefreshCw size={16} aria-hidden="true" /> {recalc.loading ? 'Recalculando…' : 'Recalcular impostos'}</button>
        </div>
      ) : <p className="text-sm text-fg-sub">{canEdit ? 'Folha aprovada ou paga: devolva-a para rascunho para editar as linhas.' : 'Edição disponível depois do cálculo e antes da publicação.'}</p>}
    </div>
  );
}
