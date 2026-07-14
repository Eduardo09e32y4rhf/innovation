'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';
import {
  CalendarClock,
  Users,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Briefcase,
  RefreshCw,
  X,
  Check,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Moon,
  Ban,
  FileText,
  Stethoscope,
  MapPin,
  Info,
} from 'lucide-react';
import { formatMinutes } from '@/app/lib/format';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Tab = 'minha' | 'equipe' | 'trocas';
type UserRole = 'DEV' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';

interface ActualData {
  entry?: string | null;
  lunchStart?: string | null;
  lunchReturn?: string | null;
  exit?: string | null;
  totalWorked?: number | null;
  dailyBalance?: number | null;
  overtime50Minutes?: number | null;
  overtime100Minutes?: number | null;
  nightShiftMinutes?: number | null;
  lateMinutes?: number | null;
  absenceMinutes?: number | null;
  incidentType?: string | null;
  observation?: string | null;
  manualReason?: string | null;
  manualStatus?: string | null;
  overtimeApprovalStatus?: string | null;
  overtimeHandling?: string | null;
  clockedInWithoutFacial?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  locationAddress?: string | null;
}

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  dayType: string;
  scheduled: {
    entry?: string | null;
    lunchStart?: string | null;
    lunchReturn?: string | null;
    exit?: string | null;
  };
  actual: ActualData | null;
  exception?: any;
  holiday?: { name: string; date: string } | null;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

/** Interpreta o dayType vindo da API, mas também lê observation/manualReason do ponto */
function resolveDayType(day: CalendarDay): string {
  const obs = (day.actual?.observation ?? '').toLowerCase();
  const reason = (day.actual?.manualReason ?? '').toLowerCase();

  if (day.actual?.manualStatus === 'revoked') return 'REVOGADO';
  if (obs.includes('atestado integral') || reason === 'ajuste_atestado_integral') return 'ATESTADO';
  if ((obs.includes('atestado') && obs.includes('horas')) || reason === 'ajuste_abono_atestado_horas') return 'ATESTADO_HORAS';
  if (obs.includes('suspensao') || obs.includes('suspensão') || reason === 'ajuste_suspensao') return 'SUSPENSAO';
  if (obs.includes('feriado') || reason === 'ajuste_feriado' || day.holiday) return 'FERIADO';
  if (obs.includes('folga banco') || reason === 'ajuste_abono_folga') return 'FOLGA_BANCO';
  if (obs.includes('folga dsr') || reason === 'ajuste_folga_dsr') return 'FOLGA_DSR';
  if (obs.includes('folga') || reason === 'ajuste_abono_banco_saida_antecipada') return 'FOLGA';
  if (day.exception?.exceptionType === 'AJUSTE_ESCALA') return 'AJUSTE';
  if (day.actual?.incidentType === 'atraso') return 'ATRASO';
  if (day.actual?.incidentType === 'saida_antecipada') return 'SAIDA_ANTECIPADA';
  if (day.actual?.incidentType === 'falta') return 'FALTA';
  if (day.actual && !day.actual.entry && !day.actual.exit && day.dayType === 'WORK') return 'FALTA';

  // fallback ao dayType da API (escala)
  return day.dayType;
}

const DAY_TYPE_META: Record<string, { label: string; color: string; textColor: string; icon: string }> = {
  WORK:            { label: 'Trabalho',           color: 'bg-emerald-50 border-emerald-500/25',  textColor: 'text-emerald-600', icon: '✅' },
  FOLGA:           { label: 'Folga',              color: 'bg-blue-50 border-blue-500/25',        textColor: 'text-blue-600',    icon: '🔵' },
  FOLGA_DSR:       { label: 'Folga DSR',          color: 'bg-blue-50 border-blue-500/25',        textColor: 'text-blue-600',    icon: '🔵' },
  FOLGA_BANCO:     { label: 'Folga Banco',        color: 'bg-cyan-50 border-cyan-500/25',        textColor: 'text-cyan-600',    icon: '🏦' },
  FERIADO:         { label: 'Feriado',            color: 'bg-amber-50 border-amber-500/25',      textColor: 'text-amber-600',   icon: '🟡' },
  FERIADO_LOCAL:   { label: 'Feriado Local',      color: 'bg-amber-50 border-amber-500/25',      textColor: 'text-amber-600',   icon: '🟡' },
  ATESTADO:        { label: 'Atestado',           color: 'bg-purple-50 border-purple-500/25',    textColor: 'text-purple-600',  icon: '💊' },
  ATESTADO_HORAS:  { label: 'Atestado (horas)',   color: 'bg-purple-50 border-purple-500/25',    textColor: 'text-purple-600',  icon: '💊' },
  SUSPENSAO:       { label: 'Suspensão',          color: 'bg-red-100 border-red-700/30',          textColor: 'text-red-700',     icon: '🚫' },
  ATRASO:          { label: 'Atraso',             color: 'bg-orange-50 border-orange-500/25',    textColor: 'text-orange-600',  icon: '⏰' },
  SAIDA_ANTECIPADA:{ label: 'Saída Antecipada',   color: 'bg-orange-50 border-orange-500/25',    textColor: 'text-orange-600',  icon: '🏃' },
  FALTA:           { label: 'Falta',              color: 'bg-red-50 border-red-500/25',          textColor: 'text-red-700',     icon: '❌' },
  REVOGADO:        { label: 'Revogado',           color: 'bg-zinc-50 border-zinc-600/25',        textColor: 'text-zinc-700',    icon: '↩' },
  SEM_ESCALA:      { label: 'Sem Escala',         color: 'bg-zinc-800/30 border-zinc-700/30',        textColor: 'text-zinc-500',    icon: '—' },
  COMPENSACAO:     { label: 'Compensação',        color: 'bg-teal-50 border-teal-500/25',        textColor: 'text-teal-600',    icon: '🔄' },
  AJUSTE:          { label: 'Ajuste Escala',      color: 'bg-indigo-50 border-indigo-500/25',    textColor: 'text-indigo-600',  icon: '⚙️' },
};

