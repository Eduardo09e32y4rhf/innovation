'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter , useParams } from 'next/navigation';
import { Check, Clock, MapPin, AlertTriangle, FileEdit, Settings, Camera, CameraOff } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@/app/hooks/use-data';
import { api, type Employee, type PunchType, type TimeTrack } from '@/app/lib/api';
import { hasPermission } from '@/app/lib/permissions';
import { toast } from 'sonner';

import dynamic from 'next/dynamic';

const FaceIDOverlay = dynamic(() => import('@/app/components/FaceIDOverlay').then((m) => m.FaceIDOverlay), { ssr: false });

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
      setError('Geolocalização não suportada pelo navegador');
      setLoading(false);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { 
         setPosition(prev => {
           if (!prev) return { lat: pos.coords.latitude, lng: pos.coords.longitude };
           const dLat = Math.abs(prev.lat - pos.coords.latitude);
           const dLng = Math.abs(prev.lng - pos.coords.longitude);
           if (dLat > 0.0001 || dLng > 0.0001) return { lat: pos.coords.latitude, lng: pos.coords.longitude };
           return prev;
         });
         setLoading(false); 
      },
      () => { setError('Permita o acesso à localização para bater o ponto'); setLoading(false); },
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
        <MapPin size={14} className="text-brand" />
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
    </div>
  );
}

function ClockDisplay() {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  
  if (!time) {
    return (
      <div className="text-center min-h-[72px]">
        <p className="text-4xl font-black tabular-nums text-transparent select-none">00:00:00</p>
      </div>
    );
  }
  
  return (
    <div className="text-center min-h-[72px]">
      <p className="text-4xl font-black tabular-nums text-slate-950">{time.toLocaleTimeString('pt-BR')}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500 capitalize">{time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
  );
}

