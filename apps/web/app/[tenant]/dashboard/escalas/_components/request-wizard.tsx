'use client';

import { AlertTriangle, ArrowLeftRight, CalendarClock, CalendarOff, ClipboardEdit, FileText, Repeat2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi } from '../_lib/hub-api';
import { errorMessage } from '../_lib/format';
import type { Finding, RequestType } from '../_lib/types';

const TYPES: { id: RequestType; title: string; text: string; icon: typeof Repeat2 }[] = [
  { id: 'TROCA_FOLGA', title: 'Trocar folga', text: 'Folgar em outro dia e trabalhar no dia da sua folga.', icon: CalendarOff },
  { id: 'TROCA_TURNO', title: 'Trocar turno com colega', text: 'Combine uma troca de turno; o colega precisa aceitar.', icon: ArrowLeftRight },
  { id: 'AJUSTE_BATIDA', title: 'Ajustar batida', text: 'Corrigir um horário de ponto esquecido ou errado.', icon: ClipboardEdit },
  { id: 'JUSTIFICATIVA', title: 'Justificar falta ou atraso', text: 'Explique uma ausência ou atraso.', icon: FileText },
  { id: 'FOLGA_COMPENSACAO', title: 'Folga com banco de horas', text: 'Usar horas do banco para folgar em um dia.', icon: CalendarClock },
];

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const needsReason = (type: RequestType) => ['AJUSTE_BATIDA', 'JUSTIFICATIVA', 'NOVA_ESCALA'].includes(type);

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5 text-sm font-medium">{label}{children}{hint && <span className="block text-xs font-normal text-fg-sub">{hint}</span>}</label>;
}
const input = 'input-v2 w-full text-base sm:text-sm';

