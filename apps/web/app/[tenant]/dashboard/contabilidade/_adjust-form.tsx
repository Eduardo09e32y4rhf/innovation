'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { ADJUST_FIELDS, validateAdjust } from './_model';

export function AdjustForm({ closingId, onDone }: { closingId: string; onDone: () => void }) {
  const uid = useId();
  const [field, setField] = useState<string>(ADJUST_FIELDS[0].value);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const save = useMutation((i: { field: string; value: number; reason: string }) => api.accounting.adjustClosing(closingId, i.field, i.value, i.reason.trim()), {
    onSuccess: () => { toast.success('Ajuste registrado.'); setValue(''); setReason(''); onDone(); }, onError: (m) => setErr(m),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateAdjust(value, reason);
    setErr(invalid);
    if (invalid) return;
    void save.mutate({ field, value: Number(value.replace(',', '.')), reason }).catch(() => undefined);
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-slate-200 p-3" noValidate>
      <p className="text-sm font-semibold">Novo ajuste</p>
      <div className="flex flex-col gap-1"><label htmlFor={`${uid}-f`} className="text-xs font-semibold text-fg-sub">Item</label>
        <select id={`${uid}-f`} value={field} onChange={(e) => setField(e.target.value)} className="input-v2 min-h-11">{ADJUST_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
      <div className="flex flex-col gap-1"><label htmlFor={`${uid}-v`} className="text-xs font-semibold text-fg-sub">Novo valor</label>
        <input id={`${uid}-v`} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="input-v2 min-h-11" aria-invalid={!!err} /></div>
      <div className="flex flex-col gap-1"><label htmlFor={`${uid}-r`} className="text-xs font-semibold text-fg-sub">Motivo (obrigatório)</label>
        <textarea id={`${uid}-r`} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="input-v2" aria-invalid={!!err} /></div>
      {err && <p role="alert" className="text-sm text-rose-700">{err}</p>}
      <button type="submit" disabled={save.loading} className="btn btn-primary min-h-11 w-full">{save.loading ? 'Salvando…' : 'Registrar ajuste'}</button>
    </form>
  );
}