export default function ClockInPage() {
  const params = useParams();
  const tenant = params?.tenant || '';
  const queryClient = useQueryClient();

  const router = useRouter();
  const { user } = useAuth();
  
  const canManage = hasPermission(user, 'time_tracking.view_all');
  const isGestor = hasPermission(user, 'time_tracking.view_team') && !canManage;
  const isFunc = !canManage && !isGestor;

  const profile = user?.profile?.toUpperCase();
  const isBlockedClockProfile = profile === 'DEV' || profile === 'COMERCIAL' || profile === 'CONSULTA';
  const geo = useGeolocation();

  const { data: companyData, refetch: refetchCompany } = useQuery(() => api.companies.me(), []);
  // Se undefined, assumimos true (biometria exigida)
  const isBiometricRequired = companyData?.requireFacialRecognition !== false;

  const updateCompanyMut = useMutation(
    (requireFacial: boolean) => api.companies.update({ requireFacialRecognition: requireFacial } as any),
    {
      onSuccess: () => {
        toast.success('Configuração de biometria atualizada!');
        refetchCompany();
      }
    }
  );

  const employees = useQuery(() => api.employees.list(), []);
  const userEmail = user?.email?.trim().toLowerCase();
  const myEmployee = (employees.data ?? []).find((e: Employee) => e.userId === user?.id || (userEmail && e.email?.trim().toLowerCase() === userEmail));

  const [success, setSuccess] = useState<string | null>(null);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualType, setManualType] = useState<PunchType>('ENTRY');
  const [manualReason, setManualReason] = useState<ManualReason>('esquecimento');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualTime, setManualTime] = useState('');
  const [showFaceID, setShowFaceID] = useState(false);
  const [activePunchType, setActivePunchType] = useState<PunchType | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout>>();

  const [currentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: punchesData } = useQuery<TimeTrack[]>(
    () => api.timeTrack.listEmployeeMonth(myEmployee!.id, currentMonth),
    [myEmployee?.id, currentMonth],
    { enabled: !!myEmployee }
  );

  const todayTrack = useMemo(() => {
    if (!punchesData) return null;
    const today = new Date().toISOString().slice(0, 10);
    return punchesData.find(p => p.date && p.date.startsWith(today)) || null;
  }, [punchesData]);

  const nextPunchType = useMemo<PunchType>(() => {
    if (!todayTrack) return 'ENTRY';
    if (!todayTrack.entry) return 'ENTRY';
    if (!todayTrack.lunchStart) return 'LUNCH_START';
    if (!todayTrack.lunchReturn) return 'LUNCH_RETURN';
    if (!todayTrack.exit) return 'EXIT';
    return 'EXIT';
  }, [todayTrack]);

  const nextPunchLabel: Record<PunchType, string> = { ENTRY: 'Entrada', LUNCH_START: 'Saída para o Almoço', LUNCH_RETURN: 'Retorno do Almoço', EXIT: 'Saída' };

  const enroll = useMutation(
    async (descriptor: number[]) => {
      setPunchError(null);
      return api.timeTrack.enrollFacial({ descriptor });
    },
    {
      onSuccess: () => {
        setSuccess('Rosto cadastrado com sucesso! Registrando seu ponto...');
        employees.refetch(); 
        if (activePunchType) {
          punch.mutate({ type: activePunchType, skipEnroll: true }).catch((err) => setPunchError(err.message || 'Erro ao bater ponto'));
        } else {
          successTimer.current = setTimeout(() => setSuccess(null), 2500);
        }
      },
      onError: (err: any) => {
        setPunchError(err.message || 'Erro ao cadastrar biometria facial.');
      }
    }
  );

  const punch = useMutation(
    async (params: { type: PunchType; manual?: boolean; imageBase64?: string; faceDescriptor?: number[]; skipEnroll?: boolean }) => {
      if (!myEmployee) throw new Error('Seu usuário ainda não está vinculado a um funcionário ativo. Procure o RH.');
      const input: any = {
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
        return api.timeTrack.manual(input);
      } else {
        if (!isBiometricRequired) {
          input.type = params.type;
          input.employeeId = myEmployee.id;
          input.timestamp = new Date().toISOString();
          return api.timeTrack.register(input); // API Endpoint Padrão sem biometria
        }
        return api.timeTrack.clockInFacial({
          ...input,
          type: params.type,
          imageBase64: params.imageBase64,
          faceDescriptor: params.faceDescriptor,
          fallback: false,
        });
      }
    },
    {
      onSuccess: (_data, params) => {
        (queryClient as any).invalidateQueries(['time-track']);
        const label = nextPunchLabel[params.type];
        setSuccess(params.manual ? `${label} manual registrada! Aguardando aprovação do gestor.` : 'Ponto registrado com sucesso!');
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => router.push(`/${tenant}/dashboard/escalas/ponto`), 2500);
      },
      onError: (err: any) => {
        setPunchError(err.message || 'Erro ao bater ponto.');
      }
    },
  );

  const handlePunch = useCallback((type: PunchType) => {
      if (isBiometricRequired) {
        setActivePunchType(type);
        setShowFaceID(true);
      } else {
        punch.mutate({ type }).catch((err) => setPunchError(err.message || 'Erro ao registrar ponto'));
      }
  }, [punch, isBiometricRequired]);

  const handleFaceCapture = async (photoBase64: string, faceDescriptor?: number[]) => {
    setShowFaceID(false);
    if (!activePunchType) return;
    
    if (!(myEmployee?.faceEnrollment?.active) && faceDescriptor) {
      enroll.mutate(faceDescriptor).catch((err) => setPunchError(err.message || 'Erro no cadastro biométrico'));
    } else {
      punch.mutate({ type: activePunchType, imageBase64: photoBase64, faceDescriptor }).catch((err) => setPunchError(err.message || 'Erro ao registrar ponto'));
    }
  };

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
        <button onClick={() => router.push(`/${tenant}/dashboard/escalas/ponto`)} className="mt-6 text-sm font-semibold text-brand hover:underline">
          Voltar
        </button>
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
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand">Controle de ponto</p>
          <h2 className="text-2xl font-black text-slate-950">Bater ponto</h2>
        </div>
        
        {/* Toggle para DEV / ADMIN */}
        {(canManage) && (
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
            <Settings size={16} className="text-slate-400" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Segurança</span>
              <span className="text-xs font-bold text-slate-700">Biometria Facial</span>
            </div>
            <button 
              onClick={() => updateCompanyMut.mutate(!isBiometricRequired)}
              disabled={updateCompanyMut.loading}
              className={`ml-2 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isBiometricRequired ? 'bg-brand' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBiometricRequired ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
        )}
      </header>

      <ClockDisplay />

      {geo.loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="text-sm font-semibold text-slate-500">Obtendo localização...</span>
        </div>
      ) : (
        <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-md">
          {geo.position ? (
            <MapView lat={geo.position.lat} lng={geo.position.lng} className="h-full border-none rounded-none" />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 p-4">
              <AlertTriangle size={32} className="text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-amber-800">{geo.error || 'Localização não disponível'}</p>
              <p className="text-xs text-slate-400 mt-1">Você ainda pode bater o ponto sem localização.</p>
            </div>
          )}

          {/* Floating Box */}
          <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-80 rounded-xl bg-white/95 p-4 shadow-xl border border-slate-200/50 backdrop-blur-md z-10">
            <div>
              <h3 className="mb-4 text-sm font-black text-slate-950 text-center flex items-center justify-center gap-2">
                {isBiometricRequired ? <><Camera size={16} className="text-brand"/> Bater Ponto com Facial</> : <><CameraOff size={16} className="text-slate-400"/> Bater Ponto Simples</>}
              </h3>
              
              {punchError && (
                <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-center">
                  <p className="text-xs font-bold text-rose-600 flex items-center justify-center gap-1">
                    <AlertTriangle size={14} /> {punchError}
                  </p>
                </div>
              )}

              <button
                onClick={() => handlePunch(nextPunchType)}
                disabled={punch.loading || enroll.loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-4 text-sm font-bold text-white transition-colors hover:bg-[#72049e] disabled:opacity-50 shadow-md shadow-brand/20"
              >
                <Clock size={18} />
                {nextPunchLabel[nextPunchType]}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFaceID && isBiometricRequired && (
        <FaceIDOverlay 
          title={!(myEmployee?.faceEnrollment?.active) ? "Cadastrar Biometria Facial" : "Validar Biometria Facial"}
          onCapture={handleFaceCapture}
          onCancel={() => setShowFaceID(false)}
          compareDescriptor={myEmployee?.faceEnrollment?.active && myEmployee.faceEnrollment.vectors ? (myEmployee.faceEnrollment.vectors as number[]) : undefined}
        />
      )}

      {(punch.error || enroll.error) && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">{punch.error || enroll.error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <button onClick={() => setShowManual(!showManual)} className="flex w-full items-center gap-2 text-sm font-black text-slate-700 hover:text-brand transition-colors">
          <FileEdit size={16} className={showManual ? "text-brand" : "text-slate-400"} />
          Lançamento manual
          <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">{showManual ? 'Fechar' : 'Abrir'}</span>
        </button>
        {showManual && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 border border-amber-100">Lançamentos manuais precisarão de aprovação do seu gestor após o registro.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <span>Tipo de registro</span>
                <select value={manualType} onChange={(e) => setManualType(e.target.value as PunchType)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all">
                  <option value="ENTRY">Entrada</option>
                  <option value="LUNCH_START">Saída para o almoço</option>
                  <option value="LUNCH_RETURN">Retorno do almoço</option>
                  <option value="EXIT">Saída</option>
                </select>
              </label>
              <label className="space-y-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <span>Motivo</span>
                <select value={manualReason} onChange={(e) => setManualReason(e.target.value as ManualReason)} className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all">
                  {MANUAL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <span>Data</span>
                <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all" />
              </label>
              <label className="space-y-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <span>Horário</span>
                <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all" />
              </label>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={handleManualPunch} disabled={!manualTime || punch.loading} className="btn-nubank inline-flex h-10 items-center gap-2">
                <FileEdit size={14} />
                Enviar Registro
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="text-center pb-10">
        <button onClick={() => router.push(`/${tenant}/dashboard/escalas/ponto`)} className="text-sm font-semibold text-brand hover:underline">
          Voltar para a folha de ponto
        </button>
      </div>
    </div>
  );
}
