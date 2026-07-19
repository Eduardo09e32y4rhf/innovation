'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Search,
  ChevronDown,
  User,
  Pencil,
  CalendarDays,
  Sparkles,
  CheckSquare,
  Square,
  UserCheck,
  Zap,
  Clock3,
  ArrowRight,
} from 'lucide-react';
import { formatMinutes } from '@/app/lib/format';
import { saoPauloDateKey, saoPauloMonthKey } from '@/app/lib/date';

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
  earlyLeaveMinutes?: number | null;
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

/** Gera cor HSL determinística a partir de uma string */
function stringToHsl(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 45%)`;
}

function getInitials(name: string): string {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

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
  if (day.actual?.incidentType === 'atraso_saida_antecipada') return 'ATRASO_E_SAIDA_ANTECIPADA';
  if (day.actual?.incidentType === 'atraso') return 'ATRASO';
  if (day.actual?.incidentType === 'saida_antecipada') return 'SAIDA_ANTECIPADA';
  if (day.actual?.incidentType === 'falta') return 'FALTA';
  if (day.actual && !day.actual.entry && !day.actual.exit && day.dayType === 'WORK') return 'FALTA';

  // Se não tem registro, é dia de trabalho, e a data já passou (ontem para trás)
  // Ou se for hoje, dependeria da hora, mas para simplificar, a folha de ponto geralmente só dá falta no dia seguinte
  // No ponto (time-track), se não for isFuture, ele marca FALTA.
  const todayStr = saoPauloDateKey();
  if (!day.actual && day.dayType === 'WORK' && day.date < todayStr) return 'FALTA';

  return day.dayType;
}

const DAY_TYPE_META: Record<string, { label: string; color: string; textColor: string; border: string; icon: string; bg: string }> = {
  WORK:            { label: 'Trabalho',         color: 'bg-emerald-50',   textColor: 'text-emerald-700',  border: 'border-emerald-200',  icon: '✅', bg: '#ecfdf5' },
  FOLGA:           { label: 'Folga',            color: 'bg-blue-50',      textColor: 'text-blue-700',     border: 'border-blue-200',     icon: '🔵', bg: '#eff6ff' },
  FOLGA_DSR:       { label: 'Folga DSR',        color: 'bg-blue-50',      textColor: 'text-blue-700',     border: 'border-blue-200',     icon: '🔵', bg: '#eff6ff' },
  FOLGA_BANCO:     { label: 'Folga Banco',      color: 'bg-cyan-50',      textColor: 'text-cyan-700',     border: 'border-cyan-200',     icon: '🏦', bg: '#ecfeff' },
  FERIADO:         { label: 'Feriado',          color: 'bg-amber-50',     textColor: 'text-amber-700',    border: 'border-amber-200',    icon: '🟡', bg: '#fffbeb' },
  FERIADO_LOCAL:   { label: 'Feriado Local',    color: 'bg-amber-50',     textColor: 'text-amber-700',    border: 'border-amber-200',    icon: '🟡', bg: '#fffbeb' },
  ATESTADO:        { label: 'Atestado',         color: 'bg-purple-50',    textColor: 'text-purple-700',   border: 'border-purple-200',   icon: '💊', bg: '#faf5ff' },
  ATESTADO_HORAS:  { label: 'Atestado (h)',     color: 'bg-purple-50',    textColor: 'text-purple-700',   border: 'border-purple-200',   icon: '💊', bg: '#faf5ff' },
  SUSPENSAO:       { label: 'Suspensão',        color: 'bg-red-100',      textColor: 'text-red-700',      border: 'border-red-300',      icon: '🚫', bg: '#fee2e2' },
  ATRASO:          { label: 'Atraso',           color: 'bg-orange-50',    textColor: 'text-orange-700',   border: 'border-orange-200',   icon: '⏰', bg: '#fff7ed' },
  SAIDA_ANTECIPADA:{ label: 'Saída Antec.',     color: 'bg-orange-50',    textColor: 'text-orange-700',   border: 'border-orange-200',   icon: '🏃', bg: '#fff7ed' },
  FALTA:           { label: 'Falta',            color: 'bg-red-50',       textColor: 'text-red-700',      border: 'border-red-200',      icon: '❌', bg: '#fef2f2' },
  REVOGADO:        { label: 'Revogado',         color: 'bg-zinc-100',     textColor: 'text-zinc-600',     border: 'border-zinc-200',     icon: '↩',  bg: '#f4f4f5' },
  SEM_ESCALA:      { label: 'Sem Escala',       color: 'bg-slate-100',    textColor: 'text-slate-400',    border: 'border-slate-200',    icon: '—',  bg: '#f1f5f9' },
  COMPENSACAO:     { label: 'Compensação',      color: 'bg-teal-50',      textColor: 'text-teal-700',     border: 'border-teal-200',     icon: '🔄', bg: '#f0fdfa' },
  AJUSTE:          { label: 'Ajuste Escala',    color: 'bg-indigo-50',    textColor: 'text-indigo-700',   border: 'border-indigo-200',   icon: '⚙️', bg: '#eef2ff' },
};

function getMeta(type: string) {
  return DAY_TYPE_META[type] ?? DAY_TYPE_META.SEM_ESCALA;
}

function formatTime(t?: string | null) {
  if (!t) return '--:--';
  const d = new Date(t);
  return isNaN(d.getTime()) ? (t.slice(0, 5) ?? '--:--') : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatMin(min?: number | null) {
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
    const resolved = resolveDayType(day);
    if (resolved === 'FALTA') faltas++;
    else if (resolved === 'ATRASO') atrasos++;
    else if (resolved === 'SAIDA_ANTECIPADA') saidasAntecipadas++;

    const a = day.actual;
    if (!a) {
      // Se não há batida e o dia foi resolvido como FALTA, devemos deduzir a jornada do saldo
      if (resolved === 'FALTA') {
        let expected = 480; // default 8 hours
        if (day.scheduled && day.scheduled.entry && day.scheduled.exit) {
          const ent = new Date(`1970-01-01T${day.scheduled.entry}Z`);
          const ext = new Date(`1970-01-01T${day.scheduled.exit}Z`);
          expected = (ext.getTime() - ent.getTime()) / 60000;
          if (day.scheduled.lunchStart && day.scheduled.lunchReturn) {
            const ls = new Date(`1970-01-01T${day.scheduled.lunchStart}Z`);
            const lr = new Date(`1970-01-01T${day.scheduled.lunchReturn}Z`);
            expected -= (lr.getTime() - ls.getTime()) / 60000;
          } else {
            expected -= 60; // default 1 hour lunch
          }
        }
        totalBalance -= expected;
        absenceMinutes += expected;
      }
      continue;
    }
    
    totalWorked += a.totalWorked ?? 0;
    totalBalance += a.dailyBalance ?? 0;
    const ot50 = a.overtime50Minutes ?? 0;
    const ot100 = a.overtime100Minutes ?? 0;
    if (a.overtimeApprovalStatus === 'APPROVED') {
      overtime50 += ot50;
      overtime100 += ot100;
      horaExtra += ot50 + ot100;
    }
    nightShift += a.nightShiftMinutes ?? 0;
    lateMinutes += a.lateMinutes ?? 0;
    absenceMinutes += a.absenceMinutes ?? 0;
  }

  return {
    totalWorked, totalBalance, overtime50, overtime100, nightShift,
    lateMinutes, absenceMinutes, faltas, atrasos, saidasAntecipadas, horaExtra,
  };
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const SWAP_STATUS_BADGE: Record<string, string> = {
  PENDING:   'bg-amber-50 text-amber-700 border-amber-300',
  APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-300',
  REJECTED:  'bg-red-50 text-red-700 border-red-300',
  CANCELLED: 'bg-zinc-100 text-zinc-600 border-zinc-300',
};
const SWAP_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado', CANCELLED: 'Cancelado',
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function EscalaPage() {
  const params = useParams();
  const tenant = params?.tenant as string;
  const { user } = useAuth();
  const role = (user?.profile?.toUpperCase() || 'FUNCIONARIO') as UserRole;
  const canApprove = ['DEV', 'ADMIN', 'RH', 'GESTOR'].includes(role);
  const canWrite   = ['DEV', 'ADMIN', 'RH'].includes(role);

  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get('tab') as Tab) || 'minha';
  const [currentMonth, setCurrentMonth] = useState(saoPauloMonthKey());
  const [calendarData, setCalendarData] = useState<any>(null);
  const [teamData, setTeamData]   = useState<any>(null);
  const [swaps, setSwaps]         = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const targetEmployeeId = searchParams.get('employeeId') || searchParams.get('emp') || '';
  const setTargetEmployeeId = useCallback((id: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (id) p.set('emp', id); else p.delete('emp');
    router.push(`?${p.toString()}`);
  }, [searchParams, router]);
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
        ? await api.schedules.employeeCalendar(targetEmployeeId, currentMonth)
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
  }, [tab, currentMonth, targetEmployeeId, loadMyCalendar, loadTeam, loadSchedules, loadSwaps, canWrite]);

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

  // Handler para selecionar funcionário na aba equipe (navega para Minha Jornada)
  const handleSelectEmployeeFromTeam = useCallback((employeeId: string) => {
    router.push(`?tab=minha&emp=${employeeId}`);
  }, [router]);

  const targetEmployee = allEmployees.find(e => e.id === targetEmployeeId);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="page-header items-center">
        <div>
          <p className="page-label">ESCALA</p>
          <h1 className="page-title">Jornada Programada</h1>
        </div>
        <Link href={`/${tenant}/dashboard/time-track`} className="btn-outline"><Clock3 size={14} /> ABRIR PONTO</Link>
      </div>

      {/* Tab Nav */}
      <div className="tab-bar">
        {([
          { key: 'minha',  label: 'Minha Jornada',  icon: <User size={14}/> },
          ...(canApprove ? [{ key: 'equipe', label: 'Escala de Equipe', icon: <Users size={14}/> }] : []),
          { key: 'trocas', label: 'Trocas',          icon: <ArrowLeftRight size={14}/> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => router.push(`?tab=${key}`)}
            className={tab === key ? 'tab-item-active' : 'tab-item'}
          >
            {icon}<span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'minha' && (
        <div className="flex flex-col gap-4">
          {canApprove && (
            <EmployeeCombobox
              employees={allEmployees}
              selectedId={targetEmployeeId}
              onSelect={(id) => { setTargetEmployeeId(id); setSelectedDay(null); }}
            />
          )}
          <MinhaEscalaTab
            loading={loading}
            calendarData={calendarData}
            year={year} month={month}
            onPrev={prevMonth} onNext={nextMonth}
            selectedDay={selectedDay} onSelectDay={setSelectedDay}
            targetEmployeeId={targetEmployeeId}
            canWrite={canWrite}
            onRefresh={loadMyCalendar}
            targetEmployee={targetEmployee}
          />
        </div>
      )}
      {tab === 'equipe' && canApprove && (
        <EscalaEquipeTab
          loading={loading} teamData={teamData} schedules={schedules} canWrite={canWrite}
          year={year} month={month}
          onPrev={prevMonth} onNext={nextMonth}
          onLancar={() => setShowModalLancar(true)} onRefresh={loadTeam}
          onSelectEmployee={handleSelectEmployeeFromTeam}
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
      {showModalLancar  && <ModalLancarEscala schedules={schedules} onClose={() => setShowModalLancar(false)} onSuccess={() => { setShowModalLancar(false); loadTeam(); loadSchedules(); loadMyCalendar(); }} />}
      {showModalApprove && <ModalAprovarTroca swap={showModalApprove} onClose={() => setShowModalApprove(null)} onSuccess={() => { setShowModalApprove(null); loadSwaps(); }} />}
    </div>
  );
}

// ─── Employee Combobox Premium ─────────────────────────────────────────────────

function EmployeeCombobox({ employees, selectedId, onSelect }: {
  employees: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = employees.filter(e =>
    !search || e.name?.toLowerCase().includes(search.toLowerCase()) ||
    (e.registration || '').includes(search)
  );

  const selected = selectedId ? employees.find(e => e.id === selectedId) : null;
  const regDisplay = (e: any) => e.registration ? `#${String(e.registration).padStart(4, '0')}` : 'S/N';

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 shadow-sm hover:ring-slate-300 transition-all duration-200 text-left"
      >
        {selected ? (
          <>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm bg-slate-900"
            >
              {getInitials(selected.name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {selected.registration ? String(selected.registration).padStart(4, '0') : 'S/N'} - {selected.name?.toUpperCase()}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{selected.department} · {selected.position}</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm">
              <User size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">Minha Escala</p>
              <p className="text-[11px] text-slate-500">Visualizando seus próprios dados</p>
            </div>
          </>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {selected && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(''); setSearch(''); }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-200 overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar funcionário..."
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Opção: Minha Escala */}
          <div className="max-h-72 overflow-y-auto">
            <button
              onClick={() => { onSelect(''); setOpen(false); setSearch(''); }}
              className={`flex w-full items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${!selectedId ? 'bg-slate-50' : ''}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm">
                <User size={14} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-900">Minha Escala</p>
                <p className="text-[11px] text-slate-500">Seus próprios dados</p>
              </div>
              {!selectedId && <Check size={14} className="text-slate-700 shrink-0" />}
            </button>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <Search size={20} className="opacity-40" />
                <p className="text-sm">Nenhum funcionário encontrado</p>
              </div>
            ) : (
              filtered.slice(0, 50).map((e) => (
                <button
                  key={e.id}
                  onClick={() => { onSelect(e.id); setOpen(false); setSearch(''); }}
                  className={`flex w-full items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${selectedId === e.id ? 'bg-slate-50' : ''}`}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm bg-slate-900"
                  >
                    {getInitials(e.name || '')}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {e.registration ? String(e.registration).padStart(4, '0') : 'S/N'} - {e.name?.toUpperCase()}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{e.department} · {e.position}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedId === e.id && <Check size={14} className="text-slate-700" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MINHA ESCALA ─────────────────────────────────────────────────────────────

function MinhaEscalaTab({ loading, calendarData, year, month, onPrev, onNext, selectedDay, onSelectDay, targetEmployeeId, canWrite, onRefresh, targetEmployee }: any) {
  const apiDays: CalendarDay[] = calendarData?.days || [];
  const schedule = calendarData?.schedule;
  
  // Preencher os dias do mês
  const numDays = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];
  for (let i = 1; i <= numDays; i++) {
    const dString = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const apiDay = apiDays.find(d => d.date === dString);
    if (apiDay) {
      days.push(apiDay);
    } else {
      days.push({
        date: dString,
        dayOfWeek: new Date(year, month - 1, i).getDay(),
        dayType: 'SEM_ESCALA',
        scheduled: {},
        actual: null,
      });
    }
  }

  const totals = calcMonthlyTotals(days);
  const firstDow = days[0] ? new Date(days[0].date + 'T00:00:00').getDay() : 0;
  const todayStr = saoPauloDateKey();

  return (
    <div className="flex flex-col gap-5">

      {/* Escala ativa */}
      {schedule ? (
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-slate-50 to-white p-4 ring-1 ring-slate-200 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md">
            <Briefcase size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">{schedule.name?.toUpperCase()}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{schedule.scaleType?.toUpperCase()}</span>
              <Clock3 size={11} className="text-slate-400" />
              {schedule.entryTime ?? '--'} → {schedule.exitTime ?? '--'}
              {schedule.lunchStartTime ? ` · Almoço: ${schedule.lunchStartTime}–${schedule.lunchReturnTime ?? '?'}` : ''}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            ATIVA
          </span>
        </div>
      ) : !loading && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 text-amber-700 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <div>
            <p className="font-semibold">Sem escala atribuída</p>
            <p className="text-xs mt-0.5 text-amber-600">Fale com seu gestor ou RH para configurar sua jornada.</p>
          </div>
        </div>
      )}

      {/* Cards de resumo mensal */}
      {days.length > 0 && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard
            label="Hora Extra"
            value={totals.horaExtra > 0 ? formatMin(totals.horaExtra) : '0h00m'}
            sub={`50%: ${formatMin(totals.overtime50)} · 100%: ${formatMin(totals.overtime100)}`}
            color="text-emerald-700" bg="bg-emerald-50 ring-emerald-200"
            icon={<TrendingUp size={16} className="text-emerald-600"/>}
          />
          <SummaryCard
            label="Faltas"
            value={String(totals.faltas)}
            sub={totals.absenceMinutes > 0 ? `${formatMin(totals.absenceMinutes)} de ausência` : 'Nenhuma falta'}
            color="text-red-700" bg="bg-red-50 ring-red-200"
            icon={<Ban size={16} className="text-red-600"/>}
          />
          <SummaryCard
            label="Atrasos"
            value={totals.lateMinutes > 0 ? formatMin(totals.lateMinutes) : '0h00m'}
            sub={totals.atrasos > 0 ? `${totals.atrasos} ocorrência(s)` : 'Nenhum atraso'}
            color="text-orange-700" bg="bg-orange-50 ring-orange-200"
            icon={<AlertTriangle size={16} className="text-orange-600"/>}
          />
          <SummaryCard
            label="Saídas Antecipadas"
            value={totals.saidasAntecipadas > 0 ? 'Ocorreram' : '0'}
            sub={totals.saidasAntecipadas > 0 ? `${totals.saidasAntecipadas} ocorrência(s)` : 'Nenhuma'}
            color={totals.saidasAntecipadas > 0 ? 'text-orange-700' : 'text-slate-500'}
            bg={totals.saidasAntecipadas > 0 ? 'bg-orange-50 ring-orange-200' : 'bg-slate-50 ring-slate-200'}
            icon={<Ban size={16} className={totals.saidasAntecipadas > 0 ? "text-orange-600" : "text-slate-400"}/>}
          />
          <SummaryCard
            label="Saldo do Mês"
            value={formatMin(totals.totalBalance)}
            sub="Banco de horas"
            color={totals.totalBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}
            bg={totals.totalBalance >= 0 ? 'bg-emerald-50 ring-emerald-200' : 'bg-red-50 ring-red-200'}
            icon={totals.totalBalance >= 0 ? <TrendingUp size={16} className="text-emerald-600"/> : <TrendingDown size={16} className="text-red-600"/>}
          />
        </div>
      )}

      {/* Turno noturno adicional */}
      {totals.nightShift > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2.5 text-xs text-slate-200">
          <Moon size={13} className="shrink-0 text-indigo-400" />
          Adicional noturno no mês: <span className="font-bold ml-1 text-white">{formatMin(totals.nightShift)}</span>
        </div>
      )}

      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300 transition-all shadow-sm"
        >
          <ChevronLeft size={16}/>
        </button>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          {MONTH_NAMES[month - 1]} <span className="text-slate-400 font-normal">{year}</span>
        </h2>
        <button
          onClick={onNext}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300 transition-all shadow-sm"
        >
          <ChevronRight size={16}/>
        </button>
      </div>

      {/* Legenda dinâmica */}
      {days.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { t: 'WORK', l: 'Trabalho' }, { t: 'FOLGA', l: 'Folga' }, { t: 'FERIADO', l: 'Feriado' },
            { t: 'ATESTADO', l: 'Atestado' }, { t: 'ATRASO', l: 'Atraso' },
            { t: 'FALTA', l: 'Falta' }, { t: 'SAIDA_ANTECIPADA', l: 'Saída Antec.' },
            { t: 'SUSPENSAO', l: 'Suspensão' }, { t: 'AJUSTE', l: 'Ajuste' },
          ].filter(({ t }) => new Set(days.map(resolveDayType)).has(t)).map(({ t, l }) => {
            const m = getMeta(t);
            return (
              <span key={t} className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium ${m.color} ${m.textColor} ${m.border}`}>
                <span>{m.icon}</span> {l}
              </span>
            );
          })}
        </div>
      )}

      {/* Grid calendário */}
      {loading ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="mb-3 grid grid-cols-7 gap-1.5">
            {WEEK_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array(35).fill(null).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 py-16 ring-1 ring-slate-200 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <CalendarDays size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Nenhum dado para este mês</p>
            <p className="text-xs text-slate-500 mt-1">
              {!calendarData ? 'Sem escala atribuída para este período.' : 'Nenhum dia encontrado.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
          {/* Cabeçalho semana */}
          <div className="mb-3 grid grid-cols-7 gap-1.5">
            {WEEK_LABELS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[10px] font-bold uppercase tracking-wider py-1 rounded-lg ${
                  i === 0 || i === 6 ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {d}
              </div>
            ))}
          </div>
          {/* Dias */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`}/>)}
            {days.map((day) => {
              const resolved = resolveDayType(day);
              const meta = getMeta(resolved);
              const isSelected = selectedDay?.date === day.date;
              const isToday = day.date === todayStr;
              const hasHE = (day.actual?.overtime50Minutes ?? 0) + (day.actual?.overtime100Minutes ?? 0) > 0;
              const dayNum = new Date(day.date + 'T00:00:00').getDate();
              const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;

              return (
                <button
                  key={day.date}
                  onClick={() => onSelectDay(isSelected ? null : day)}
                  className={`relative flex flex-col items-center rounded-xl border-2 transition-all duration-200 min-h-[80px] py-2 px-1 group select-none ${
                    isSelected
                      ? `${meta.border} ${meta.color} shadow-lg scale-105 ring-2 ring-offset-1 ring-slate-400`
                      : `${meta.color} ${meta.border} hover:shadow-md hover:scale-102`
                  } ${isToday && !isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                  style={isToday && !isSelected ? { boxShadow: '0 0 0 2px #0f172a, 0 0 0 3px rgba(15,23,42,0.15)' } : {}}
                >
                  {/* Número do dia */}
                  <span className={`text-[13px] font-bold leading-none ${
                    isToday
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[11px]'
                      : isWeekend
                        ? `${meta.textColor} opacity-70`
                        : meta.textColor
                  }`}>
                    {dayNum}
                  </span>

                  {/* Conteúdo central do dia */}
                  {day.scheduled.entry && day.scheduled.exit ? (
                    <div className="flex flex-col items-center justify-center mt-1.5 gap-1">
                      <span className={`text-[10px] font-bold ${meta.textColor} leading-none`}>
                        {day.scheduled.entry.slice(0,5)}
                      </span>
                      <span className={`text-[10px] font-bold ${meta.textColor} leading-none`}>
                        {day.scheduled.exit.slice(0,5)}
                      </span>
                    </div>
                  ) : resolved !== 'SEM_ESCALA' ? (
                    <span className={`text-[9px] mt-3 font-bold uppercase tracking-wider ${meta.textColor} opacity-80 leading-none text-center`}>
                      {meta.label}
                    </span>
                  ) : (
                    <span className="text-[14px] mt-2 leading-none opacity-40">{meta.icon}</span>
                  )}

                  {/* Badge ocorrência crítica (Atraso/Falta) */}
                  {(resolved === 'FALTA' || resolved === 'ATRASO' || resolved === 'SAIDA_ANTECIPADA') && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm">!</span>
                  )}

                  {/* Indicador de seleção */}
                  <span className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${
                    isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 bg-slate-900/5'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Painel de detalhe do dia */}
      {selectedDay && (
        <DayDetailPanel
          day={selectedDay}
          onClose={() => onSelectDay(null)}
          canWrite={canWrite}
          targetEmployeeId={targetEmployeeId}
          refresh={onRefresh}
          currentMonth={`${year}-${String(month).padStart(2,'0')}`}
        />
      )}
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color, bg, icon }: { label: string; value: string; sub: string; color: string; bg: string; icon: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-2.5 rounded-2xl p-4 ring-1 ${bg} transition-transform hover:scale-[1.02] duration-200`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${color} leading-none`}>{value}</p>
      <p className="text-[10px] text-slate-600 leading-tight">{sub}</p>
    </div>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

const PONTO_REASONS: { value: string; label: string; fullDay?: boolean }[] = [
  { value:'ajuste_erro_marcacao', label:'AJUSTE - PONTO INCOMPLETO', fullDay:false },
  { value:'ajuste_atestado_integral', label:'ATESTADO INTEGRAL', fullDay:true },
  { value:'ajuste_feriado', label:'FERIADO', fullDay:true },
  { value:'ajuste_abono_atestado_horas', label:'ABONO - ATESTADO DE HORAS', fullDay:true },
  { value:'ajuste_folga_dsr', label:'FOLGA', fullDay:true },
  { value:'ajuste_abono_folga', label:'ABONO - FOLGA (BANCO)', fullDay:true },
  { value:'ajuste_abono_banco_saida_antecipada', label:'ABONO - BANCO SAÍDA ANTECIPADA', fullDay:true },
  { value:'ajuste_abono_atraso', label:'ABONO - ATRASO', fullDay:true },
  { value:'ajuste_suspensao', label:'SUSPENSÃO', fullDay:true },
];

function toIso(date: string, time: string) {
  if (!date || !time) return null;
  const [y,m,d] = date.split('-').map(Number);
  const [hh,mm] = time.split(':').map(Number);
  return new Date(y,m-1,d,hh,mm,0,0).toISOString();
}

function DayDetailPanel({ day, onClose, canWrite, targetEmployeeId, refresh, currentMonth }: {
  day: CalendarDay;
  onClose: () => void;
  canWrite?: boolean;
  targetEmployeeId?: string;
  refresh?: () => void;
  currentMonth?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [altEntry, setAltEntry]       = useState(day.scheduled.entry?.slice(0,5) || '');
  const [altExit, setAltExit]         = useState(day.scheduled.exit?.slice(0,5) || '');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [showMonthlyAdj, setShowMonthlyAdj] = useState(false);

  // States for Ajuste de Ponto
  const [isEditingPonto, setIsEditingPonto] = useState(false);
  const [pontoReason, setPontoReason] = useState<string>('ajuste_erro_marcacao');
  const [pontoEntry, setPontoEntry] = useState(day.actual?.entry ? new Date(day.actual.entry).toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' }) : '');
  const [pontoLunchS, setPontoLunchS] = useState(day.actual?.lunchStart ? new Date(day.actual.lunchStart).toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' }) : '');
  const [pontoLunchR, setPontoLunchR] = useState(day.actual?.lunchReturn ? new Date(day.actual.lunchReturn).toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' }) : '');
  const [pontoExit, setPontoExit] = useState(day.actual?.exit ? new Date(day.actual.exit).toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' }) : '');
  const [pontoDetail, setPontoDetail] = useState(day.actual?.observation ?? '');
  const selReason = PONTO_REASONS.find(r => r.value === pontoReason);

  const handleAjuste = async () => {
    setLoading(true);
    try {
      await api.schedules.createException({
        employeeId: targetEmployeeId || 'me',
        date: day.date,
        exceptionType: 'AJUSTE_ESCALA',
        altEntryTime: altEntry,
        altExitTime: altExit,
      });
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (refresh) refresh();
    } catch (e: any) { alert(e.message || 'Erro ao ajustar'); }
    setLoading(false);
  };

  const handleAjustePonto = async () => {
    setLoading(true);
    try {
      const payload = {
        entry: toIso(day.date, pontoEntry),
        lunchStart: toIso(day.date, pontoLunchS),
        lunchReturn: toIso(day.date, pontoLunchR),
        exit: toIso(day.date, pontoExit),
        reason: pontoReason as any,
        observation: pontoDetail,
      };
      await api.timeTrack.manual({
        employeeId: targetEmployeeId || 'me',
        date: day.date,
        ...payload
      });
      setIsEditingPonto(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (refresh) refresh();
    } catch (e: any) { alert(e.message || 'Erro ao lançar ponto'); }
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
    <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
      {/* Barra colorida no topo baseada no status */}
      <div className={`h-1.5 w-full ${meta.color}`} style={{ background: meta.bg }} />

      <div className="p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        >
          <X size={14}/>
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-5 pr-10">
          <span className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${meta.color} ${meta.textColor} ${meta.border} flex items-center gap-1.5`}>
            {meta.icon} {meta.label}
          </span>
          <p className="text-sm font-semibold text-slate-700 capitalize">{dateLabel}</p>
          {day.holiday && (
            <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full ring-1 ring-amber-200 font-medium">
              🟡 {day.holiday.name}
            </span>
          )}
        </div>

        {/* Toast de sucesso */}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 ring-1 ring-emerald-200 text-sm text-emerald-700 font-medium">
            <CheckCircle2 size={16} />
            Ajuste salvo com sucesso!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* PREVISTO */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CalendarClock size={12}/> Previsto (Escala)
              </p>
              {canWrite && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 rounded-full bg-slate-100 hover:bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:text-indigo-700 transition-colors ring-1 ring-slate-200 hover:ring-indigo-200"
                >
                  <Pencil size={10}/> Editar horário
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Ajuste individual — {new Date(day.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Entrada', val: altEntry, set: setAltEntry },
                    { label: 'Saída', val: altExit, set: setAltExit },
                  ].map(({ label, val, set }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <label className="text-[10px] text-indigo-600 font-semibold">{label}</label>
                      <input
                        type="time"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-indigo-200 focus:outline-none focus:ring-indigo-400 transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAjuste}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>}
                    Salvar Ajuste
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <TimeDetailRow label="Entrada"       value={day.scheduled.entry?.slice(0,5) ?? '--:--'} />
                <TimeDetailRow label="Início almoço" value={day.scheduled.lunchStart?.slice(0,5) ?? '--:--'} />
                <TimeDetailRow label="Fim almoço"    value={day.scheduled.lunchReturn?.slice(0,5) ?? '--:--'} />
                <TimeDetailRow label="Saída"         value={day.scheduled.exit?.slice(0,5) ?? '--:--'} />
                {day.exception?.exceptionType === 'AJUSTE_ESCALA' && (
                  <div className="mt-1 pt-2 border-t border-indigo-100 flex items-center gap-1.5 text-[10px] text-indigo-600 font-semibold">
                    <Zap size={10}/> Horário ajustado manualmente
                  </div>
                )}
              </div>
            )}

            {/* Ajuste Mensal — botão para RH */}
            {canWrite && !isEditing && (
              <button
                onClick={() => setShowMonthlyAdj(true)}
                className="flex items-center gap-2 rounded-2xl bg-slate-50 hover:bg-slate-100 px-4 py-2.5 ring-1 ring-slate-200 hover:ring-slate-300 transition-all text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <CalendarDays size={13}/> Ajuste do mês inteiro
                <ArrowRight size={11} className="ml-auto text-slate-400"/>
              </button>
            )}
          </div>

          {/* REALIZADO */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Clock size={12}/> Realizado (Ponto)
              </p>
              {canWrite && !isEditingPonto && (
                <button
                  onClick={() => setIsEditingPonto(true)}
                  className="flex items-center gap-1 rounded-full bg-slate-100 hover:bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:text-teal-700 transition-colors ring-1 ring-slate-200 hover:ring-teal-200"
                >
                  <Pencil size={10}/> Lançar Ajuste
                </button>
              )}
            </div>

            {isEditingPonto && (
              <div className="flex flex-col gap-3 rounded-2xl bg-teal-50 p-4 ring-1 ring-teal-200 animate-in slide-in-from-top-2 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Ajuste de Ponto</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] text-teal-700 font-semibold">Motivo do Ajuste</label>
                    <select
                      value={pontoReason}
                      onChange={(e) => setPontoReason(e.target.value)}
                      className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-teal-200 focus:outline-none focus:ring-teal-400"
                    >
                      {PONTO_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  {!selReason?.fullDay && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-teal-700 font-semibold">Entrada</label>
                        <input type="time" value={pontoEntry} onChange={e=>setPontoEntry(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-teal-200 focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-teal-700 font-semibold">Saída</label>
                        <input type="time" value={pontoExit} onChange={e=>setPontoExit(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-teal-200 focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-teal-700 font-semibold">Início Almoço</label>
                        <input type="time" value={pontoLunchS} onChange={e=>setPontoLunchS(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-teal-200 focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-teal-700 font-semibold">Fim Almoço</label>
                        <input type="time" value={pontoLunchR} onChange={e=>setPontoLunchR(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-teal-200 focus:outline-none" />
                      </div>
                    </>
                  )}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] text-teal-700 font-semibold">Observação (Opcional)</label>
                    <input
                      type="text"
                      value={pontoDetail}
                      onChange={(e) => setPontoDetail(e.target.value)}
                      placeholder="Detalhes adicionais do ajuste..."
                      className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-teal-200 focus:outline-none focus:ring-teal-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setIsEditingPonto(false)} className="rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900">Cancelar</button>
                  <button onClick={handleAjustePonto} disabled={loading} className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50 shadow-sm">
                    {loading ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} Salvar Ajuste
                  </button>
                </div>
              </div>
            )}

            {a ? (
              <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <TimeDetailRow label="Entrada"       value={formatTime(a.entry)}      highlight={resolved === 'ATRASO'} />
                <TimeDetailRow label="Início almoço" value={formatTime(a.lunchStart)} />
                <TimeDetailRow label="Fim almoço"    value={formatTime(a.lunchReturn)}/>
                <TimeDetailRow label="Saída"         value={formatTime(a.exit)}       highlight={resolved === 'SAIDA_ANTECIPADA'} />
                <div className="mt-1 border-t border-slate-200 pt-2.5 flex flex-col gap-1.5">
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
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 ring-1 ring-slate-200 py-8 text-xs text-slate-500">
                <Clock size={20} className="opacity-30" />
                Sem registro de ponto neste dia
              </div>
            )}
          </div>
        </div>

        {/* Ocorrências */}
        {a && (
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <AlertTriangle size={12}/> Ocorrências
            </p>
            <div className="flex flex-wrap gap-2">
              {resolved === 'ATRASO_E_SAIDA_ANTECIPADA' && (
                <>
                  <OccurrenceBadge color="bg-orange-50 text-orange-700 ring-orange-200" icon="A" label={`Atraso: ${formatMin(a.lateMinutes)}`} />
                  <OccurrenceBadge color="bg-orange-50 text-orange-700 ring-orange-200" icon="S" label={`Saída antecipada: ${formatMin(a.earlyLeaveMinutes ?? a.absenceMinutes)}`} />
                </>
              )}              {resolved === 'ATRASO' && (
                <OccurrenceBadge color="bg-orange-50 text-orange-700 ring-orange-200" icon="⏰" label={`Atraso: ${formatMin(a.lateMinutes)}`} />
              )}
              {resolved === 'SAIDA_ANTECIPADA' && (
                <OccurrenceBadge color="bg-orange-50 text-orange-700 ring-orange-200" icon="🏃" label={`Saída antecipada: ${formatMin(a.earlyLeaveMinutes ?? a.absenceMinutes)}`} />
              )}
              {resolved === 'FALTA' && (
                <OccurrenceBadge color="bg-red-50 text-red-700 ring-red-200" icon="❌" label={`Falta: ${formatMin(a.absenceMinutes)} ausência`} />
              )}
              {(a.overtime50Minutes ?? 0) > 0 && (
                <OccurrenceBadge
                  color={a.overtimeApprovalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}
                  icon="⏱"
                  label={`HE 50%: ${formatMin(a.overtime50Minutes)} ${a.overtimeApprovalStatus === 'PENDING' ? '(aguard. aprov.)' : ''}`}
                />
              )}
              {(a.overtime100Minutes ?? 0) > 0 && (
                <OccurrenceBadge
                  color={a.overtimeApprovalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}
                  icon="⏱"
                  label={`HE 100%: ${formatMin(a.overtime100Minutes)} ${a.overtimeApprovalStatus === 'PENDING' ? '(aguard. aprov.)' : ''}`}
                />
              )}
              {(a.nightShiftMinutes ?? 0) > 0 && (
                <OccurrenceBadge color="bg-slate-100 text-slate-700 ring-slate-200" icon="🌙" label={`Noturno: ${formatMin(a.nightShiftMinutes)}`} />
              )}
              {(resolved === 'ATESTADO' || resolved === 'ATESTADO_HORAS') && (
                <OccurrenceBadge color="bg-purple-50 text-purple-700 ring-purple-200" icon="💊" label={resolved === 'ATESTADO' ? 'Atestado Integral' : 'Atestado (horas)'} />
              )}
              {resolved === 'SUSPENSAO' && (
                <OccurrenceBadge color="bg-red-100 text-red-700 ring-red-200" icon="🚫" label="Suspensão" />
              )}
              {resolved === 'FERIADO' && (
                <OccurrenceBadge color="bg-amber-50 text-amber-700 ring-amber-200" icon="🟡" label={`Feriado${day.holiday ? ': ' + day.holiday.name : ''}`} />
              )}
              {(resolved === 'FOLGA' || resolved === 'FOLGA_DSR' || resolved === 'FOLGA_BANCO') && (
                <OccurrenceBadge color="bg-blue-50 text-blue-700 ring-blue-200" icon="🔵" label={getMeta(resolved).label} />
              )}
              {a.locationAddress && (
                <OccurrenceBadge color="bg-zinc-50 text-zinc-700 ring-zinc-200" icon="📍" label={`Local: ${a.locationAddress}`} />
              )}
              {a.clockedInWithoutFacial && (
                <OccurrenceBadge color="bg-yellow-50 text-yellow-700 ring-yellow-200" icon="⚠️" label="Sem biometria facial" />
              )}
              {resolved === 'WORK' && !((a.overtime50Minutes ?? 0) + (a.overtime100Minutes ?? 0) > 0) &&
               !a.lateMinutes && !(a.dailyBalance && a.dailyBalance < 0) && (
                <OccurrenceBadge color="bg-emerald-50 text-emerald-700 ring-emerald-200" icon="✅" label="Sem ocorrências" />
              )}
            </div>

            {a.observation && (
              <div className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200 text-xs text-slate-600">
                <FileText size={12} className="shrink-0 mt-0.5 text-slate-400"/>
                <p>{a.observation}</p>
              </div>
            )}

            {totalOT > 0 && (
              <div className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs ring-1 font-medium ${
                a.overtimeApprovalStatus === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : a.overtimeApprovalStatus === 'REJECTED'
                    ? 'bg-red-50 text-red-700 ring-red-200'
                    : 'bg-amber-50 text-amber-700 ring-amber-200'
              }`}>
                <Info size={12}/>
                Hora Extra ({formatMin(totalOT)}): {
                  a.overtimeApprovalStatus === 'APPROVED' ? 'Aprovada ✓' :
                  a.overtimeApprovalStatus === 'REJECTED' ? 'Rejeitada ✗' : 'Aguardando aprovação...'
                }
                {a.overtimeHandling && a.overtimeApprovalStatus === 'APPROVED' && (
                  <span className="ml-1 opacity-70">— {
                    a.overtimeHandling === 'BANK' ? 'Banco de Horas' :
                    a.overtimeHandling === 'PAYMENT' ? 'Pagamento em Folha' : 'Dividido'
                  }</span>
                )}
              </div>
            )}

            {a.manualStatus === 'pending' && (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700 ring-1 ring-amber-200 font-medium">
                <AlertCircle size={12}/> Ajuste manual aguardando aprovação do gestor
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Ajuste Mensal */}
      {showMonthlyAdj && (
        <ModalAjusteMensal
          employeeId={targetEmployeeId || 'me'}
          currentMonth={currentMonth || ''}
          onClose={() => setShowMonthlyAdj(false)}
          onSuccess={() => { setShowMonthlyAdj(false); if (refresh) refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Modal Ajuste Mensal ──────────────────────────────────────────────────────

function ModalAjusteMensal({ employeeId, currentMonth, onClose, onSuccess }: {
  employeeId: string;
  currentMonth: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState('FOLGA');
  const [month, setMonth] = useState(currentMonth);
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TYPES = [
    { value: 'FOLGA',    label: 'Folga',             icon: '🔵' },
    { value: 'ATESTADO', label: 'Atestado',           icon: '💊' },
    { value: 'FERIADO',  label: 'Feriado',            icon: '🟡' },
    { value: 'AJUSTE',   label: 'Ajuste de Horário',  icon: '⚙️' },
    { value: 'FOLGA_BANCO', label: 'Folga Banco',     icon: '🏦' },
  ];

  const submit = async () => {
    if (!month) { setError('Selecione o mês.'); return; }
    setLoading(true); setError('');
    try {
      await (api.schedules as any).createMonthlyException?.({
        employeeId,
        month,
        exceptionType: type,
        observation: observation || undefined,
      });
      onSuccess();
    } catch (e: any) {
      // Fallback: informar que o ajuste mensal pode precisar de implementação no backend
      setError(e.message || 'Erro ao criar ajuste mensal. Verifique se o backend suporta esta operação.');
    }
    setLoading(false);
  };

  return (
    <Modal title="Ajuste do Mês Inteiro" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200 text-xs text-amber-700 flex items-start gap-2">
          <Info size={13} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold">Ajuste aplicado a todos os dias úteis do mês</p>
            <p className="mt-0.5 text-amber-600">Use para casos como saída antecipada recorrente, licença mensal etc.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Mês de referência</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-slate-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-600">Tipo de ajuste</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ring-1 transition-all ${
                  type === t.value
                    ? 'bg-slate-900 text-white ring-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 ring-slate-200 hover:ring-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Observação (opcional)</label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo do ajuste..."
            className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-slate-400 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-xl ring-1 ring-red-200">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">Cancelar</button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            Aplicar Ajuste
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TimeDetailRow({ label, value, highlight, positive }: { label: string; value: string; highlight?: boolean; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${
        highlight ? 'text-red-700' : positive ? 'text-emerald-700' : 'text-slate-800'
      }`}>{value}</span>
    </div>
  );
}

function OccurrenceBadge({ color, icon, label }: { color: string; icon: string; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${color}`}>
      {icon} {label}
    </span>
  );
}

// ─── ESCALA DE EQUIPE ─────────────────────────────────────────────────────────

function EscalaEquipeTab({ loading, teamData, schedules, canWrite, year, month, onPrev, onNext, onLancar, onRefresh, onSelectEmployee }: any) {
  const withSchedule    = [...(teamData?.withSchedule ?? [])].sort((a: any, b: any) => (a.employee?.name || '').localeCompare(b.employee?.name || ''));
  const withoutSchedule = [...(teamData?.withoutSchedule ?? [])].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 transition-all shadow-sm"
          >
            <ChevronLeft size={16}/>
          </button>
          <h2 className="text-base font-bold text-slate-900">
            {MONTH_NAMES[month-1]} <span className="text-slate-400 font-normal">{year}</span>
          </h2>
          <button
            onClick={onNext}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 transition-all shadow-sm"
          >
            <ChevronRight size={16}/>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 hover:text-slate-900 transition-all shadow-sm"
          >
            <RefreshCw size={12}/> Atualizar
          </button>
          {canWrite && (
            <button
              onClick={onLancar}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
            >
              <Plus size={13}/> Lançar Escala
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array(5).fill(null).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {withSchedule.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Com Escala</p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {withSchedule.length}
                </span>
              </div>
              {withSchedule.map((us: any) => (
                <EmployeeTeamCard
                  key={us.id}
                  employee={us.employee}
                  schedule={us.schedule}
                  hasSchedule
                  onSelect={() => onSelectEmployee?.(us.employee?.id || us.employeeId)}
                />
              ))}
            </div>
          )}
          {withoutSchedule.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sem Escala</p>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                  {withoutSchedule.length}
                </span>
              </div>
              {withoutSchedule.map((emp: any) => (
                <EmployeeTeamCard
                  key={emp.id}
                  employee={emp}
                  hasSchedule={false}
                  onSelect={() => onSelectEmployee?.(emp.id)}
                />
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

// ─── Employee Team Card Premium ────────────────────────────────────────────────

function EmployeeTeamCard({ employee, schedule, hasSchedule, onSelect }: {
  employee: any;
  schedule?: any;
  hasSchedule: boolean;
  onSelect: () => void;
}) {
  if (!employee) return null;
  const reg = employee.registration ? `#${String(employee.registration).padStart(4, '0')}` : 'S/N';

  return (
    <button
      onClick={onSelect}
      className="group flex items-center gap-4 w-full text-left rounded-2xl bg-white p-4 ring-1 ring-slate-200 hover:ring-slate-300 hover:shadow-md transition-all duration-200 relative overflow-hidden"
    >
      {/* Linha lateral colorida no hover */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />

      {/* Avatar */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white text-sm font-bold shadow-md group-hover:scale-105 transition-transform bg-slate-900"
      >
        {getInitials(employee.name || '')}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-900 truncate">
            {employee.registration ? String(employee.registration).padStart(4, '0') : 'S/N'} - {employee.name?.toUpperCase()}
          </p>
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {employee.department?.toUpperCase()} · {employee.position?.toUpperCase()}
        </p>
      </div>

      {/* Escala info */}
      {hasSchedule && schedule ? (
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-sm font-semibold text-slate-700">{schedule.name?.toUpperCase()}</p>
          <p className="text-xs text-slate-500">{schedule.scaleType?.toUpperCase()} · {schedule.entryTime ?? '--'} – {schedule.exitTime ?? '--'}</p>
        </div>
      ) : (
        <div className="shrink-0">
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
            <AlertCircle size={10}/> Sem escala
          </span>
        </div>
      )}

      {/* Badge Ativa + Chevron */}
      <div className="flex items-center gap-2 shrink-0">
        {hasSchedule && (
          <span className="hidden sm:flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            ATIVA
          </span>
        )}
        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>
    </button>
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
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse inline-block" />
              {pending.length} pendente{pending.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 transition-all shadow-sm"
          >
            <RefreshCw size={12}/> Atualizar
          </button>
          <button
            onClick={onNovatroca}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
          >
            <Plus size={13}/> Nova Solicitação
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-slate-400"/>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Aguardando Aprovação</p>
              {pending.map((s: any) => <SwapCard key={s.id} swap={s} canApprove={canApprove} onApprove={onApprove} onCancel={onCancel}/>)}
            </div>
          )}
          {others.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Histórico</p>
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
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 hover:ring-slate-300 transition-all shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <ArrowLeftRight size={16}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-sm font-bold text-slate-900 truncate">{swap.requester?.name?.toUpperCase() ?? 'USUÁRIO'}</p>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${SWAP_STATUS_BADGE[swap.status]}`}>
              {SWAP_STATUS_LABEL[swap.status]}
            </span>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="text-red-700 font-semibold">{fmtDate(swap.originalDate)}</span>
            <ArrowRight size={11} className="text-slate-300" />
            <span className="text-emerald-700 font-semibold">{fmtDate(swap.targetDate)}</span>
          </p>
          {swap.justification && <p className="mt-1 text-xs text-slate-600 italic">"{swap.justification}"</p>}
          {swap.rejectionReason && <p className="mt-1 text-xs text-red-700 font-medium">Motivo: {swap.rejectionReason}</p>}
        </div>
        {swap.status === 'PENDING' && (
          <div className="flex gap-2 shrink-0">
            {canApprove && (
              <button
                onClick={() => onApprove(swap)}
                className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors ring-1 ring-emerald-200"
              >
                <Check size={12}/> Revisar
              </button>
            )}
            <button
              onClick={() => onCancel(swap.id)}
              className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors ring-1 ring-red-200"
            >
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
  const today = saoPauloDateKey();
  const [originalDate, setOriginalDate] = useState(today);
  const [targetDate, setTargetDate]     = useState('');
  const [justification, setJustification] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [swapWithId, setSwapWithId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [candidates, setCandidates] = useState<any[]>([]);
  useEffect(() => {
    api.employees.swapCandidates().then(setCandidates).catch(() => {});
  }, []);

  const submit = async () => {
    if (!originalDate || !targetDate) { setError('Informe os dois dias.'); return; }
    setLoading(true); setError('');
    try {
      let finalJustif = justification;
      if (swapWithId) {
        const sw = candidates.find(c => c.id === swapWithId);
        if (sw) finalJustif = `[Troca com: ${sw.name}] ${justification}`;
      }
      await api.scheduleSwaps.create({ originalDate, targetDate, justification: finalJustif || undefined, employeeId: targetEmployeeId || undefined } as any);
      onSuccess();
    } catch (e: any) { setError(e.message || 'Erro ao criar solicitação.'); }
    setLoading(false);
  };

  return (
    <Modal title="Nova Solicitação de Troca" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-indigo-50 p-3.5 ring-1 ring-indigo-200 text-xs text-indigo-700 flex items-start gap-2">
          <Info size={13} className="shrink-0 mt-0.5"/>
          Sua solicitação será encaminhada automaticamente ao seu gestor para aprovação.
        </div>
        {canApprove && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Em nome de (Opcional)</label>
            <select
              value={targetEmployeeId}
              onChange={(e) => setTargetEmployeeId(e.target.value)}
              className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"
            >
              <option value="">Minha Escala</option>
              {allEmployees?.map(e => (
                <option key={e.id} value={e.id}>
                  {e.registration ? `#${String(e.registration).padStart(4,'0')}` : 'S/N'} — {e.name?.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Trocar com colaborador (Opcional)</label>
          <select
            value={swapWithId}
            onChange={(e) => setSwapWithId(e.target.value)}
            className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"
          >
            <option value="">Nenhum (Apenas datas)</option>
            {candidates.map(e => (
              <option key={e.id} value={e.id}>
                {e.registration ? `#${String(e.registration).padStart(4,'0')}` : 'S/N'} — {e.name?.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Dia a folgar</label>
            <input type="date" value={originalDate} onChange={(e) => setOriginalDate(e.target.value)}
              className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"/>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Dia para trabalhar</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"/>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Justificativa (opcional)</label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo da troca..."
            className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none resize-none"
          />
        </div>
        {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-xl ring-1 ring-red-200">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">Cancelar</button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors shadow-sm"
          >
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
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-sm font-bold text-slate-900 mb-1">{swap.requester?.name?.toUpperCase()}</p>
          <p className="text-xs text-slate-500 flex items-center gap-2">
            Folgar em <span className="text-red-700 font-semibold">{fmtDate(swap.originalDate)}</span>
            <ArrowRight size={11} className="text-slate-400" />
            trabalhar em <span className="text-emerald-700 font-semibold">{fmtDate(swap.targetDate)}</span>
          </p>
          {swap.justification && <p className="mt-2 text-xs text-slate-600 italic">"{swap.justification}"</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['APPROVED', 'REJECTED'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setAction(opt)}
              className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all ring-1 ${
                action === opt
                  ? opt === 'APPROVED'
                    ? 'bg-emerald-600 text-white ring-emerald-600 shadow-md'
                    : 'bg-red-600 text-white ring-red-600 shadow-md'
                  : 'bg-slate-50 text-slate-500 ring-slate-200 hover:ring-slate-300 hover:bg-slate-100'
              }`}
            >
              {opt === 'APPROVED' ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
              {opt === 'APPROVED' ? 'Aprovar' : 'Rejeitar'}
            </button>
          ))}
        </div>
        {action === 'REJECTED' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Motivo *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none resize-none"
              placeholder="Explique o motivo..."
            />
          </div>
        )}
        {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-xl ring-1 ring-red-200">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">Cancelar</button>
          <button
            onClick={submit}
            disabled={loading}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors shadow-sm ${
              action === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
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
  const [startDate, setStartDate] = useState(saoPauloDateKey());
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('5x2');
  const [newEntry, setNewEntry] = useState('08:00');
  const [newLunchStart, setNewLunchStart] = useState('12:00');
  const [newLunchReturn, setNewLunchReturn] = useState('13:00');
  const [newExit, setNewExit] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.employees.list().then(setEmployees).catch(() => {}); }, []);

  const filteredEmployees = employees.filter((e) =>
    !employeeSearch || e.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.registration || '').toString().includes(employeeSearch)
  );

  const allFilteredSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => selectedEmployees.includes(e.id));

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAction = (action: 'none' | 'all' | 'filtered') => {
    if (action === 'none') setSelectedEmployees([]);
    else if (action === 'all') setSelectedEmployees(employees.map(e => e.id));
    else setSelectedEmployees(filteredEmployees.map(e => e.id));
  };

  const submitAssign = async () => {
    if (selectedEmployees.length === 0 || !selectedSchedule || !startDate) { setError('Preencha todos os campos.'); return; }
    setLoading(true); setError('');
    try { await api.schedules.assign({ employeeIds: selectedEmployees, scheduleId: selectedSchedule, startDate } as any); onSuccess(); }
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

  const selectedEmployeeObjects = employees.filter(e => selectedEmployees.includes(e.id));

  return (
    <Modal title="Lançar / Criar Escala" onClose={onClose} wide>
      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1.5 mb-6">
        {(['assign', 'create'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
              mode === m ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            {m === 'assign' ? 'Atribuir Existente' : 'Criar Nova Escala'}
          </button>
        ))}
      </div>

      {mode === 'assign' ? (
        <div className="flex flex-col gap-4">
          {/* Chips dos selecionados */}
          {selectedEmployeeObjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedEmployeeObjects.map(e => (
                <span
                  key={e.id}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 text-white shadow-sm bg-slate-900"
                >
                  {getInitials(e.name || '')} {e.name?.split(' ')[0]}
                  <button
                    onClick={() => toggleEmployee(e.id)}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">
                Funcionários
                {selectedEmployees.length > 0 && (
                  <span className="ml-2 rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px] font-bold">
                    {selectedEmployees.length} selecionado{selectedEmployees.length !== 1 ? 's' : ''}
                  </span>
                )}
              </label>
              {/* Botões de ação em grupo */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => selectAction('none')}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
                    selectedEmployees.length === 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Nenhum
                </button>
                <button
                  onClick={() => selectAction('filtered')}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
                    allFilteredSelected && employeeSearch ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Filtrados
                </button>
                <button
                  onClick={() => selectAction('all')}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
                    selectedEmployees.length === employees.length && employees.length > 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Buscar por nome ou matrícula..."
                className="w-full rounded-xl bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-slate-400"
              />
            </div>

            {/* Lista de funcionários */}
            <div className="max-h-52 overflow-y-auto rounded-2xl bg-white ring-1 ring-slate-200 divide-y divide-slate-100 shadow-sm">
              {filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                  <Search size={18} className="opacity-40"/>
                  <p className="text-xs">Nenhum funcionário encontrado</p>
                </div>
              ) : (
                filteredEmployees.slice(0, 50).map((e) => {
                  const isSelected = selectedEmployees.includes(e.id);
                  const reg = e.registration ? `#${String(e.registration).padStart(4, '0')}` : 'S/N';
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEmployee(e.id)}
                      className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                        isSelected ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white hover:border-slate-500'
                      }`}>
                        {isSelected && <Check size={11} strokeWidth={3} className="text-white"/>}
                      </div>

                      {/* Avatar */}
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm bg-slate-900"
                      >
                        {getInitials(e.name || '')}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                          {e.registration ? String(e.registration).padStart(4, '0') : 'S/N'} - {e.name?.toUpperCase()}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{e.department?.toUpperCase() || 'SEM DEPTO'}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Escala */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Escala</label>
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"
            >
              <option value="">Selecionar...</option>
              {schedules.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name?.toUpperCase()} ({s.scaleType?.toUpperCase()})</option>
              ))}
            </select>
          </div>

          {/* Início da Vigência */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Início da Vigência</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Nome</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Administrativo 8h"
                className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Tipo</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"
              >
                {['5x2','6x1','12x36','4x2','PERSONALIZADA','PLANTAO'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { l: 'Entrada',      v: newEntry,      s: setNewEntry },
              { l: 'Início Almoço', v: newLunchStart, s: setNewLunchStart },
              { l: 'Fim Almoço',   v: newLunchReturn, s: setNewLunchReturn },
              { l: 'Saída',        v: newExit,        s: setNewExit },
            ].map(({ l, v, s }) => (
              <div key={l} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">{l}</label>
                <input
                  type="time"
                  value={v}
                  onChange={(e) => s(e.target.value)}
                  className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-xl ring-1 ring-red-200 mt-3">{error}</p>}
      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">Cancelar</button>
        <button
          onClick={mode === 'assign' ? submitAssign : submitCreate}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
          {mode === 'assign' ? `Atribuir${selectedEmployees.length > 0 ? ` (${selectedEmployees.length})` : ''}` : 'Criar Escala'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative flex flex-col rounded-2xl bg-white ring-1 ring-slate-200 shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            <X size={16}/>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, hint }: { icon: React.ReactNode; message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{message}</p>
        {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      </div>
    </div>
  );
}