function getMeta(type: string) {
  return DAY_TYPE_META[type] ?? DAY_TYPE_META.SEM_ESCALA;
}

function formatTime(t?: string | null) {
  if (!t) return '--:--';
  const d = new Date(t);
  return isNaN(d.getTime()) ? (t.slice(0, 5) ?? '--:--') : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatMin(min?: number | null, showSign = true) {
  if (min == null) return '--';
  return formatMinutes(min);
}

function toMonthString(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonth(s: string): [number, number] {
  const [y, m] = s.split('-').map(Number);
  return [y, m];
}

/** Calcula totais mensais a partir dos dias do calendário */
function calcMonthlyTotals(days: CalendarDay[]) {
  let totalWorked = 0;
  let totalBalance = 0;
  let overtime50 = 0;
  let overtime100 = 0;
  let nightShift = 0;
  let lateMinutes = 0;
  let absenceMinutes = 0;
  let faltas = 0;
  let atrasos = 0;
  let saidasAntecipadas = 0;
  let horaExtra = 0;

  for (const day of days) {
    const a = day.actual;
    if (!a) continue;
    totalWorked += a.totalWorked ?? 0;
    totalBalance += a.dailyBalance ?? 0;
    const ot50 = a.overtime50Minutes ?? 0;
    const ot100 = a.overtime100Minutes ?? 0;
    // Só conta HE aprovadas
    if (a.overtimeApprovalStatus === 'APPROVED') {
      overtime50 += ot50;
      overtime100 += ot100;
      horaExtra += ot50 + ot100;
    }
    nightShift += a.nightShiftMinutes ?? 0;
    lateMinutes += a.lateMinutes ?? 0;
    absenceMinutes += a.absenceMinutes ?? 0;

    const resolved = resolveDayType(day);
    if (resolved === 'FALTA') faltas++;
    else if (resolved === 'ATRASO') atrasos++;
    else if (resolved === 'SAIDA_ANTECIPADA') saidasAntecipadas++;
  }

  return {
    totalWorked, totalBalance, overtime50, overtime100, nightShift,
    lateMinutes, absenceMinutes, faltas, atrasos, saidasAntecipadas, horaExtra,
  };
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const SWAP_STATUS_BADGE: Record<string, string> = {
  PENDING:   'bg-amber-50 text-amber-600 border-amber-500/30',
  APPROVED:  'bg-emerald-50 text-emerald-600 border-emerald-500/30',
  REJECTED:  'bg-red-50 text-red-600 border-red-500/30',
  CANCELLED: 'bg-zinc-50 text-zinc-700 border-zinc-500/30',
};
const SWAP_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado', CANCELLED: 'Cancelado',
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function EscalaPage() {
  const { user } = useAuth();
  const role = (user?.profile?.toUpperCase() || 'FUNCIONARIO') as UserRole;
  const canApprove = ['DEV', 'ADMIN', 'RH', 'GESTOR'].includes(role);
  const canWrite   = ['DEV', 'ADMIN', 'RH'].includes(role);

  const now = new Date();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get('tab') as Tab) || 'minha';
  const [currentMonth, setCurrentMonth] = useState(toMonthString(now.getFullYear(), now.getMonth() + 1));
  const [calendarData, setCalendarData] = useState<any>(null);
  const [teamData, setTeamData]   = useState<any>(null);
  const [swaps, setSwaps]         = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Modais
  const [showModalSwap,    setShowModalSwap]    = useState(false);
  const [showModalLancar,  setShowModalLancar]  = useState(false);
  const [showModalApprove, setShowModalApprove] = useState<any | null>(null);

  const loadMyCalendar = useCallback(async () => {
    setLoading(true);
    try {
      if (canApprove && allEmployees.length === 0) {
        api.employees.list().then(setAllEmployees).catch(() => {});
      }
      const data = targetEmployeeId && targetEmployeeId !== user?.id
        ? await api.schedules.calendar(targetEmployeeId, currentMonth)
        : await api.schedules.myCalendar(currentMonth);
      setCalendarData(data);
    } catch { setCalendarData(null); }
    setLoading(false);
  }, [currentMonth, targetEmployeeId, canApprove, allEmployees.length, user?.id]);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.schedules.teamSchedule(currentMonth);
      setTeamData(data);
    } catch { setTeamData(null); }
    setLoading(false);
  }, [currentMonth]);

  const loadSwaps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.scheduleSwaps.list();
      setSwaps(Array.isArray(data) ? data : []);
    } catch { setSwaps([]); }
    setLoading(false);
  }, []);

  const loadSchedules = useCallback(async () => {
    if (!canWrite) return;
    try {
      const data = await api.schedules.list();
      setSchedules(Array.isArray(data) ? data : []);
    } catch { setSchedules([]); }
  }, [canWrite]);

  useEffect(() => {
    if (tab === 'minha') loadMyCalendar();
    else if (tab === 'equipe') { loadTeam(); if (canWrite) loadSchedules(); }
    else if (tab === 'trocas') loadSwaps();
  }, [tab, currentMonth]);

  const prevMonth = () => {
    const [y, m] = parseMonth(currentMonth);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(toMonthString(d.getFullYear(), d.getMonth() + 1));
  };
  const nextMonth = () => {
    const [y, m] = parseMonth(currentMonth);
    const d = new Date(y, m, 1);
    setCurrentMonth(toMonthString(d.getFullYear(), d.getMonth() + 1));
  };

  const [year, month] = parseMonth(currentMonth);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-800 ring-1 ring-slate-200">
          <CalendarClock size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Escala</h1>
          <p className="text-xs text-slate-500">Jornada programada · Ponto · Ocorrências</p>
        </div>
      </div>



      {tab === 'minha' && (
        <div className="flex flex-col gap-4">
          {canApprove && (
            <div className="flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 shadow-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">Ver Escala de:</label>
              <select value={targetEmployeeId} onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none">
                <option value="">Minha Escala</option>
                {allEmployees.map(e => <option key={e.id} value={e.id}>[{e.registration || '-'}] {e.name?.toUpperCase()}</option>)}
              </select>
            </div>
          )}
          <MinhaEscalaTab
            loading={loading}
            calendarData={calendarData}
            year={year} month={month}
            onPrev={prevMonth} onNext={nextMonth}
            selectedDay={selectedDay} onSelectDay={setSelectedDay}
            targetEmployeeId={targetEmployeeId}
            canWrite={canWrite}
          />
        </div>
      )}
      {tab === 'equipe' && canApprove && (
        <EscalaEquipeTab
          loading={loading} teamData={teamData} schedules={schedules} canWrite={canWrite}
          year={year} month={month}
          onPrev={prevMonth} onNext={nextMonth}
          onLancar={() => setShowModalLancar(true)} onRefresh={loadTeam}
        />
      )}
      {tab === 'trocas' && (
        <TrocarEscalaTab
          loading={loading} swaps={swaps} canApprove={canApprove}
          onNovatroca={() => setShowModalSwap(true)}
          onApprove={(s) => setShowModalApprove(s)}
          onCancel={async (id) => { await api.scheduleSwaps.cancel(id); loadSwaps(); }}
          onRefresh={loadSwaps}
        />
      )}

      {showModalSwap && <ModalSolicitarTroca onClose={() => setShowModalSwap(false)} onSuccess={() => { setShowModalSwap(false); loadSwaps(); }} canApprove={canApprove} allEmployees={allEmployees} />}
      {showModalLancar  && <ModalLancarEscala schedules={schedules} onClose={() => setShowModalLancar(false)} onSuccess={() => { setShowModalLancar(false); loadTeam(); loadSchedules(); }} />}
      {showModalApprove && <ModalAprovarTroca swap={showModalApprove} onClose={() => setShowModalApprove(null)} onSuccess={() => { setShowModalApprove(null); loadSwaps(); }} />}
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        active ? 'bg-slate-900 text-white shadow-lg shadow-slate-500/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
    >
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ─── MINHA ESCALA ─────────────────────────────────────────────────────────────

