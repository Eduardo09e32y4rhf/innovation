'use client';

import { AlertTriangle, Camera, CheckCircle2, FileText, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi, type LaunchKind, type LaunchResult } from '../_lib/hub-api';
import { errorMessage } from '../_lib/format';

const input = 'input-v2 w-full text-base sm:text-sm';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const hm = (minutes: number) => `${Math.floor(Math.max(0, minutes) / 60)}h${String(Math.max(0, minutes) % 60).padStart(2, '0')}`;
const br = (iso: string) => iso.split('-').reverse().join('/');

export const EXTRA_MODES: { id: LaunchKind; label: string; hint: string }[] = [
  { id: 'ATESTADO', label: 'Atestado', hint: 'O dia fica abonado (sem falta e sem desconto). Anexe a foto ou o PDF do atestado.' },
  { id: 'FOLGA_EXTRA', label: 'Folga extra', hint: 'Concede uma folga paga nos dias de trabalho do período.' },
  { id: 'FOLGA_BANCO', label: 'Folga pelo banco', hint: 'A folga é abatida do banco de horas da pessoa (só se a empresa usa banco e há saldo).' },
  { id: 'FERIADO', label: 'Feriado', hint: 'Marca feriado nos dias de trabalho do período, para uma ou várias pessoas (ex.: aniversário da cidade, ponte).' },
];