export function RequestWizard({ isOpen, initial, onClose, onCreated }: {
  isOpen: boolean;
  initial: { type?: RequestType; prefill?: Record<string, unknown> } | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<RequestType | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [peerId, setPeerId] = useState('');
  const [reason, setReason] = useState('');
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  const peers = useQuery(() => hubApi.peers(), [], { enabled: isOpen && type === 'TROCA_TURNO' });
  const schedules = useQuery(() => hubApi.schedules(), [], { enabled: isOpen && type === 'NOVA_ESCALA' });

  useEffect(() => {
    if (!isOpen) return;
    setType(initial?.type ?? null);
    setData(Object.fromEntries(Object.entries(initial?.prefill ?? {}).map(([key, value]) => [key, String(value)])));
    setPeerId(''); setReason(''); setFindings(null);
  }, [isOpen, initial]);

  const payload = useMemo(() => {
    const clean = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== ''));
    if (type === 'JUSTIFICATIVA' && clean.minutes) return { ...clean, minutes: Number(clean.minutes) };
    return clean;
  }, [data, type]);

  const complete = useMemo(() => {
    switch (type) {
      case 'TROCA_FOLGA': return Boolean(data.offDate && data.workDate);
      case 'TROCA_TURNO': return Boolean(data.date && peerId);
      case 'NOVA_ESCALA': return Boolean(data.scheduleId && data.startDate);
      case 'AJUSTE_BATIDA': return Boolean(data.date && (data.entry || data.lunchStart || data.lunchReturn || data.exit));
      case 'JUSTIFICATIVA': return Boolean(data.date && data.kind);
      case 'FOLGA_COMPENSACAO': return Boolean(data.date);
      default: return false;
    }
  }, [type, data, peerId]);

  useEffect(() => {
    if (!isOpen || !type || !complete) { setFindings(null); return; }
    setChecking(true);
    const timer = setTimeout(() => {
      hubApi.previewRequest({ type, payload, peerEmployeeId: peerId || undefined })
        .then((result) => setFindings(result.findings))
        .catch((cause) => setFindings([{ level: 'error', code: 'VALIDACAO', message: errorMessage(cause, 'Não foi possível validar.') }]))
        .finally(() => setChecking(false));
    }, 450);
    return () => clearTimeout(timer);
  }, [isOpen, type, complete, payload, peerId]);

  const errors = findings?.filter((item) => item.level === 'error') ?? [];
  const warnings = findings?.filter((item) => item.level === 'warning') ?? [];
  const reasonOk = !needsReason(type ?? 'TROCA_FOLGA') || reason.trim().length > 2;
  const canSubmit = Boolean(type && complete && !checking && findings && errors.length === 0 && reasonOk);

  async function submit() {
    if (!type || !canSubmit) return;
    setBusy(true);
    try {
      await hubApi.createRequest({ type, payload, reason: reason.trim() || undefined, peerEmployeeId: peerId || undefined });
      toast.success(type === 'TROCA_TURNO' ? 'Pedido enviado ao colega. Depois da resposta dele, segue para aprovação.' : 'Solicitação enviada para aprovação.');
      onCreated(); onClose();
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível enviar a solicitação.')); }
    finally { setBusy(false); }
  }

  const set = (key: string, value: string) => setData((current) => ({ ...current, [key]: value }));
  const activeSchedules = (schedules.data ?? []).filter((item) => item.status === 'ACTIVE');

  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title={type ? TYPES.find((item) => item.id === type)?.title ?? 'Solicitação' : 'Nova solicitação'}
      description={type ? undefined : 'O que você precisa?'} maxWidth="max-w-xl">
      {!type ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {TYPES.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setType(item.id)} className="flex h-full w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:border-purple-400 hover:bg-purple-50">
                <item.icon size={20} className="mt-0.5 shrink-0 text-purple-700" aria-hidden="true" />
                <span><span className="block text-sm font-semibold">{item.title}</span><span className="block text-xs text-fg-sub">{item.text}</span></span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          {type === 'TROCA_FOLGA' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Quero folgar no dia" hint="Um dia em que você está escalado."><input type="date" min={today()} className={input} value={data.offDate ?? ''} onChange={(event) => set('offDate', event.target.value)} /></Field>
              <Field label="E trabalhar no dia" hint="Um dia que hoje é sua folga."><input type="date" min={today()} className={input} value={data.workDate ?? ''} onChange={(event) => set('workDate', event.target.value)} /></Field>
            </div>
          )}
          {type === 'TROCA_TURNO' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data do turno"><input type="date" min={today()} className={input} value={data.date ?? ''} onChange={(event) => set('date', event.target.value)} /></Field>
              <Field label="Colega"><select className={input} value={peerId} onChange={(event) => setPeerId(event.target.value)}><option value="">Escolha…</option>{(peers.data ?? []).map((peer) => <option key={peer.id} value={peer.id}>{peer.name}</option>)}</select></Field>
            </div>
          )}
          {type === 'NOVA_ESCALA' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Escala desejada"><select className={input} value={data.scheduleId ?? ''} onChange={(event) => set('scheduleId', event.target.value)}><option value="">Escolha…</option>{activeSchedules.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.scaleType})</option>)}</select></Field>
              <Field label="A partir de"><input type="date" min={today()} className={input} value={data.startDate ?? ''} onChange={(event) => set('startDate', event.target.value)} /></Field>
            </div>
          )}
          {type === 'AJUSTE_BATIDA' && (
            <div className="space-y-3">
              <Field label="Data"><input type="date" max={today()} className={input} value={data.date ?? ''} onChange={(event) => set('date', event.target.value)} /></Field>
              <p className="text-xs text-fg-sub">Informe só os horários que precisam ser corrigidos ou incluídos.</p>
              <div className="grid grid-cols-2 gap-3">
                {([['entry', 'Entrada'], ['lunchStart', 'Saída p/ intervalo'], ['lunchReturn', 'Volta do intervalo'], ['exit', 'Saída']] as const).map(([key, label]) => (
                  <Field key={key} label={label}><input type="time" className={input} value={data[key] ?? ''} onChange={(event) => set(key, event.target.value)} /></Field>
                ))}
              </div>
            </div>
          )}
          {type === 'JUSTIFICATIVA' && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Data"><input type="date" max={today()} className={input} value={data.date ?? ''} onChange={(event) => set('date', event.target.value)} /></Field>
              <Field label="Tipo"><select className={input} value={data.kind ?? ''} onChange={(event) => set('kind', event.target.value)}><option value="">Escolha…</option><option value="FALTA">Falta</option><option value="ATRASO">Atraso</option><option value="ATESTADO">Atestado médico</option></select></Field>
              {data.kind === 'ATRASO' && <Field label="Minutos de atraso"><input type="number" min={1} max={600} className={input} value={data.minutes ?? ''} onChange={(event) => set('minutes', event.target.value)} /></Field>}
            </div>
          )}
          {type === 'FOLGA_COMPENSACAO' && <Field label="Dia da folga" hint="Será descontado do seu banco de horas."><input type="date" min={today()} className={input} value={data.date ?? ''} onChange={(event) => set('date', event.target.value)} /></Field>}

          <Field label={needsReason(type) ? 'Motivo *' : 'Motivo (opcional)'}>
            <textarea className={`${input} min-h-20`} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explique rapidamente o pedido" />
          </Field>

          <div aria-live="polite" className="space-y-2">
            {complete && checking && <p className="text-xs text-fg-sub">Verificando regras da CLT e da escala…</p>}
            {errors.map((item, index) => <p key={`e${index}`} role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{item.message}</p>)}
            {warnings.map((item, index) => <p key={`w${index}`} className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{item.message}</p>)}
            {complete && !checking && findings && errors.length === 0 && warnings.length === 0 && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Tudo certo com as regras. Você pode enviar.</p>}
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setType(null)} disabled={busy}>← Trocar tipo</Button>
            <div className="flex gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={!canSubmit}>Enviar solicitação</Button></div>
          </div>
        </form>
      )}
    </Modal>
  );
}
