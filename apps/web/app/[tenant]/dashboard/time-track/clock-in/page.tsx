'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter , useParams } from 'next/navigation';
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

function MapView({ lat, lng, className = "h-64" }: { lat: number; lng: number; className?: string }) {
  return (
    <div className={`relative w-full overflow-hidden rounded-[12px] border border-slate-200 bg-slate-100 ${className}`}>
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


function CameraCapture({ onCapture }: { onCapture: (base64: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCaptured(dataUrl);
        onCapture(dataUrl);
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : captured ? (
        <div className="relative overflow-hidden rounded-[12px] border border-slate-200">
          <img src={captured} alt="Rosto capturado" className="h-64 w-full object-cover" />
          <button onClick={() => { setCaptured(null); onCapture(''); }} className="absolute bottom-2 right-2 rounded-md bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
            Tirar outra
          </button>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[12px] border border-slate-200 bg-black">
          <video ref={videoRef} autoPlay playsInline className="h-64 w-full object-cover transform -scale-x-100" />
          <canvas ref={canvasRef} className="hidden" />
          <button onClick={capture} className="absolute bottom-4 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-lg border-4 border-slate-200 transition-transform active:scale-95">
             <div className="h-8 w-8 rounded-full bg-teal-500"></div>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClockInPage() {
  const params = useParams();
  const tenant = params?.tenant || '';

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
  const [imageBase64, setImageBase64] = useState<string>('');
  const [fallbackMode, setFallbackMode] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout>>();

  const enroll = useMutation(
    async () => {
      if (!imageBase64) throw new Error('Capture sua foto primeiro.');
      return api.facialRecognition.enroll({ imageBase64 });
    },
    {
      onSuccess: () => {
        setSuccess('Rosto cadastrado com sucesso! Agora você pode bater ponto.');
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => {
          setSuccess(null);
          employees.mutate(); // refresh employee data
        }, 2500);
      }
    }
  );

  const punch = useMutation(
    async (params: { type: PunchType; manual?: boolean }) => {
      if (!myEmployee) throw new Error('Seu usuario ainda nao esta vinculado a um funcionario ativo. Procure o RH.');
      const input: Parameters<typeof api.timeTrack.register>[0] = {
        ...(geo.position ? { latitude: geo.position.lat, longitude: geo.position.lng } : {}),
      };
      if (params.manual) {
        input.employeeId = myEmployee.id;
        input.type = params.type;
        const [h, m] = manualTime.split(':').map(Number);
        const dt = new Date(manualDate);
        dt.setHours(h, m, 0, 0);
        input.timestamp = dt.toISOString();
        input.manualReason = MANUAL_REASONS.find((r) => r.value === manualReason)?.label ?? manualReason;
        return api.timeTrack.manual(input as any);
      } else {
        return api.timeTrack.clockInFacial({
          ...input,
          type: params.type,
          imageBase64,
          fallback: fallbackMode,
        } as any);
      }
    },
    {
      onSuccess: (_data, params) => {
        const labels: Record<PunchType, string> = { ENTRY: 'Entrada', LUNCH_START: 'Saida almoco', LUNCH_RETURN: 'Retorno almoco', EXIT: 'Saida' };
        const label = labels[params.type];
        setSuccess(params.manual ? `${label} manual registrada! Aguardando aprovacao do gestor.` : 'Ponto registrado com sucesso!');
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => router.push(`/${tenant}/dashboard/time-track`), 2500);
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
      ) : (
        <div className="relative h-[480px] w-full overflow-hidden rounded-[16px] border border-slate-200 bg-slate-100 shadow-md">
          {geo.position ? (
            <MapView lat={geo.position.lat} lng={geo.position.lng} className="h-full border-none rounded-none" />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 p-4">
              <AlertTriangle size={32} className="text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-amber-800">{geo.error || 'Localização não disponível'}</p>
              <p className="text-xs text-slate-400 mt-1">Você ainda pode bater o ponto sem localização.</p>
            </div>
          )}

          {/* Camera Floating Box */}
          <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-80 rounded-[16px] bg-white/95 p-4 shadow-xl border border-slate-200/50 backdrop-blur-md z-10">
            {!(myEmployee?.faceEnrollment?.active) ? (
              <div>
                <div className="mb-3 text-center">
                  <h3 className="text-sm font-black text-slate-950">Cadastrar Facial</h3>
                  <p className="text-[10px] text-slate-500">Registre seu rosto para bater ponto.</p>
                </div>
                <CameraCapture onCapture={(b64) => setImageBase64(b64)} />
                <button
                  onClick={() => enroll.mutate().catch(() => {})}
                  disabled={!imageBase64 || enroll.loading}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] bg-emerald-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {enroll.loading ? 'Cadastrando...' : 'Salvar meu rosto'}
                </button>
              </div>
            ) : (
              <div>
                <h3 className="mb-2 text-xs font-black text-slate-950">Registrar ponto</h3>
                <CameraCapture onCapture={(b64) => setImageBase64(b64)} />
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <input type="checkbox" checked={fallbackMode} onChange={e => setFallbackMode(e.target.checked)} className="rounded border-slate-300" />
                    Ativar Fallback (Sem foto)
                  </label>
                </div>
                <button
                  onClick={() => handlePunch('ENTRY')}
                  disabled={(!imageBase64 && !fallbackMode) || punch.loading}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] bg-teal-700 py-3 text-xs font-bold text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
                >
                  <Clock3 size={14} />
                  {punch.loading ? 'Registrando...' : 'Bater ponto agora'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {(punch.error || enroll.error) && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">{punch.error || enroll.error}</p>}

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
        <button onClick={() => router.push(`/${tenant}/dashboard/time-track`)} className="text-sm font-semibold text-teal-600 hover:underline">
          Voltar para a folha de ponto
        </button>
      </div>
    </div>
  );
}
