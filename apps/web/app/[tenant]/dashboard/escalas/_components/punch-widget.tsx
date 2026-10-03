'use client';

import { CheckCircle2, Clock3, Loader2, MapPin, MapPinOff, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { ApiError } from '@/app/lib/api';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi } from '../_lib/hub-api';
import { DAY_TYPE_LABEL, errorMessage, fmtMinutes, fmtTime } from '../_lib/format';
import type { PunchResult } from '../_lib/types';

interface Position { latitude: number; longitude: number; accuracyMeters: number }

function readPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Este aparelho não oferece localização.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (result) => resolve({ latitude: result.coords.latitude, longitude: result.coords.longitude, accuracyMeters: result.coords.accuracy }),
      (error) => reject(new Error(
        error.code === error.PERMISSION_DENIED
          ? 'Permissão de localização negada. Libere a localização do navegador para bater o ponto.'
          : error.code === error.TIMEOUT
            ? 'Não foi possível obter sua localização a tempo. Vá para um local aberto e tente de novo.'
            : 'Não foi possível obter sua localização.',
      )),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

function deviceId() {
  try {
    const key = 'hub-device-id';
    let id = window.localStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); window.localStorage.setItem(key, id); }
    return id;
  } catch { return undefined; }
}

export function PunchWidget({ onPunched, compact = false }: { onPunched?: () => void; compact?: boolean }) {
  const today = useQuery(() => hubApi.punchToday(), [], { pollMs: 120000 });
  const data = today.data;
  const [now, setNow] = useState(() => new Date());
  const offset = useRef(0);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<PunchResult | null>(null);
  const [error, setError] = useState('');
  const [justify, setJustify] = useState<{ position: Position | null; message: string } | null>(null);
  const [justification, setJustification] = useState('');

  useEffect(() => { if (data) offset.current = new Date(data.serverTime).getTime() - Date.now(); }, [data]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date(Date.now() + offset.current)), 1000);
    return () => clearInterval(timer);
  }, []);

  async function submit(position: Position | null, why?: string) {
    setBusy(true); setError('');
    try {
      const result = await hubApi.punch({ ...(position ?? {}), justification: why, deviceId: deviceId() });
      setReceipt(result); setJustify(null); setJustification('');
      toast.success(`${result.label} registrada às ${fmtTime(result.occurredAt)}.`);
      today.refetch(); onPunched?.();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'JUSTIFICATION_REQUIRED') { setJustify({ position, message: cause.message }); }
      else setError(errorMessage(cause, 'Não foi possível registrar o ponto.'));
    } finally { setBusy(false); }
  }

  async function press() {
    if (busy || !data?.next) return;
    setBusy(true); setError(''); setReceipt(null);
    try {
      let position: Position | null = null;
      try { position = await readPosition(); }
      catch (cause) {
        if (data.policy.requireLocation) throw cause;
      }
      setBusy(false);
      await submit(position);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível obter a localização.'));
      setBusy(false);
    }
  }

  const clock = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
  const dateText = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long' }).format(now);

  return (
    <section aria-label="Bater ponto" className="card-v2 overflow-hidden">
      <div className="bg-gradient-to-br from-purple-700 to-purple-900 p-5 text-white sm:p-6">
        <p className="text-sm capitalize text-purple-100">{dateText}</p>
        <p className="mt-1 font-mono text-5xl font-semibold tabular-nums tracking-tight" aria-live="off">{clock}</p>
        <p className="mt-2 text-sm text-purple-100">
          {data?.day.working ? `Escala de hoje: ${data.day.entry}–${data.day.exit}` : data ? `Hoje: ${DAY_TYPE_LABEL[data.day.type]}` : 'Carregando escala…'}
        </p>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {today.error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{today.error}</p>}
        {data && (
          <>
            {data.next ? (
              <Button size="lg" className="w-full !min-h-14 text-base" isLoading={busy} onClick={press}>
                <Clock3 size={20} aria-hidden="true" /> Registrar {data.next.label.toLowerCase()}
              </Button>
            ) : (
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 size={18} aria-hidden="true" /> Todas as marcações de hoje foram registradas.</p>
            )}
            <p className="flex items-start gap-2 text-xs text-fg-sub">
              {data.policy.requireLocation ? <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : <MapPinOff size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
              {data.policy.requireLocation
                ? 'Sua localização é lida somente no momento da batida e registrada no comprovante.'
                : 'A localização não é obrigatória, mas será registrada se estiver disponível.'}
              {data.fenceConfigured && !data.external && data.policy.fencePolicy !== 'OFF' && (data.policy.fencePolicy === 'BLOCK' ? ' O ponto só é aceito dentro do local de trabalho.' : ' Fora do local de trabalho será pedida uma justificativa.')}
            </p>
          </>
        )}

        {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</p>}

        {receipt && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">{receipt.label} registrada às {fmtTime(receipt.occurredAt)}</p>
            <p className="mt-1 font-mono text-xs">Comprovante: {receipt.receipt}</p>
            {receipt.address && <p className="mt-1 text-xs">{receipt.address}</p>}
            {receipt.pendingApproval && <p className="mt-2 text-xs text-amber-800">Registrado fora do local permitido: aguarda aprovação do gestor/RH.</p>}
          </div>
        )}

        {!compact && data && (
          <div>
            <p className="mb-2 text-sm font-medium">Batidas de hoje</p>
            {data.events.length === 0 ? <p className="text-sm text-fg-sub">Nenhuma batida ainda.</p> : (
              <ul className="space-y-2">
                {data.events.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium">{event.label}</p>
                      <p className="text-xs text-fg-sub">{event.address ?? (event.withinFence === false ? `${event.distanceMeters} m do local` : 'Local registrado')}</p>
                      {event.flags.length > 0 && <p className="text-xs text-amber-700">{event.flags.map((flag) => flag === 'FORA_DA_CERCA' ? 'Fora do local' : flag === 'SALTO_DE_POSICAO' ? 'Posição suspeita' : flag === 'AJUSTE_APROVADO' ? 'Ajuste aprovado' : flag).join(' · ')}</p>}
                    </div>
                    <span className="font-mono font-semibold tabular-nums">{fmtTime(event.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.totals && <p className="mt-3 text-xs text-fg-sub">Trabalhado hoje: {fmtMinutes(data.totals.totalWorked)} · Saldo: {fmtMinutes(data.totals.dailyBalance, true)}</p>}
          </div>
        )}
        {today.loading && !data && <p className="flex items-center gap-2 text-sm text-fg-sub"><Loader2 className="animate-spin" size={16} aria-hidden="true" /> Carregando…</p>}
      </div>

      <Modal isOpen={Boolean(justify)} onClose={() => !busy && setJustify(null)} title="Ponto fora do local de trabalho" description={justify?.message}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (justification.trim()) void submit(justify?.position ?? null, justification.trim()); }}>
          <label className="block space-y-1.5 text-sm font-medium">Justificativa *
            <textarea className="input-v2 min-h-24 w-full" maxLength={300} value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="Ex.: atendimento externo ao cliente X" autoFocus />
          </label>
          <p className="text-xs text-fg-sub">O registro ficará pendente até o gestor ou RH aprovar.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setJustify(null)} disabled={busy}>Cancelar</Button>
            <Button type="submit" isLoading={busy} disabled={!justification.trim()}>Registrar mesmo assim</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