/** Lançamentos de atestado, folga extra, folga pelo banco e feriado — individual ou em lote. */
export function ExtraLaunchForm({ kind, employeeId, isOpen, onClose, onDone }: { kind: LaunchKind; employeeId?: string; isOpen: boolean; onClose: () => void; onDone: () => void }) {
  const people = useQuery(() => hubApi.people(), [], { enabled: isOpen });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [reason, setReason] = useState('');
  const [holiday, setHoliday] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [bank, setBank] = useState<{ usesBank: boolean; validityMonths: number; balances: Record<string, number> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LaunchResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isOpen) { setSelected(new Set(employeeId ? [employeeId] : [])); setSearch(''); setStart(today()); setEnd(today()); setReason(''); setHoliday(''); setFile(null); setResult(null); } }, [isOpen, employeeId, kind]);
  useEffect(() => { setResult(null); }, [kind]);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!isOpen || kind !== 'FOLGA_BANCO' || selected.size === 0) { setBank(null); return; }
    let cancelled = false;
    hubApi.launchBank([...selected]).then((data) => { if (!cancelled) setBank(data); }).catch(() => { if (!cancelled) setBank(null); });
    return () => { cancelled = true; };
  }, [isOpen, kind, selected]);

  const filtered = useMemo(() => (people.data ?? []).filter((p) => !search.trim() || `${p.name} ${p.department ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())), [people.data, search]);
  const nameOf = (id: string) => people.data?.find((p) => p.id === id)?.name ?? '';
  const mode = EXTRA_MODES.find((m) => m.id === kind)!;
  const ready = selected.size > 0 && start && end && end >= start && reason.trim().length >= 3;
  const noBank = kind === 'FOLGA_BANCO' && bank && !bank.usesBank;

  async function submit() {
    setBusy(true);
    try {
      let attachmentId: string | undefined;
      if (kind === 'ATESTADO' && file) attachmentId = (await hubApi.uploadCertificate([...selected][0], file)).id;
      const out = await hubApi.launch({ kind, employeeIds: [...selected], dateStart: start, dateEnd: end, reason: reason.trim(), holidayName: kind === 'FERIADO' ? holiday.trim() || undefined : undefined, attachmentId });
      setResult(out);
      if (out.applied > 0) { toast.success(`${out.applied} dia(s) lançado(s).`); onDone(); }
      else toast.error('Nada foi lançado. Veja os motivos abaixo.');
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível lançar.')); }
    finally { setBusy(false); }
  }

  if (result) {
    return (
      <div className="space-y-3">
        <p className={`flex items-start gap-2 rounded-lg p-3 text-sm ${result.applied ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{result.applied ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}{result.applied} dia(s) lançado(s) para {result.people.filter((p) => p.applied.length).length} de {result.people.length} pessoa(s). Os funcionários foram avisados.</p>
        <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
          {result.people.map((p) => (
            <li key={p.employeeId} className="rounded-lg border border-border p-3">
              <p className="font-medium">{p.name}</p>
              {p.applied.length > 0 && <p className="text-xs text-emerald-700">Lançado: {p.applied.length} dia(s) ({br(p.applied[0])}{p.applied.length > 1 ? ` a ${br(p.applied[p.applied.length - 1])}` : ''})</p>}
              {p.error && <p className="text-xs text-rose-700">{p.error}</p>}
              {p.skipped.length > 0 && <p className="text-xs text-fg-sub">Não lançado: {p.skipped.slice(0, 6).map((s) => `${br(s.date)} (${s.reason})`).join('; ')}{p.skipped.length > 6 ? `… +${p.skipped.length - 6}` : ''}</p>}
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 border-t border-border pt-3"><Button variant="outline" onClick={() => setResult(null)}>Lançar outro</Button><Button onClick={onClose}>Concluir</Button></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-bg-sub px-3 py-2 text-xs text-fg-sub">{mode.hint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">{kind === 'ATESTADO' ? 'Primeiro dia do atestado' : 'De'}<input type="date" className={input} value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} /></label>
        <label className="space-y-1.5 text-sm font-medium">{kind === 'ATESTADO' ? 'Último dia do atestado' : 'Até'}<input type="date" min={start} className={input} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        {kind === 'FERIADO' && <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Nome do feriado<input className={input} maxLength={120} placeholder="Ex.: Aniversário da cidade" value={holiday} onChange={(e) => setHoliday(e.target.value)} /></label>}
        <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Motivo *<input className={input} maxLength={250} placeholder={kind === 'ATESTADO' ? 'Ex.: Atestado médico — gripe' : kind === 'FOLGA_BANCO' ? 'Ex.: Folga pedida pelo colaborador' : 'Ex.: Folga concedida pela diretoria'} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      </div>

      {kind === 'ATESTADO' && (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <p className="text-sm font-medium">Foto ou PDF do atestado <span className="text-xs font-normal text-fg-sub">(recomendado — fica guardado no cadastro)</span></p>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" aria-label="Foto do atestado" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <div className="flex items-center gap-3">
              {preview ? <img src={preview} alt="Prévia do atestado" className="h-20 w-20 rounded-lg border border-border object-cover" /> : <FileText size={28} className="text-fg-sub" aria-hidden="true" />}
              <div className="min-w-0 flex-1"><p className="truncate text-sm">{file.name}</p><p className="text-xs text-fg-sub">{(file.size / 1024).toFixed(0)} KB</p></div>
              <Button variant="outline" size="sm" aria-label="Remover arquivo" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}><X size={14} aria-hidden="true" /></Button>
            </div>
          ) : <Button variant="outline" onClick={() => fileRef.current?.click()}><Camera size={16} aria-hidden="true" /> Tirar foto / escolher arquivo</Button>}
          {selected.size > 1 && <p className="text-xs text-amber-800">O mesmo arquivo será ligado a todas as pessoas marcadas.</p>}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Pessoas ({selected.size}) <span className="text-xs font-normal text-fg-sub">{selected.size === 1 ? 'individual' : selected.size > 1 ? 'em lote' : ''}</span></p>
          <div className="flex gap-2"><input className="input-v2 text-sm" placeholder="Buscar…" aria-label="Buscar pessoa" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)))}>{selected.size === filtered.length && filtered.length ? 'Limpar' : 'Todos'}</Button></div>
        </div>
        <ul className="max-h-44 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {filtered.map((p) => (
            <li key={p.id}><label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-bg-sub">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => setSelected((cur) => { const next = new Set(cur); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; })} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {kind === 'FOLGA_BANCO' && bank && selected.has(p.id) && <span className="text-xs font-semibold text-purple-700">saldo {hm(bank.balances[p.id] ?? 0)}</span>}
              <span className="text-xs text-fg-sub">{p.department ?? ''}</span>
            </label></li>
          ))}
          {filtered.length === 0 && <li className="p-4 text-center text-sm text-fg-sub">{people.loading ? 'Carregando…' : 'Ninguém encontrado.'}</li>}
        </ul>
      </div>

      {noBank && <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />A empresa paga a hora extra na folha e não usa banco de horas. Ative o banco em Configurações → Hora extra e banco.</p>}
      {kind === 'FOLGA_BANCO' && bank?.usesBank && selected.size > 0 && <p className="text-xs text-fg-sub">Saldo válido por {bank.validityMonths} meses. Quem não tiver saldo para todos os dias do período não é lançado.{[...selected].some((id) => (bank.balances[id] ?? 0) <= 0) ? ` Sem saldo: ${[...selected].filter((id) => (bank.balances[id] ?? 0) <= 0).map(nameOf).join(', ')}.` : ''}</p>}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button isLoading={busy} disabled={!ready || Boolean(noBank)} onClick={submit}>Lançar {mode.label.toLowerCase()}</Button>
      </div>
    </div>
  );
}
