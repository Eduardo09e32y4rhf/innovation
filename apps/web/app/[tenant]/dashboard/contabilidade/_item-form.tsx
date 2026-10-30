'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from '@/app/hooks/use-data';
import { ApiError, api, type PayrollSheetItem } from '@/app/lib/api';
import { LINE_PRESETS, presetOf, validateLine } from './_payroll-model';

export type ItemFormMode = { kind: 'add' } | { kind: 'edit'; item: PayrollSheetItem } | { kind: 'remove'; item: PayrollSheetItem };

/** Formulário único para incluir, editar e remover uma linha da folha (sempre com motivo). */
export function ItemForm({ payrollId, mode, onDone, onCancel }: { payrollId: string; mode: ItemFormMode; onDone: () => void; onCancel: () => void }) {
  const uid = useId();
  const item = mode.kind === 'add' ? null : mode.item;
  const [preset, setPreset] = useState(item ? presetOf(item)?.key ?? 'OTHER_EARNING' : LINE_PRESETS[0].key);
  const [description, setDescription] = useState(item?.description ?? LINE_PRESETS[0].description);
  const [amount, setAmount] = useState(item?.amount != null ? String(item.amount).replace('.', ',') : '');
  const [reason, setReason] = useState('');
  const [force, setForce] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const chosen = LINE_PRESETS.find((p) => p.key === preset) ?? LINE_PRESETS[0];
  const typeLocked = mode.kind === 'edit' && !LINE_PRESETS.some((p) => p.type === item?.type);

  const save = useMutation(async () => {
    try {
      if (mode.kind === 'remove') return await api.accounting.removePayrollItem(payrollId, mode.item.id, reason.trim());
      const body = { type: typeLocked ? undefined : chosen.type, description: description.trim() || undefined, amount: Number(amount.replace(',', '.')), reason: reason.trim(), forceLimit: force || undefined };
      return mode.kind === 'add' ? await api.accounting.addPayrollItem(payrollId, body) : await api.accounting.updatePayrollItem(payrollId, mode.item.id, body);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'LIMIT_EXCEEDED') setLimitHit(true);
      throw e;
    }
  }, {
    onSuccess: () => { toast.success(mode.kind === 'remove' ? 'Linha removida.' : 'Linha salva e folha recalculada.'); onDone(); },
    onError: (m) => setErr(m),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = mode.kind === 'remove' ? (reason.trim().length < 5 ? 'Informe o motivo (mínimo 5 caracteres).' : null) : validateLine(amount, reason);
    setErr(invalid);
    if (!invalid) void save.mutate().catch(() => undefined);
  }

  const title = mode.kind === 'add' ? 'Nova linha' : mode.kind === 'edit' ? `Editar: ${mode.item.description}` : `Remover: ${mode.item.description}`;
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3" noValidate>
      <p className="break-words text-sm font-semibold">{title}</p>
      {mode.kind !== 'remove' && (
        <>
          {!typeLocked && (
            <div className="flex flex-col gap-1"><label htmlFor={`${uid}-t`} className="text-xs font-semibold text-fg-sub">Tipo</label>
              <select id={`${uid}-t`} value={preset} onChange={(e) => { setPreset(e.target.value); const p = LINE_PRESETS.find((x) => x.key === e.target.value); if (p) setDescription(p.description); }} className="input-v2 min-h-11">
                <optgroup label="Proventos">{LINE_PRESETS.filter((p) => !p.deduction).map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</optgroup>
                <optgroup label="Descontos">{LINE_PRESETS.filter((p) => p.deduction).map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</optgroup>
              </select></div>
          )}
          <div className="flex flex-col gap-1"><label htmlFor={`${uid}-d`} className="text-xs font-semibold text-fg-sub">Descrição (ex.: Horas extras 50% — 10h)</label>
            <input id={`${uid}-d`} value={description} maxLength={120} onChange={(e) => setDescription(e.target.value)} className="input-v2 min-h-11" /></div>
          <div className="flex flex-col gap-1"><label htmlFor={`${uid}-v`} className="text-xs font-semibold text-fg-sub">Valor (R$)</label>
            <input id={`${uid}-v`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-v2 min-h-11" aria-invalid={!!err} /></div>
        </>
      )}
      <div className="flex flex-col gap-1"><label htmlFor={`${uid}-r`} className="text-xs font-semibold text-fg-sub">Motivo (obrigatório, fica registrado)</label>
        <textarea id={`${uid}-r`} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="input-v2" aria-invalid={!!err} /></div>
      {limitHit && (
        <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-950">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="mt-1 size-4" />
          <span>Manter mesmo assim, acima do limite. O motivo acima deve justificar e o lançamento fica marcado.</span>
        </label>
      )}
      {err && <p role="alert" className="break-words text-sm text-rose-700">{err}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={save.loading} className={`btn min-h-11 flex-1 ${mode.kind === 'remove' ? 'btn-outline' : 'btn-primary'}`}>{save.loading ? 'Salvando…' : mode.kind === 'remove' ? 'Remover linha' : 'Salvar linha'}</button>
        <button type="button" onClick={onCancel} className="btn btn-outline min-h-11">Cancelar</button>
      </div>
    </form>
  );
}
