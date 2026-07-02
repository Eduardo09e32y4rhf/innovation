'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock3, MapPin, AlertTriangle, FileEdit } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Employee, type PunchType } from '@/app/lib/api';

const MANUAL_REASONS = [
  { value: 'esquecimento', label: 'Esquecimento de registro' },
  { value: 'problema_sistema', label: 'Problema no sistema' },
  { value: 'trabalho_externo', label: 'Trabalho externo' },
  { value: 'outro', label: 'Outro motivo' },
] as const;

type ManualReason = (typeof MANUAL_REASONS)[number]['value'];

function useGeolocation() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalizacao nao suportada pelo navegador');
      setLoading(false);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLoading(false); },
      () => { setError('Permita o acesso a localizacao para bater o ponto'); setLoading(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error, loading };
}

function MapView({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-[12px] border border-slate-200 bg-slate-100">
      <iframe
        title="Localizacao"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`}
        className="h-full w-full border-0"
        loading="lazy"
      />
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-[8px] bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-sm">
        <MapPin size={14} className="text-teal-600" />
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
    </div>
  );
}

function ClockDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center">
      <p className="text-4xl font-black tabular-nums text-slate-950">{time.toLocaleTimeString('pt-BR')}</p>
      <p className="mt-1 text-sm text-slate-500">{time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
  );
}

export default function ClockInPage() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const isBlockedClockProfile = profile === 'DEV' || profile === 'COMERCIAL' || profile === 'CONSULTA';
  const geo = useGeolocation();

  const employees = useQuery(() => api.employees.list(), []);
  const userEmail = user?.email?.trim().toLowerCase();
  const myEmployee = (employees.data ?? []).find((e: Employee) => e.userId === user?.id || (userEmail && e.email?.trim().toLowerCase() === userEmail));

  const [success, setSuccess] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualType, setManualType] = useState<PunchType>('ENTRY');
  const [manualReason, setManualReason] = useState<ManualReason>('esquecimento');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualTime, setManualTime] = useState('');
  const successTimer = useRef<ReturnType<typeof setTimeout>>();

  const punch = useMutation(
    async (params: { type: PunchType; manual?: boolean }) => {
      if (!myEmployee) throw new Error('Seu usuario ainda nao esta vinculado a um funcionario ativo. Procure o RH.');
      const input: Parameters<typeof api.timeTrack.register>[0] = {
        ...(geo.position ? { latitude: geo.position.lat, longitude: geo.position.lng } : {}),
      };
      if (params.manual) {
        input.employeeId = myEmployee.id;
        input.type = params.type;
      }
      if (params.manual) {
        const [h, m] = manualTime.split(':').map(Number);
        const dt = new Date(manualDate);
        dt.setHours(h, m, 0, 0);
        input.timestamp = dt.toISOString();
        input.manualReason = MANUAL_REASONS.find((r) => r.value === manualReason)?.label ?? manualReason;
      }
      return api.timeTrack.register(input);
    },
    {
      onSuccess: (_data, params) => {
        const labels: Record<PunchType, string> = { ENTRY: 'Entrada', LUNCH_START: 'Saida almoco', LUNCH_RETURN: 'Retorno almoco', EXIT: 'Saida' };
        const label = labels[params.type];
        setSuccess(params.manual ? `${label} manual registrada! Aguardando aprovacao do gestor.` : 'Ponto registrado com sucesso!');
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => router.push('/dashboard/time-track'), 2500);
      },
    },
  );

  const handlePunch = useCallback((type: PunchType) => {
    punch.mutate({ type }).catch(() => {});
  }, [punch]);

  const handleManualPunch = useCallback(() => {
    if (!manualTime) return;
    punch.mutate({ type: manualType, manual: true }).catch(() => {});
  }, [punch, manualType, manualTime]);

  if (isBlockedClockProfile) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
        <h2 className="text-xl font-black text-slate-950">Este perfil não bate ponto</h2>
        <p className="mt-2 text-sm text-slate-500">Use um perfil de funcionário ativo vinculado ao cadastro para registrar ponto.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-black text-slate-950">{success}</h2>
        <p className="mt-2 text-sm text-slate-500">Redirecionando para a folha de ponto...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Controle de ponto</p>
        <h2 className="text-2xl font-black text-slate-950">Bater ponto</h2>
      </header>

      <ClockDisplay />

      {geo.loading ? (
        <div className="flex items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white p-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <span className="text-sm text-slate-500">Obtendo localizacao...</span>
        </div>
      ) : geo.error ? (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-center">
          <AlertTriangle size={24} className="mx-auto mb-2 text-amber-500" />
          <p className="text-sm font-semibold text-amber-800">{geo.error}</p>
          <p className="mt-1 text-xs text-amber-600">Voce ainda pode bater o ponto sem localizacao.</p>
        </div>
      ) : geo.position ? (
        <MapView lat={geo.position.lat} lng={geo.position.lng} />
      ) : null}

      {punch.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">{punch.error}</p>}

      <section className="ops-card rounded-[12px] border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-black text-slate-950">Registrar ponto</h3>
        <button onClick={() => handlePunch('ENTRY')} disabled={punch.loading || !myEmployee} className="crystal-button flex h-14 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-black text-white disabled:opacity-60">
          <Clock3 size={18} />
          Bater ponto agora
        </button>
        <p className="mt-3 text-xs font-medium text-slate-500">A sequencia e automatica: entrada, saida para almoco, retorno do almoco e saida.</p>
      </section>

      <section className="ops-card rounded-[12px] border border-slate-200 bg-white p-5">
        <button onClick={() => setShowManual(!showManual)} className="flex w-full items-center gap-2 text-sm font-black text-slate-700">
          <FileEdit size={16} className="text-teal-600" />
          Lancamento manual
          <span className="ml-auto text-xs text-slate-400">{showManual ? 'Fechar' : 'Abrir'}</span>
        </button>
        {showManual && (
          <div className="mt-4 space-y-3">
            <p className="rounded-[8px] bg-amber-50 px-3 py-2 text-xs text-amber-700">Lancamentos manuais precisam de aprovacao do seu gestor.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Tipo de registro</span>
                <select value={manualType} onChange={(e) => setManualType(e.target.value as PunchType)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                  <option value="ENTRY">Entrada</option>
                  <option value="LUNCH_START">Saida almoco</option>
                  <option value="LUNCH_RETURN">Retorno almoco</option>
                  <option value="EXIT">Saida</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Motivo</span>
                <select value={manualReason} onChange={(e) => setManualReason(e.target.value as ManualReason)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                  {MANUAL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Data</span>
                <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Horario</span>
                <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
              </label>
            </div>
            <div className="flex justify-end">
              <button onClick={handleManualPunch} disabled={!manualTime || punch.loading} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
                <FileEdit size={14} />
                Lancar manual
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="text-center">
        <button onClick={() => router.push('/dashboard/time-track')} className="text-sm font-semibold text-teal-600 hover:underline">
          Voltar para a folha de ponto
        </button>
      </div>
    </div>
  );
}
