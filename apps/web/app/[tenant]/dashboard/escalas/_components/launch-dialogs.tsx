'use client';

import { AlertTriangle, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi } from '../_lib/hub-api';
import { DAY_TYPE_LABEL, errorMessage, fmtDate } from '../_lib/format';

const input = 'input-v2 w-full text-base sm:text-sm';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/** Lançar (atribuir) uma escala a uma ou mais pessoas, com prévia de conflitos. */
export function LaunchDialog({ isOpen, employeeId, onClose, onDone }: { isOpen: boolean; employeeId?: string; onClose: () => void; onDone: () => void }) {
  const people = useQuery(() => hubApi.people(), [], { enabled: isOpen });
  const schedules = useQuery(() => hubApi.schedules(), [], { enabled: isOpen });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleId, setScheduleId] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(employeeId ? [employeeId] : [])); setScheduleId(''); setStartDate(today()); setEndDate(''); setSearch(''); setPreview(null);
  }, [isOpen, employeeId]);

  const ready = selected.size > 0 && scheduleId && startDate;
  useEffect(() => {
    if (!isOpen || !ready) { setPreview(null); return; }
    setChecking(true);
    const timer = setTimeout(() => {
      hubApi.assignPreview({ employeeIds: [...selected], scheduleId, startDate, endDate: endDate || undefined })
        .then(setPreview).catch((cause) => setPreview({ error: errorMessage(cause, 'Não foi possível validar.') })).finally(() => setChecking(false));
    }, 450);
    return () => clearTimeout(timer);
  }, [isOpen, ready, selected, scheduleId, startDate, endDate]);

  const filtered = useMemo(() => (people.data ?? []).filter((person) => !search.trim() || `${person.name} ${person.department ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())), [people.data, search]);
  const active = (schedules.data ?? []).filter((item) => item.status === 'ACTIVE');
  const blockers: string[] = preview?.blockers?.map((item: any) => item.message ?? String(item)) ?? preview?.errors ?? [];
  const warnings: string[] = [
    ...(preview?.warnings?.map((item: any) => item.message ?? String(item)) ?? []),
    ...(preview?.retroactive ? ['A vigência começa no passado: os pontos já registrados serão recalculados.'] : []),
    ...(preview?.impact?.assignmentsReplaced ? [`${preview.impact.assignmentsReplaced} atribuição(ões) existente(s) será(ão) substituída(s).`] : []),
    ...(preview?.impact?.assignmentsTruncated ? [`${preview.impact.assignmentsTruncated} atribuição(ões) será(ão) encerrada(s) no dia anterior.`] : []),
  ];
  const canApply = Boolean(ready && !checking && preview && !preview.error && preview.canApply !== false && blockers.length === 0);

  async function apply() {
    setBusy(true);
    try {
      await hubApi.assign({ employeeIds: [...selected], scheduleId, startDate, endDate: endDate || undefined });
      toast.success(`Escala lançada para ${selected.size} pessoa(s).`); onDone(); onClose();
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível lançar a escala.')); }
    finally { setBusy(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title="Lançar escala" description="Escolha as pessoas, a escala e a vigência. Você vê os conflitos antes de confirmar." maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium sm:col-span-3">Escala
            <select className={input} value={scheduleId} onChange={(event) => setScheduleId(event.target.value)}><option value="">Escolha…</option>{active.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.scaleType}{item.entryTime ? ` · ${item.entryTime}–${item.exitTime}` : ''}</option>)}</select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">Início<input type="date" className={input} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="space-y-1.5 text-sm font-medium">Fim (opcional)<input type="date" min={startDate} className={input} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Pessoas ({selected.size})</p>
            <div className="flex gap-2"><input className="input-v2 text-sm" placeholder="Buscar…" aria-label="Buscar pessoa" value={search} onChange={(event) => setSearch(event.target.value)} />
              <Button size="sm" variant="outline" onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((person) => person.id)))}>{selected.size === filtered.length && filtered.length ? 'Limpar' : 'Todos'}</Button></div>
          </div>
          <ul className="max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {filtered.map((person) => (
              <li key={person.id}><label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-bg-sub">
                <input type="checkbox" checked={selected.has(person.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(person.id)) next.delete(person.id); else next.add(person.id); return next; })} />
                <span className="min-w-0 flex-1 truncate">{person.name}</span><span className="text-xs text-fg-sub">{person.department ?? ''}</span>
              </label></li>
            ))}
            {filtered.length === 0 && <li className="p-4 text-center text-sm text-fg-sub">{people.loading ? 'Carregando…' : 'Ninguém encontrado.'}</li>}
          </ul>
        </div>

        <div aria-live="polite" className="space-y-2">
          {checking && <p className="text-xs text-fg-sub">Analisando conflitos e cobertura…</p>}
          {preview?.error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{preview.error}</p>}
          {blockers.map((message, index) => <p key={`b${index}`} role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{message}</p>)}
          {warnings.map((message, index) => <p key={`w${index}`} className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{message}</p>)}
          {canApply && blockers.length === 0 && warnings.length === 0 && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Sem conflitos. Pronto para lançar.</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button isLoading={busy} disabled={!canApply} onClick={apply}>Lançar escala</Button>
        </div>
      </div>
    </Modal>
  );
}

const OVERRIDE_TYPES = [
  ['FOLGA', 'Folga'], ['COMPENSACAO', 'Trabalhar neste dia (turno diferente)'], ['ATESTADO', 'Atestado'], ['SUSPENSAO', 'Suspensão'], ['FERIADO_LOCAL', 'Feriado local'],
] as const;

/** Alterar um dia específico da escala de uma pessoa (folga, turno alternativo, atestado...). */
export function OverrideDialog({ target, onClose, onDone }: { target: { employeeId: string; date: string } | null; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState('FOLGA');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (target) { setType('FOLGA'); setEntry(''); setExit(''); setReason(''); } }, [target]);

  async function save() {
    if (!target) return;
    setBusy(true);
    try {
      await hubApi.createOverride({ employeeId: target.employeeId, date: target.date, type, altEntry: type === 'COMPENSACAO' && entry ? entry : undefined, altExit: type === 'COMPENSACAO' && exit ? exit : undefined, reason: reason.trim() });
      toast.success('Dia atualizado. O funcionário foi avisado.'); onDone(); onClose();
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível alterar o dia.')); }
    finally { setBusy(false); }
  }

  return (
    <Modal isOpen={Boolean(target)} onClose={() => !busy && onClose()} title="Alterar este dia" description={target ? fmtDate(target.date) : undefined}>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (reason.trim()) void save(); }}>
        <label className="block space-y-1.5 text-sm font-medium">O que acontece neste dia?
          <select className={input} value={type} onChange={(event) => setType(event.target.value)}>{OVERRIDE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>
        {type === 'COMPENSACAO' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-sm font-medium">Entrada<input type="time" className={input} value={entry} onChange={(event) => setEntry(event.target.value)} /></label>
            <label className="space-y-1.5 text-sm font-medium">Saída<input type="time" className={input} value={exit} onChange={(event) => setExit(event.target.value)} /></label>
            <p className="col-span-2 text-xs text-fg-sub">Em branco usa o horário da escala atual. {DAY_TYPE_LABEL.COMPENSACAO} não gera hora extra se cair em dia de folga.</p>
          </div>
        )}
        <label className="block space-y-1.5 text-sm font-medium">Motivo *<textarea className={`${input} min-h-20`} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={!reason.trim()}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