function MinhaEscalaTab({ loading, calendarData, year, month, onPrev, onNext, selectedDay, onSelectDay }: any) {
  const days: CalendarDay[] = calendarData?.days || [];
  const schedule = calendarData?.schedule;

  const totals = calcMonthlyTotals(days);
  const firstDow = days[0] ? new Date(days[0].date + 'T00:00:00').getDay() : 0;

  return (
    <div className="flex flex-col gap-5">

      {/* Escala ativa */}
      {schedule ? (
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
            <Briefcase size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">{schedule.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {schedule.scaleType} · Entrada: {schedule.entryTime ?? '--'} · Saída: {schedule.exitTime ?? '--'}
              {schedule.lunchStartTime ? ` · Almoço: ${schedule.lunchStartTime}–${schedule.lunchReturnTime ?? '?'}` : ''}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">ATIVA</span>
        </div>
      ) : !loading && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 text-amber-600 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          Nenhuma escala atribuída. Fale com seu gestor ou RH.
        </div>
      )}

      {/* Cards de resumo mensal — integração direta com Ponto */}
      {days.length > 0 && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Hora Extra"
            value={totals.horaExtra > 0 ? formatMin(totals.horaExtra) : '0h00m'}
            sub={`50%: ${formatMin(totals.overtime50)} · 100%: ${formatMin(totals.overtime100)}`}
            color="text-emerald-700" bg="bg-emerald-500/8 ring-emerald-200"
            icon={<TrendingUp size={16} className="text-emerald-700"/>}
          />
          <SummaryCard
            label="Faltas"
            value={String(totals.faltas)}
            sub={totals.absenceMinutes > 0 ? `${formatMin(totals.absenceMinutes)} de ausência` : 'Nenhuma falta'}
            color="text-red-700" bg="bg-red-500/8 ring-red-200"
            icon={<Ban size={16} className="text-red-700"/>}
          />
          <SummaryCard
            label="Atrasos"
            value={String(totals.atrasos)}
            sub={totals.lateMinutes > 0 ? `${formatMin(totals.lateMinutes)} acumulados` : 'Nenhum atraso'}
            color="text-orange-700" bg="bg-orange-500/8 ring-orange-200"
            icon={<AlertTriangle size={16} className="text-orange-700"/>}
          />
          <SummaryCard
            label="Saldo do Mês"
            value={formatMin(totals.totalBalance)}
            sub={totals.saidasAntecipadas > 0 ? `${totals.saidasAntecipadas} saída(s) antecipada(s)` : 'Banco de horas'}
            color={totals.totalBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}
            bg={totals.totalBalance >= 0 ? 'bg-emerald-500/8 ring-emerald-200' : 'bg-red-500/8 ring-red-200'}
            icon={totals.totalBalance >= 0 ? <TrendingUp size={16} className="text-emerald-700"/> : <TrendingDown size={16} className="text-red-700"/>}
          />
        </div>
      )}

      {/* Turno noturno adicional */}
      {totals.nightShift > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 ring-1 ring-slate-200 text-xs text-slate-700">
          <Moon size={13} className="shrink-0" />
          Adicional noturno no mês: <span className="font-bold ml-1">{formatMin(totals.nightShift)}</span>
        </div>
      )}

      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <button onClick={onPrev} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"><ChevronLeft size={16}/></button>
        <h2 className="text-base font-bold text-slate-900">{MONTH_NAMES[month - 1]} {year}</h2>
        <button onClick={onNext} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"><ChevronRight size={16}/></button>
      </div>

      {/* Legenda Dinâmica */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {[
          { t: 'WORK', l: 'Trabalho' }, { t: 'FOLGA', l: 'Folga' }, { t: 'FERIADO', l: 'Feriado' },
          { t: 'ATESTADO', l: 'Atestado' }, { t: 'ATRASO', l: 'Atraso' },
          { t: 'FALTA', l: 'Falta' }, { t: 'SAIDA_ANTECIPADA', l: 'Saída Antec.' },
          { t: 'SUSPENSAO', l: 'Suspensão' },
        ].filter(({ t }) => new Set(days.map(resolveDayType)).has(t)).map(({ t, l }) => {
          const m = getMeta(t);
          return (
            <span key={t} className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${m.color} ${m.textColor}`}>
              <span>{m.icon}</span> {l}
            </span>
          );
        })}
      </div>

      {/* Grid calendário */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-800"/></div>
      ) : (
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          {/* Cabeçalho semana */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEK_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-700 py-1">{d}</div>
            ))}
          </div>
          {/* Dias */}
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`}/>)}
            {days.map((day) => {
              const resolved = resolveDayType(day);
              const meta = getMeta(resolved);
              const isSelected = selectedDay?.date === day.date;
              const isToday = day.date === new Date().toISOString().split('T')[0];
              const hasHE = (day.actual?.overtime50Minutes ?? 0) + (day.actual?.overtime100Minutes ?? 0) > 0;

              return (
                <button
                  key={day.date}
                  onClick={() => onSelectDay(isSelected ? null : day)}
                  className={`relative flex flex-col items-center rounded-xl border transition-all min-h-[58px] py-1.5 px-1 ${meta.color} ${
                    isSelected ? 'ring-2 ring-slate-400 ring-offset-1 ring-offset-[#0e0e12]' : 'hover:ring-1 hover:ring-slate-200'
                  } ${isToday ? 'ring-2 ring-slate-200' : ''}`}
                >
                  <span className={`text-[11px] font-bold ${meta.textColor} ${isToday ? 'underline underline-offset-2' : ''}`}>
                    {new Date(day.date + 'T00:00:00').getDate()}
                  </span>
                  <span className="text-[11px] mt-0.5">{meta.icon}</span>
                  {/* Horário programado (dias de trabalho) */}
                  {resolved === 'WORK' && day.scheduled.entry && (
                    <span className="text-[9px] text-slate-500 mt-0.5">{day.scheduled.entry.slice(0,5)}</span>
                  )}
                  {/* Badge hora extra */}
                  {hasHE && day.actual?.overtimeApprovalStatus === 'APPROVED' && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-emerald-500 px-1 text-[8px] font-bold text-black">HE</span>
                  )}
                  {/* Badge ocorrência */}
                  {(resolved === 'FALTA' || resolved === 'ATRASO' || resolved === 'SAIDA_ANTECIPADA') && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-slate-900">!</span>
                  )}
                  {/* Badge HE pendente */}
                  {hasHE && day.actual?.overtimeApprovalStatus === 'PENDING' && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-amber-500 px-1 text-[8px] font-bold text-black">?</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Painel de detalhe do dia */}
      {selectedDay && <DayDetailPanel day={selectedDay} onClose={() => onSelectDay(null)} canWrite={canWrite} targetEmployeeId={targetEmployeeId} refresh={loadMyCalendar} />}
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color, bg, icon }: { label: string; value: string; sub: string; color: string; bg: string; icon: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl p-4 ring-1 ${bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-700 leading-tight">{sub}</p>
    </div>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

function DayDetailPanel({ day, onClose, canWrite, targetEmployeeId, refresh }: { day: CalendarDay; onClose: () => void; canWrite?: boolean; targetEmployeeId?: string; refresh?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [altEntry, setAltEntry] = useState(day.scheduled.entry?.slice(0,5) || '');
  const [altExit, setAltExit] = useState(day.scheduled.exit?.slice(0,5) || '');
  const [loading, setLoading] = useState(false);

  const handleAjuste = async () => {
    setLoading(true);
    try {
      await api.schedules.createException({
        employeeId: targetEmployeeId || 'me',
        date: day.date,
        exceptionType: 'AJUSTE_ESCALA',
        altEntryTime: altEntry,
        altExitTime: altExit
      });
      setIsEditing(false);
      if (refresh) refresh();
    } catch (e: any) { alert(e.message || 'Erro ao ajustar'); }
    setLoading(false);
  };

  const resolved = resolveDayType(day);
  const meta = getMeta(resolved);
  const dateLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  const a = day.actual;
  const totalOT = (a?.overtime50Minutes ?? 0) + (a?.overtime100Minutes ?? 0);

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5 relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"><X size={16}/></button>

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-5">
        <span className={`rounded-lg border px-3 py-1 text-xs font-bold ${meta.color} ${meta.textColor}`}>
          {meta.icon} {meta.label}
        </span>
        <p className="text-sm font-medium text-slate-700 capitalize">{dateLabel}</p>
        {day.holiday && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">🟡 {day.holiday.name}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PREVISTO — vem da Escala */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CalendarClock size={12}/> Previsto (Escala)
            </p>
            {canWrite && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="text-[10px] text-slate-500 hover:text-slate-900">
                Editar Horário
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <input type="time" value={altEntry} onChange={e => setAltEntry(e.target.value)} className="rounded bg-white px-2 py-1 text-sm ring-1 ring-slate-200" />
                <span className="text-slate-400">-</span>
                <input type="time" value={altExit} onChange={e => setAltExit(e.target.value)} className="rounded bg-white px-2 py-1 text-sm ring-1 ring-slate-200" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setIsEditing(false)} className="text-xs text-slate-500">Cancelar</button>
                <button onClick={handleAjuste} disabled={loading} className="text-xs font-bold text-slate-900 bg-slate-200 px-2 py-1 rounded">{loading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <TimeDetailRow label="Entrada"       value={day.scheduled.entry?.slice(0,5) ?? '--:--'} />
              <TimeDetailRow label="Início almoço" value={day.scheduled.lunchStart?.slice(0,5) ?? '--:--'} />
              <TimeDetailRow label="Fim almoço"    value={day.scheduled.lunchReturn?.slice(0,5) ?? '--:--'} />
              <TimeDetailRow label="Saída"         value={day.scheduled.exit?.slice(0,5) ?? '--:--'} />
            </div>
          )}
        </div>

        {/* REALIZADO — vem do Ponto */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Clock size={12}/> Realizado (Ponto)
          </p>
          {a ? (
            <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <TimeDetailRow label="Entrada"       value={formatTime(a.entry)}      highlight={resolved === 'ATRASO'} />
              <TimeDetailRow label="Início almoço" value={formatTime(a.lunchStart)} />
              <TimeDetailRow label="Fim almoço"    value={formatTime(a.lunchReturn)}/>
              <TimeDetailRow label="Saída"         value={formatTime(a.exit)}       highlight={resolved === 'SAIDA_ANTECIPADA'} />
              <div className="mt-1 border-t border-slate-200 pt-2 flex flex-col gap-1.5">
                <TimeDetailRow label="Total trabalhado" value={formatMin(a.totalWorked)} />
                <TimeDetailRow
                  label="Saldo do dia"
                  value={formatMin(a.dailyBalance)}
                  highlight={(a.dailyBalance ?? 0) < 0}
                  positive={(a.dailyBalance ?? 0) > 0}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200 py-6 text-xs text-slate-700">
              Sem registro de ponto neste dia
            </div>
          )}
        </div>
      </div>

      {/* Ocorrências — dados críticos do Ponto */}
      {a && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <AlertTriangle size={12}/> Ocorrências
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Atraso */}
            {resolved === 'ATRASO' && (
              <OccurrenceBadge color="bg-orange-50 text-orange-600 ring-orange-200" icon="⏰" label={`Atraso: ${formatMin(a.lateMinutes)}`} />
            )}
            {/* Saída antecipada */}
            {resolved === 'SAIDA_ANTECIPADA' && (
              <OccurrenceBadge color="bg-orange-50 text-orange-600 ring-orange-200" icon="🏃" label="Saída Antecipada" />
            )}
            {/* Falta */}
            {resolved === 'FALTA' && (
              <OccurrenceBadge color="bg-red-50 text-red-700 ring-red-200" icon="❌" label={`Falta: ${formatMin(a.absenceMinutes)} ausência`} />
            )}
            {/* Hora extra 50% */}
            {(a.overtime50Minutes ?? 0) > 0 && (
              <OccurrenceBadge
                color={a.overtimeApprovalStatus === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                  : 'bg-amber-50 text-amber-600 ring-amber-200'}
                icon="⏱"
                label={`HE 50%: ${formatMin(a.overtime50Minutes)} ${a.overtimeApprovalStatus === 'PENDING' ? '(aguard. aprov.)' : ''}`}
              />
            )}
            {/* Hora extra 100% */}
            {(a.overtime100Minutes ?? 0) > 0 && (
              <OccurrenceBadge
                color={a.overtimeApprovalStatus === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                  : 'bg-amber-50 text-amber-600 ring-amber-200'}
                icon="⏱"
                label={`HE 100%: ${formatMin(a.overtime100Minutes)} ${a.overtimeApprovalStatus === 'PENDING' ? '(aguard. aprov.)' : ''}`}
              />
            )}
            {/* Turno noturno */}
            {(a.nightShiftMinutes ?? 0) > 0 && (
              <OccurrenceBadge color="bg-slate-50 text-slate-700 ring-slate-200" icon="🌙" label={`Noturno: ${formatMin(a.nightShiftMinutes)}`} />
            )}
            {/* Atestado */}
            {(resolved === 'ATESTADO' || resolved === 'ATESTADO_HORAS') && (
              <OccurrenceBadge color="bg-purple-50 text-purple-600 ring-purple-200" icon="💊" label={resolved === 'ATESTADO' ? 'Atestado Integral' : 'Atestado (horas)'} />
            )}
            {/* Suspensão */}
            {resolved === 'SUSPENSAO' && (
              <OccurrenceBadge color="bg-red-100 text-red-700 ring-red-200" icon="🚫" label="Suspensão" />
            )}
            {/* Feriado */}
            {resolved === 'FERIADO' && (
              <OccurrenceBadge color="bg-amber-50 text-amber-600 ring-amber-200" icon="🟡" label={`Feriado${day.holiday ? ': ' + day.holiday.name : ''}`} />
            )}
            {/* Folgas */}
            {(resolved === 'FOLGA' || resolved === 'FOLGA_DSR' || resolved === 'FOLGA_BANCO') && (
              <OccurrenceBadge color="bg-blue-50 text-blue-600 ring-blue-200" icon="🔵" label={getMeta(resolved).label} />
            )}
            {/* Ponto fora do local */}
            {a.locationAddress && (
              <OccurrenceBadge color="bg-zinc-50 text-zinc-600 ring-zinc-200" icon="📍" label={`Local: ${a.locationAddress}`} />
            )}
            {/* Sem biometria */}
            {a.clockedInWithoutFacial && (
              <OccurrenceBadge color="bg-yellow-50 text-yellow-600 ring-yellow-200" icon="⚠️" label="Sem biometria facial" />
            )}
            {/* Nenhuma ocorrência */}
            {resolved === 'WORK' && !((a.overtime50Minutes ?? 0) + (a.overtime100Minutes ?? 0) > 0) &&
             !a.lateMinutes && !(a.dailyBalance && a.dailyBalance < 0) && (
              <OccurrenceBadge color="bg-emerald-50 text-emerald-700 ring-emerald-200" icon="✅" label="Sem ocorrências" />
            )}
          </div>

          {/* Observação / motivo do ajuste */}
          {a.observation && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 text-xs text-slate-500">
              <FileText size={12} className="shrink-0 mt-0.5"/>
              <p>{a.observation}</p>
            </div>
          )}
          {/* Status de aprovação HE */}
          {totalOT > 0 && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ring-1 ${
              a.overtimeApprovalStatus === 'APPROVED'
                ? 'bg-emerald-500/8 text-emerald-700 ring-emerald-200'
                : a.overtimeApprovalStatus === 'REJECTED'
                  ? 'bg-red-500/8 text-red-700 ring-red-200'
                  : 'bg-amber-500/8 text-amber-700 ring-amber-200'
            }`}>
              <Info size={12}/>
              Hora Extra ({formatMin(totalOT)}): {
                a.overtimeApprovalStatus === 'APPROVED' ? 'Aprovada' :
                a.overtimeApprovalStatus === 'REJECTED' ? 'Rejeitada' : 'Aguardando aprovação'
              }
              {a.overtimeHandling && a.overtimeApprovalStatus === 'APPROVED' && (
                <span className="ml-1 opacity-60">— destino: {
                  a.overtimeHandling === 'BANK' ? 'Banco de Horas' :
                  a.overtimeHandling === 'PAYMENT' ? 'Pagamento em Folha' : 'Dividido'
                }</span>
              )}
            </div>
          )}
          {/* Pendente de aprovação de ajuste manual */}
          {a.manualStatus === 'pending' && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/8 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
              <AlertCircle size={12}/> Ajuste manual aguardando aprovação do gestor
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimeDetailRow({ label, value, highlight, positive }: { label: string; value: string; highlight?: boolean; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-red-700' : positive ? 'text-emerald-700' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

function OccurrenceBadge({ color, icon, label }: { color: string; icon: string; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${color}`}>
      {icon} {label}
    </span>
  );
}

// ─── ESCALA DE EQUIPE ─────────────────────────────────────────────────────────

function EscalaEquipeTab({ loading, teamData, schedules, canWrite, year, month, onPrev, onNext, onLancar, onRefresh, onSelectEmployee }: any) {
  const withSchedule    = teamData?.withSchedule ?? [];
  const withoutSchedule = teamData?.withoutSchedule ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"><ChevronLeft size={16}/></button>
          <h2 className="text-base font-bold text-slate-900">{MONTH_NAMES[month-1]} {year}</h2>
          <button onClick={onNext} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"><ChevronRight size={16}/></button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 transition-colors"><RefreshCw size={13}/> Atualizar</button>
          {canWrite && (
            <button onClick={onLancar} className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors">
              <Plus size={13}/> Lançar Escala
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-800"/></div>
      ) : (
        <>
          {withSchedule.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Com Escala</p>
              {withSchedule.map((us: any) => (
                <button key={us.id} onClick={() => onSelectEmployee?.(us.employeeId)} className="flex items-center gap-4 w-full text-left rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-100 transition-all">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                    {us.employee?.name?.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{us.employee?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{us.employee?.department} · {us.employee?.position}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-700">{us.schedule?.name}</p>
                    <p className="text-xs text-slate-500">{us.schedule?.scaleType} · {us.schedule?.entryTime ?? '--'} – {us.schedule?.exitTime ?? '--'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">ATIVA</span>
                </button>
              ))}
            </div>
          )}
          {withoutSchedule.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sem Escala</p>
              {withoutSchedule.map((emp: any) => (
                <button key={emp.id} onClick={() => onSelectEmployee?.(emp.id)} className="flex items-center gap-4 w-full text-left rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-100 transition-all">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 text-slate-700 text-xs font-bold">
                    {emp.name?.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.department} · {emp.position}</p>
                  </div>
                  <span className="text-xs text-slate-400">Sem escala atribuída</span>
                </button>
              ))}
            </div>
          )}
          {withSchedule.length === 0 && withoutSchedule.length === 0 && (
            <EmptyState icon={<Users size={32}/>} message="Nenhum funcionário encontrado." />
          )}
        </>
      )}
    </div>
  );
}

// ─── TROCAR ESCALA ────────────────────────────────────────────────────────────

function TrocarEscalaTab({ loading, swaps, canApprove, onNovatroca, onApprove, onCancel, onRefresh }: any) {
  const pending = swaps.filter((s: any) => s.status === 'PENDING');
  const others  = swaps.filter((s: any) => s.status !== 'PENDING');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-200">
              <AlertCircle size={12}/> {pending.length} pendente{pending.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 transition-colors"><RefreshCw size={13}/> Atualizar</button>
          <button onClick={onNovatroca} className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-colors">
            <Plus size={13}/> Nova Solicitação
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-800"/></div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700/60">Aguardando Aprovação</p>
              {pending.map((s: any) => <SwapCard key={s.id} swap={s} canApprove={canApprove} onApprove={onApprove} onCancel={onCancel}/>)}
            </div>
          )}
          {others.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Histórico</p>
              {others.map((s: any) => <SwapCard key={s.id} swap={s} canApprove={false} onApprove={onApprove} onCancel={onCancel}/>)}
            </div>
          )}
          {swaps.length === 0 && (
            <EmptyState icon={<ArrowLeftRight size={32}/>} message="Nenhuma solicitação." hint="Clique em 'Nova Solicitação' para pedir uma troca." />
          )}
        </>
      )}
    </div>
  );
}

function SwapCard({ swap, canApprove, onApprove, onCancel }: any) {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 hover:ring-slate-200 transition-all">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-800"><ArrowLeftRight size={16}/></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{swap.requester?.name ?? 'Usuário'}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${SWAP_STATUS_BADGE[swap.status]}`}>{SWAP_STATUS_LABEL[swap.status]}</span>
          </div>
          <p className="text-xs text-slate-500">
            <span className="text-red-700 font-medium">{fmtDate(swap.originalDate)}</span>
            {' '}→{' '}
            <span className="text-emerald-700 font-medium">{fmtDate(swap.targetDate)}</span>
          </p>
          {swap.justification && <p className="mt-1 text-xs text-slate-700 italic">"{swap.justification}"</p>}
          {swap.rejectionReason && <p className="mt-1 text-xs text-red-700">Motivo: {swap.rejectionReason}</p>}
        </div>
        {swap.status === 'PENDING' && (
          <div className="flex gap-2 shrink-0">
            {canApprove && (
              <button onClick={() => onApprove(swap)} className="flex items-center gap-1 rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-600/30 transition-colors ring-1 ring-emerald-200">
                <Check size={12}/> Revisar
              </button>
            )}
            <button onClick={() => onCancel(swap.id)} className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors ring-1 ring-red-200">
              <X size={12}/> Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal: Solicitar Troca ───────────────────────────────────────────────────

function ModalSolicitarTroca({ onClose, onSuccess, canApprove, allEmployees }: { onClose: () => void; onSuccess: () => void; canApprove?: boolean; allEmployees?: any[] }) {
  const today = new Date().toISOString().split('T')[0];
  const [originalDate, setOriginalDate] = useState(today);
  const [targetDate, setTargetDate]     = useState('');
  const [justification, setJustification] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async () => {
    if (!originalDate || !targetDate) { setError('Informe os dois dias.'); return; }
    setLoading(true); setError('');
    try {
      await api.scheduleSwaps.create({ originalDate, targetDate, justification: justification || undefined, employeeId: targetEmployeeId || undefined });
      onSuccess();
    } catch (e: any) { setError(e.message || 'Erro ao criar solicitação.'); }
    setLoading(false);
  };

  return (
    <Modal title="Nova Solicitação de Troca" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-indigo-500/8 p-3 text-xs text-slate-700 ring-1 ring-slate-200 flex items-start gap-2">
          <Info size={13} className="shrink-0 mt-0.5"/>
          Sua solicitação será encaminhada automaticamente ao seu gestor para aprovação.
        </div>
        {canApprove && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">Em nome de (Opcional)</label>
            <select value={targetEmployeeId} onChange={(e) => setTargetEmployeeId(e.target.value)}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-slate-200">
              <option value="">Minha Escala</option>
              {allEmployees?.map(e => <option key={e.id} value={e.id}>[{e.registration || '-'}] {e.name?.toUpperCase()}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">Dia a folgar (original)</label>
            <input type="date" value={originalDate} onChange={(e) => setOriginalDate(e.target.value)}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-slate-200"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">Dia para trabalhar</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-slate-200"/>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500">Justificativa (opcional)</label>
          <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3}
            placeholder="Descreva o motivo da troca..."
            className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-slate-200 resize-none"/>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">Cancelar</button>
          <button onClick={submit} disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-colors">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Enviar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal: Aprovar Troca ─────────────────────────────────────────────────────

function ModalAprovarTroca({ swap, onClose, onSuccess }: { swap: any; onClose: () => void; onSuccess: () => void }) {
  const [action, setAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const submit = async () => {
    if (action === 'REJECTED' && !reason) { setError('Informe o motivo da rejeição.'); return; }
    setLoading(true); setError('');
    try {
      await api.scheduleSwaps.review(swap.id, action, reason || undefined);
      onSuccess();
    } catch (e: any) { setError(e.message || 'Erro ao processar.'); }
    setLoading(false);
  };

  return (
    <Modal title="Revisar Solicitação de Troca" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-900 mb-1">{swap.requester?.name}</p>
          <p className="text-xs text-slate-500">
            Folgar em <span className="text-red-700 font-medium">{fmtDate(swap.originalDate)}</span>{' '}
            e trabalhar em <span className="text-emerald-700 font-medium">{fmtDate(swap.targetDate)}</span>
          </p>
          {swap.justification && <p className="mt-2 text-xs text-slate-500 italic">"{swap.justification}"</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['APPROVED', 'REJECTED'] as const).map((opt) => (
            <button key={opt} onClick={() => setAction(opt)}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ring-1 ${
                action === opt
                  ? opt === 'APPROVED' ? 'bg-emerald-600/30 text-emerald-600 ring-emerald-200' : 'bg-red-600/20 text-red-600 ring-red-200'
                  : 'bg-slate-50 text-slate-500 ring-slate-200 hover:ring-slate-200'
              }`}>
              {opt === 'APPROVED' ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
              {opt === 'APPROVED' ? 'Aprovar' : 'Rejeitar'}
            </button>
          ))}
        </div>
        {action === 'REJECTED' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">Motivo *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none resize-none"
              placeholder="Explique o motivo..."/>
          </div>
        )}
        {error && <p className="text-xs text-red-700">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">Cancelar</button>
          <button onClick={submit} disabled={loading}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-50 transition-colors ${
              action === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
            }`}>
            {loading ? <Loader2 size={14} className="animate-spin"/> : action === 'APPROVED' ? <Check size={14}/> : <X size={14}/>}
            {action === 'APPROVED' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal: Lançar Escala ─────────────────────────────────────────────────────

function ModalLancarEscala({ schedules, onClose, onSuccess }: { schedules: any[]; onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'assign' | 'create'>('assign');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('5x2');
  const [newEntry, setNewEntry] = useState('08:00');
  const [newLunchStart, setNewLunchStart] = useState('12:00');
  const [newLunchReturn, setNewLunchReturn] = useState('13:00');
  const [newExit, setNewExit] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.employees.list().then(setEmployees).catch(() => {}); }, []);
  const filteredEmployees = employees.filter((e) => e.name?.toLowerCase().includes(employeeSearch.toLowerCase()));

  const submitAssign = async () => {
    if (selectedEmployees.length === 0 || !selectedSchedule || !startDate) { setError('Preencha todos os campos.'); return; }
    setLoading(true); setError('');
    try { await api.schedules.assign({ employeeIds: selectedEmployees, scheduleId: selectedSchedule, startDate }); onSuccess(); }
    catch (e: any) { setError(e.message || 'Erro.'); }
    setLoading(false);
  };

  const submitCreate = async () => {
    if (!newName) { setError('Informe o nome da escala.'); return; }
    setLoading(true); setError('');
    try {
      await api.schedules.create({ name: newName, scaleType: newType, entryTime: newEntry, lunchStartTime: newLunchStart, lunchReturnTime: newLunchReturn, exitTime: newExit });
      onSuccess();
    } catch (e: any) { setError(e.message || 'Erro.'); }
    setLoading(false);
  };

  return (
    <Modal title="Lançar / Criar Escala" onClose={onClose} wide>
      <div className="flex gap-1 rounded-lg bg-slate-50 p-1 mb-5">
        {(['assign', 'create'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${mode === m ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
            {m === 'assign' ? 'Atribuir Existente' : 'Criar Nova Escala'}
          </button>
        ))}
      </div>

      {mode === 'assign' ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500">Funcionários ({selectedEmployees.length} selecionados)</label>
              <button onClick={() => {
                if (selectedEmployees.length === filteredEmployees.length) setSelectedEmployees([]);
                else setSelectedEmployees(filteredEmployees.map(e => e.id));
              }} className="text-[10px] font-bold text-slate-500 hover:text-slate-800">
                {selectedEmployees.length === filteredEmployees.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
            <input value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} placeholder="Buscar..."
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-slate-200"/>
            {filteredEmployees.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg bg-white shadow-sm ring-1 ring-slate-200 mt-1 flex flex-col">
                {filteredEmployees.slice(0, 50).map((e) => {
                  const isSelected = selectedEmployees.includes(e.id);
                  return (
                    <button key={e.id} onClick={() => {
                      if (isSelected) setSelectedEmployees(prev => prev.filter(id => id !== e.id));
                      else setSelectedEmployees(prev => [...prev, e.id]);
                    }}
                      className={`flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-50 ${isSelected ? 'bg-slate-100 font-bold' : ''}`}>
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300'}`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="min-w-0 flex-1 truncate">
                        [{e.registration || '-'}] {e.name?.toUpperCase()} <span className="text-slate-500 text-[10px] font-medium ml-1">· {e.department || 'Sem depto'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">Escala</label>
            <select value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none">
              <option value="">Selecionar...</option>
              {schedules.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.scaleType})</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">Início da Vigência</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"/>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-500">Nome</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Administrativo 8h"
                className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-500">Tipo</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)}
                className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none">
                {['5x2','6x1','12x36','4x2','PERSONALIZADA','PLANTAO'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[{l:'Entrada',v:newEntry,s:setNewEntry},{l:'Início Almoço',v:newLunchStart,s:setNewLunchStart},{l:'Fim Almoço',v:newLunchReturn,s:setNewLunchReturn},{l:'Saída',v:newExit,s:setNewExit}]
              .map(({ l, v, s }) => (
                <div key={l} className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-500">{l}</label>
                  <input type="time" value={v} onChange={(e) => s(e.target.value)}
                    className="rounded-lg bg-slate-50 px-2 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"/>
                </div>
              ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
      <div className="flex gap-2 justify-end mt-5">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">Cancelar</button>
        <button onClick={mode === 'assign' ? submitAssign : submitCreate} disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm disabled:opacity-50 transition-colors">
          {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
          {mode === 'assign' ? 'Atribuir' : 'Criar'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`relative flex flex-col rounded-2xl bg-white ring-1 ring-slate-200 shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors"><X size={18}/></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, hint }: { icon: React.ReactNode; message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-700">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{message}</p>
      {hint && <p className="text-xs opacity-60">{hint}</p>}
    </div>
  );
}
