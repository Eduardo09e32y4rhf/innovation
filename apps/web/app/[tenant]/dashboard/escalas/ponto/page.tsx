'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api, type Employee, type TimeTrack, type TimeTrackAdjustmentReason } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LoadingState, ErrorState, EmptyState, SolidCard, InnerCard } from '@/app/components/platform-ui';
import { formatMinutes } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { hasPermission } from '@/app/lib/permissions';
import { saoPauloDateKey } from '@/app/lib/date';
import { ChevronLeft, ChevronRight, Clock, Download, CheckCircle, Plus, X, CalendarDays, Edit3, Trash2, MapPin, Search, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const WEEKDAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

const REASONS: { value: TimeTrackAdjustmentReason; label: string; fullDay?: boolean }[] = [
  { value:'ajuste_erro_marcacao', label:'AJUSTE - MARCAÇÃO INCOMPLETA', fullDay:false },
  { value:'ajuste_atestado_integral', label:'ATESTADO INTEGRAL', fullDay:true },
  { value:'ajuste_feriado', label:'FERIADO', fullDay:true },
  { value:'ajuste_abono_atestado_horas', label:'ABONO - ATESTADO DE HORAS', fullDay:false },
  { value:'ajuste_folga_dsr', label:'FOLGA', fullDay:true },
  { value:'ajuste_abono_folga', label:'ABONO - FOLGA (BANCO)', fullDay:true },
  { value:'ajuste_abono_banco_saida_antecipada', label:'ABONO - BANCO SAÍDA ANTECIPADA', fullDay:true },
  { value:'ajuste_abono_atraso', label:'ABONO - ATRASO', fullDay:true },
  { value:'ajuste_suspensao', label:'SUSPENSÃO', fullDay:true },
];

function getLocalToday() {
  return saoPauloDateKey();
}
function toDateKey(v?: string | null) { return v ? v.slice(0,10) : ''; }
function fmtTime(v?: string | null) {
  if (!v) return '--:--';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' });
}
function fmtLunch(s?: string|null, e?: string|null) {
  if (!s && !e) return '--:--';
  return `${fmtTime(s)} - ${fmtTime(e)}`;
}
function fmtWorked(m?: number|null) { return m == null ? '--:--' : formatMinutes(m); }
function fmtBalance(m?: number|null) { return m == null ? '--:--' : formatMinutes(m); }

function fmtDateFull(v?: string | null): string {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  const wd = WEEKDAYS[d.getUTCDay()] ?? '---';
  const dd = String(d.getUTCDate()).padStart(2,'0');
  const mm = String(d.getUTCMonth()+1).padStart(2,'0');
  const yy = d.getUTCFullYear();
  return `${wd} - ${dd}/${mm}/${yy}`;
}

function isRestDay(date: Date, emp: Employee): boolean {
  const wd = date.getUTCDay();
  if (emp.workScheduleRule?.restDaysOfWeek && emp.workScheduleRule.restDaysOfWeek.length > 0) {
    return emp.workScheduleRule.restDaysOfWeek.includes(wd);
  }
  const s = emp.workScale; const c = emp.customWorkScale;
  if (s==='5X2') return wd===0||wd===6;
  if (s==='6X1') return wd===0;
  if (s==='4X2') return isCycle(date,emp,4,2);
  if (s==='12X36') return isCycle(date,emp,1,1);
  if (s==='OUTRO' && c) {
    const m = c.match(/(\d+)X(\d+)/i);
    if (m) return isCycle(date,emp,parseInt(m[1],10),parseInt(m[2],10));
  }
  return wd===0;
}
function isCycle(date: Date, emp: Employee, work: number, off: number) {
  const adm = emp.admissionDate ? new Date(emp.admissionDate) : new Date('2020-01-01');
  const a = Date.UTC(adm.getUTCFullYear(), adm.getUTCMonth(), adm.getUTCDate());
  const b = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diff = Math.floor((b-a)/864e5);
  if (diff<0) return false;
  return (diff%(work+off)) >= work;
}
function isAntesAdmissao(key: string, emp: Employee): boolean {
  if (!emp.admissionDate) return false;
  const adm = emp.admissionDate.slice(0,10);
  return key < adm;
}
function isDepoisDemissao(key: string, emp: Employee): boolean {
  if (!emp.terminationDate) return false;
  const dem = emp.terminationDate.slice(0,10);
  return key > dem;
}

function buildGrid(month: string, emp: Employee, tracks: TimeTrack[], startDay: number = 1, holidays: any[] = [], teamSchedules: any[] = []) {
  const safeHolidays = holidays || [];
  const [y,m] = month.split('-').map(Number); if (!y||!m) return [];
  const today = getLocalToday();
  const map = new Map<string, TimeTrack>();
  for (const t of tracks) map.set(toDateKey(t.date), t);
  const g: any[] = [];
  const empSchedule = teamSchedules.find(ts => ts.employee?.id === emp.id || ts.employeeId === emp.id);
  const calDays = empSchedule ? (empSchedule.days || []) : [];
  const getCalDay = (k: string) => calDays.find((cd: any) => cd.date === k);
  
  let startDate = new Date(Date.UTC(y, m - 1, 1));
  let endDate = new Date(Date.UTC(y, m, 0));

  if (startDay > 1) {
    startDate = new Date(Date.UTC(y, m - 2, startDay));
    const nextMonth = new Date(Date.UTC(y, m - 1, startDay));
    endDate = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000);
  }

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = new Date(d);
    const key = date.toISOString().slice(0,10);
    const holiday = safeHolidays.find(h => h.date && h.date.startsWith(key));
    const cd = getCalDay(key);
    let isRest = isRestDay(date,emp);
    let holidayName = holiday?.name;
    let scheduled = null;
    let dayType = 'WORK';
    if (cd) {
      isRest = cd.dayType === 'FOLGA' || cd.dayType === 'FOLGA_DSR' || cd.dayType === 'FOLGA_BANCO';
      if (cd.dayType === 'SEM_ESCALA') isRest = isRestDay(date, emp);
      if (cd.dayType === 'FERIADO' || cd.dayType === 'FERIADO_LOCAL') holidayName = holidayName || 'Feriado';
      scheduled = isRest ? null : cd.scheduled;
      dayType = cd.dayType;
    }

    if (!isRest && !scheduled) {
      scheduled = {
        entry: emp.standardEntry || '08:00',
        lunchStart: emp.standardLunchStart || '12:00',
        lunchReturn: emp.standardLunchReturn || '13:00',
        exit: emp.standardExit || '18:00'
      };
    }

    g.push({
      date, key, day: date.getUTCDate(), wd: date.getUTCDay(),
      isRest, isFuture: key>today, antesAdmissao: isAntesAdmissao(key,emp), depoisDemissao: isDepoisDemissao(key,emp),
      track: map.get(key), holidayName, scheduled, dayType
    });
  }
  return g;
}

function dayStatus(row: TimeTrack, holidayName?: string) {
  if (row.manualStatus==='revoked') return 'REVOGADO';
  const o = (row.observation ?? '').toLowerCase();
  if (o.includes('atestado integral')) return 'ATESTADO';
  if (o.includes('atestado') && o.includes('horas')) return 'ATESTADO (HORAS)';
  if (o.includes('suspensao') || o.includes('suspensão')) return 'SUSPENSÃO';
  if (o.includes('feriado') || holidayName) return 'FERIADO';
  if (o.includes('folga extra')) return 'FOLGA EXTRA';
  if (o.includes('folga banco')) return 'FOLGA BANCO';
  if (o.includes('folga')) return 'FOLGA';
  const r = (row.manualReason ?? '').toLowerCase();
  if (r.includes('atestado integral')) return 'ATESTADO';
  if (r.includes('feriado')) return 'FERIADO';
  if (r.includes('folga dsr')) return 'FOLGA';
  if (r === 'ajuste_erro_marcacao') return 'PONTO INCOMPLETO';
  if (r === 'ajuste_abono_atraso') return 'ABONO DE ATRASO';
  if (r === 'ajuste_abono_banco_saida_antecipada') return 'ABONO SAÍDA';
  if (r === 'ajuste_abono_atestado_horas') return 'ATESTADO (HORAS)';
  if (r === 'ajuste_suspensao') return 'SUSPENSÃO';
  const occurrences: string[] = [];
  if ((row.lateMinutes ?? 0) > 0) occurrences.push(`ATRASO ${formatMinutes(row.lateMinutes ?? 0)}`);
  if ((row.earlyLeaveMinutes ?? 0) > 0) occurrences.push(`SAÍDA ANTECIPADA ${formatMinutes(row.earlyLeaveMinutes ?? 0)}`);
  if ((row.overtime50Minutes ?? 0) > 0) occurrences.push(`HE 50% ${formatMinutes(row.overtime50Minutes ?? 0)}`);
  if ((row.overtime100Minutes ?? 0) > 0) occurrences.push(`HE 100% ${formatMinutes(row.overtime100Minutes ?? 0)}`);
  if (occurrences.length) return occurrences.join(' + ');
  if (row.manualStatus==='pending') return 'PENDENTE';
  if (row.manualStatus==='rejected') return 'REJEITADO';
  if (row.manualReason || o.includes('ajuste')) return 'AJUSTE MANUAL';
  if (!row.entry && !row.exit) return 'FALTA';
  return 'NORMAL';
}

function isFalta(row: TimeTrack) {
  if (row.entry || row.exit) return false;
  const o = (row.observation ?? '').toLowerCase();
  const r = (row.manualReason ?? '').toLowerCase();
  if (o.includes('atestado') || r.includes('atestado')) return false;
  if (o.includes('feriado') || r.includes('feriado')) return false;
  if (o.includes('folga') || r.includes('folga')) return false;
  if (o.includes('abonado') || r.includes('abonado')) return false;
  if (o.includes('suspensao') || o.includes('suspensão') || r.includes('suspensao') || r.includes('suspensão')) return false;
  return true;
}

function getEffectiveStatsFromGrid(grid: any[]) {
  let worked = 0;
  let saldo = 0;
  grid.forEach(g => {
    if (g.isFuture || g.antesAdmissao || g.depoisDemissao) return;
    if (g.track) {
      worked += (g.track.totalWorked ?? 0);
      saldo += (g.track.dailyBalance ?? 0);
    } else if (!g.isRest) {
      let expected = 480;
      if (g.scheduled && g.scheduled.entry && g.scheduled.exit) {
        const ent = new Date(`1970-01-01T${g.scheduled.entry}Z`);
        const ext = new Date(`1970-01-01T${g.scheduled.exit}Z`);
        expected = (ext.getTime() - ent.getTime()) / 60000;
        if (g.scheduled.lunchStart && g.scheduled.lunchReturn) {
          const lEnt = new Date(`1970-01-01T${g.scheduled.lunchStart}Z`);
          const lExt = new Date(`1970-01-01T${g.scheduled.lunchReturn}Z`);
          expected -= (lExt.getTime() - lEnt.getTime()) / 60000;
        }
      }
      saldo -= expected;
    }
  });
  return { worked, saldo };
}

function StatusBadge({ status }: { status: string }) {
  const u = status.toUpperCase();
  const c: Record<string,string> = {
    'NORMAL':'bg-emerald-50 text-emerald-700 border-emerald-200',
    'PENDENTE':'bg-amber-50 text-amber-700 border-amber-200',
    'REJEITADO':'bg-rose-50 text-rose-700 border-rose-200',
    'REVOGADO':'bg-red-100 text-red-700 border-red-200',
    'FERIADO':'bg-teal-50 text-teal-700 border-teal-200',
    'ATESTADO':'bg-violet-50 text-violet-700 border-violet-200',
    'ATESTADO (HORAS)':'bg-violet-50 text-violet-700 border-violet-200',
    'SUSPENSÃO':'bg-orange-50 text-orange-700 border-orange-200',
    'FOLGA':'bg-sky-50 text-sky-700 border-sky-200',
    'FOLGA (DSR)':'bg-sky-50 text-sky-700 border-sky-200',
    'FOLGA EXTRA':'bg-indigo-50 text-indigo-700 border-indigo-200',
    'FOLGA BANCO':'bg-cyan-50 text-cyan-700 border-cyan-200',
    'AJUSTE MANUAL':'bg-orange-50 text-orange-700 border-orange-200',
    'PONTO INCOMPLETO':'bg-amber-50 text-amber-700 border-amber-200',
    'ABONO DE ATRASO':'bg-indigo-50 text-indigo-700 border-indigo-200',
    'ABONO SAÍDA':'bg-indigo-50 text-indigo-700 border-indigo-200',
    'FALTA':'bg-rose-50 text-rose-700 border-rose-200',
    'ATRASO':'bg-rose-50 text-rose-800 border-rose-300',
    'SAÍDA ANTECIPADA':'bg-rose-50 text-rose-800 border-rose-300',
  };
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${c[u]||'bg-slate-100 text-slate-600 border-slate-200'}`}>{u}</span>;
}

export default function PontoPage() {
  const { tenant } = useParams() as { tenant: string };
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const canManage = hasPermission(user, 'time_tracking.view_all');
  const canApprove = hasPermission(user, 'time_tracking.approve_all') || hasPermission(user, 'time_tracking.approve_team');
  const isGestor = hasPermission(user, 'time_tracking.view_team') && !canManage;
  const isFunc = !canManage && !isGestor;

  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(searchParams.get('employeeId') || (isFunc ? user?.id : 'all'));
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<TimeTrack | null>(null);

  useEffect(() => {
    const q = searchParams.get('employeeId');
    if (q) setSelectedEmployeeId(q);
  }, [searchParams]);

  const { data: employeesData } = useQuery(() => api.employees.list(), []);
  const employees = (employeesData || []) as Employee[];
  
  const { data: timeRecordsData, loading: isLoadingTracks, refetch: refetchTracks } = useQuery(
    () => api.timeTrack.list(currentMonth),
    [currentMonth]
  );
  
  const { data: teamSchedulesData } = useQuery(
    () => api.schedules.teamSchedule(currentMonth),
    [currentMonth]
  );
  
  const { data: companyData } = useQuery(() => api.companies.me(), []);
  const { data: holidaysData } = useQuery(() => api.companies.getHolidays(), []);
  const { data: pendingData, refetch: refetchPending } = useQuery(() => api.timeTrack.listPending(), [], { enabled: canApprove });

  const approveMut = useMutation((p:{id:string;approved:boolean})=> api.timeTrack.approve(p.id, p.approved), { onSuccess:()=>{ refetchPending(); refetchTracks(); }});
  const removeMut = useMutation((id:string)=> api.timeTrack.delete(id), { onSuccess: ()=> refetchTracks() });

  const handlePrevMonth = () => {
    const d = new Date(`${currentMonth}-01T00:00:00`);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d.toISOString().substring(0, 7));
  };
  const handleNextMonth = () => {
    const d = new Date(`${currentMonth}-01T00:00:00`);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d.toISOString().substring(0, 7));
  };

  const onDelete = async (r: TimeTrack) => {
    if (!window.confirm(`Excluir ponto de ${normalizeDisplayName(r.employee?.name ??'-')} em ${fmtDateFull(r.date)}?`)) return;
    await removeMut.mutate(r.id).catch(()=>{});
  };

  const visibleEmployees = useMemo(() => {
    return employees.filter(e => {
      if (selectedEmployeeId && selectedEmployeeId !== 'all' && e.id !== selectedEmployeeId) return false;
      const [y,m] = currentMonth.split('-').map(Number);
      const startOfMonth = `${y}-${String(m).padStart(2,'0')}-01`;
      const endOfMonth = new Date(y, m, 0).toISOString().slice(0,10);
      if (e.admissionDate && e.admissionDate.slice(0,10) > endOfMonth) return false;
      if (e.terminationDate && e.terminationDate.slice(0,10) < startOfMonth) return false;
      return true;
    }).sort((a,b)=>normalizeDisplayName(a.name).localeCompare(normalizeDisplayName(b.name),'pt-BR'));
  }, [employees, selectedEmployeeId, currentMonth]);

  const byEmpMap = useMemo(() => {
    const map: Record<string, TimeTrack[]> = {};
    (timeRecordsData || []).forEach((r: TimeTrack) => {
      if (!map[r.employeeId]) map[r.employeeId] = [];
      map[r.employeeId].push(r);
    });
    return map;
  }, [timeRecordsData]);

  if (isLoadingTracks && !timeRecordsData) return <LoadingState label="Carregando folha de ponto..." />;

  const isDetailView = selectedEmployeeId && selectedEmployeeId !== 'all' && visibleEmployees.length === 1;

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row justify-between md:items-center">
        <div>
          <h1 className="page-title">{isDetailView && isFunc ? 'Meu Ponto' : 'Folha de Ponto'}</h1>
          <p className="page-subtitle">Acompanhe os registros de jornada e saldo de horas</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          {(canManage || isGestor) && (
            <>
              <button onClick={() => window.print()} className="btn-outline flex items-center gap-2 text-brand bg-brand/5 border-brand/20 hover:bg-brand/10 transition-colors">
                <FileText size={16} /><span>Imprimir Relatório</span>
              </button>
              <button onClick={() => { setEditingTrack(null); setIsManualModalOpen(true); }} className="btn-outline flex items-center gap-2">
                <Plus size={16} /><span>Ajuste Manual</span>
              </button>
            </>
          )}
          <Link href={`/${tenant}/dashboard/time-track/clock-in`} className="btn-nubank flex items-center gap-2">
            <Clock size={16} /><span>Bater Ponto</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20 hover:bg-brand hover:text-white transition-all shadow-sm">
            <ChevronLeft size={16} />
          </button>
          <span className="font-black text-slate-900 text-base min-w-[150px] text-center uppercase tracking-wider">
            {new Date(`${currentMonth}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long' })} <span className="text-brand">{new Date(`${currentMonth}-01T00:00:00`).getFullYear()}</span>
          </span>
          <button onClick={handleNextMonth} className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20 hover:bg-brand hover:text-white transition-all shadow-sm">
            <ChevronRight size={16} />
          </button>
        </div>

        {!isFunc && (
          <div className="flex items-center gap-2 w-full md:w-auto relative">
            <Search size={16} className="absolute left-3 text-slate-400" />
            <select 
              className="pl-9 pr-4 py-2 w-full md:w-72 bg-slate-50 border border-slate-200 text-sm rounded-lg font-medium text-slate-700 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all"
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                if (e.target.value === 'all') {
                  router.push(`/${tenant}/dashboard/escalas/ponto`);
                } else {
                  router.push(`/${tenant}/dashboard/escalas/ponto?employeeId=${e.target.value}`);
                }
              }}
            >
              <option value="all">TODOS FUNCIONÁRIOS</option>
              {employees?.map((e: any) => (
                <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!isDetailView ? (
        <SolidCard>
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
            <h3 className="font-bold text-slate-800">Colaboradores</h3>
            <span className="text-xs font-medium text-slate-500">{visibleEmployees.length} registros</span>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleEmployees.map(emp => {
              const rows = byEmpMap[emp.id] ?? [];
              const grid = buildGrid(currentMonth, emp, rows, (companyData as any)?.payrollStartDay || 1, holidaysData as any[] || [], teamSchedulesData?.withSchedule || []);
              const { worked, saldo } = getEffectiveStatsFromGrid(grid);
              const faltas = rows.filter(isFalta).length;
              
              return (
                <div key={emp.id} onClick={() => setSelectedEmployeeId(emp.id)} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-brand/5 cursor-pointer transition-all duration-300 relative overflow-hidden">
                  {/* Linha lateral colorida */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-brand transition-colors" />
                  
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-sm font-black shadow-md group-hover:scale-110 transition-transform bg-gradient-to-br from-brand to-[#5e0382] ml-1">
                      {normalizeDisplayName(emp.name).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-widest border border-slate-200 group-hover:border-brand/30 group-hover:text-brand transition-colors">
                          {emp.registration ? String(emp.registration).padStart(4, '0') : emp.id.slice(0,8).toUpperCase()}
                        </span>
                        <p className="font-black text-sm text-slate-900 tracking-tight">{normalizeDisplayName(emp.name).toUpperCase()}</p>
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{emp.department || 'SEM DEPARTAMENTO'} {faltas > 0 && <span className="text-red-500 ml-2 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{faltas} FALTA(S)</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex gap-5 items-center">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Trabalhado</span>
                        <span className="font-mono text-sm font-black text-slate-700">{fmtWorked(worked)}</span>
                      </div>
                      <div className="w-px h-8 bg-slate-200"></div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Saldo</span>
                        <span className={`font-mono text-sm font-black ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBalance(saldo)}</span>
                      </div>
                    </div>
                    <div className="flex flex-row gap-2 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedEmployeeId(emp.id); }} className="btn-nubank px-4 py-2 text-[10px] shadow-sm font-bold tracking-wider hover:scale-105 transition-transform">VER FOLHA</button>
                      {(canManage || isGestor) && (
                        <button onClick={(e) => { e.stopPropagation(); window.print(); }} className="btn-outline flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold border-brand/30 text-brand hover:bg-brand/5 transition-transform hover:scale-105">
                          <Download size={14}/> PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {visibleEmployees.length === 0 && (
              <div className="py-12 text-center text-slate-400 font-medium text-sm">
                Nenhum colaborador encontrado para o mês {currentMonth}.
              </div>
            )}
          </div>
        </SolidCard>
      ) : (
        <MonthGridView 
          employee={visibleEmployees[0]} 
          tracks={byEmpMap[visibleEmployees[0].id] || []} 
          month={currentMonth} 
          company={companyData} 
          holidays={holidaysData as any[]} 
          teamSchedules={teamSchedulesData?.withSchedule || []}
          canManage={canManage}
          canApprove={canApprove}
          onEdit={(t) => { setEditingTrack(t); setIsManualModalOpen(true); }}
          onDelete={onDelete}
          onApprove={(id, app) => approveMut.mutate({ id, approved: app })}
        />
      )}

      {isManualModalOpen && (
        <TimeTrackModal 
          track={editingTrack}
          employees={employees}
          defaultEmpId={selectedEmployeeId !== 'all' ? selectedEmployeeId : ''}
          canManage={canManage}
          onClose={() => { setIsManualModalOpen(false); setEditingTrack(null); }}
          onDone={() => { setIsManualModalOpen(false); setEditingTrack(null); refetchTracks(); }}
        />
      )}
    </div>
  );
}

function MonthGridView({ employee, tracks, month, company, holidays, teamSchedules, canManage, canApprove, onEdit, onDelete, onApprove }: any) {
  const grid = useMemo(() => buildGrid(month, employee, tracks, company?.payrollStartDay || 1, holidays, teamSchedules), [month, employee, tracks, company, holidays, teamSchedules]);
  const { worked, saldo } = useMemo(() => getEffectiveStatsFromGrid(grid), [grid]);
  
  const restDays = grid.filter((g: any) => g.isRest).length;
  const batidas = grid.filter((g: any) => g.track && !g.isRest).length;
  const pendentes = grid.filter((g: any) => !g.isRest && !g.isFuture && !g.track).length;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-stat">
          <p className="card-stat-label">Trabalhado</p>
          <p className="card-stat-value text-slate-800 font-mono">{fmtWorked(worked)}</p>
        </div>
        <div className="card-stat">
          <p className="card-stat-label">Saldo (Banco)</p>
          <p className={`card-stat-value font-mono ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBalance(saldo)}</p>
        </div>
        <div className="card-stat">
          <p className="card-stat-label">Dias Restantes</p>
          <p className="card-stat-value text-slate-600">{grid.filter((g: any) => g.isFuture && !g.isRest).length} dias</p>
        </div>
        <div className="card-stat">
          <p className="card-stat-label">Pendências</p>
          <p className="card-stat-value text-amber-600">{pendentes} ausências</p>
        </div>
      </div>

      <SolidCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 w-[12%]">DATA</th>
                <th className="px-4 py-3 w-[9%] text-center">ENTRADA</th>
                <th className="px-4 py-3 w-[11%] text-center">ALMOÇO</th>
                <th className="px-4 py-3 w-[9%] text-center">SAÍDA</th>
                <th className="px-4 py-3 w-[9%] text-center">TRAB</th>
                <th className="px-4 py-3 w-[9%] text-center">SALDO</th>
                <th className="px-4 py-3 w-[12%] text-center">STATUS</th>
                <th className="px-4 py-3 w-[20%] text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {grid.map((day: any) => {
                const t = day.track;
                let bg = '';
                if (day.isRest) bg = 'bg-slate-50/50';
                else if (day.isFuture) bg = 'bg-white opacity-60';
                else if (!t && !day.antesAdmissao && !day.depoisDemissao) bg = 'bg-rose-50/30';
                
                let status = '';
                if (t) status = dayStatus(t, day.holidayName);
                else if (day.dayType === 'ATESTADO' || day.dayType === 'ATESTADO_HORAS') status = 'ATESTADO';
                else if (day.dayType === 'FERIADO' || day.dayType === 'FERIADO_LOCAL') status = 'FERIADO';
                else if (day.dayType === 'SUSPENSAO') status = 'SUSPENSÃO';
                else if (day.dayType === 'FOLGA' || day.dayType === 'FOLGA_DSR' || day.dayType === 'FOLGA_BANCO') status = 'FOLGA';
                else if (day.antesAdmissao || day.depoisDemissao) status = '---';
                else if (day.isFuture) status = '---';
                else status = 'FALTA';

                const isAtestado = ['ATESTADO','FERIADO','SUSPENSÃO','FOLGA','FOLGA EXTRA','FOLGA BANCO','FOLGA (DSR)','---'].includes(status);

                return (
                  <tr key={day.key} className={`border-t border-slate-100 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors ${bg}`}>
                    <td className="px-4 py-2 text-slate-600 font-bold">
                      <div className="flex flex-col">
                        <span>{fmtDateFull(day.key)}</span>
                        {t?.locationAddress && (
                          <span className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-brand truncate max-w-[120px]" title={t.locationAddress}>
                            <MapPin size={10} /> {t.locationAddress}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 text-center font-mono text-[11px] font-medium ${isAtestado?'text-slate-300':t?.entry?'text-slate-900':day.scheduled?.entry?'text-slate-400':'text-slate-300'}`}>{isAtestado?'---':t?.entry?fmtTime(t.entry):(day.scheduled?.entry ? fmtTime(day.scheduled.entry) : '--:--')}</td>
                    <td className={`px-4 text-center font-mono text-[11px] font-medium ${t?.lunchStart||t?.lunchReturn?'text-slate-500':day.scheduled?.lunchStart?'text-slate-400':'text-slate-300'}`}>{isAtestado?'---':t?.lunchStart?fmtLunch(t?.lunchStart,t?.lunchReturn):(day.scheduled?.lunchStart ? fmtLunch(day.scheduled.lunchStart, day.scheduled.lunchReturn) : '--:--')}</td>
                    <td className={`px-4 text-center font-mono text-[11px] font-medium ${isAtestado?'text-slate-300':t?.exit?'text-slate-900':day.scheduled?.exit?'text-slate-400':'text-slate-300'}`}>{isAtestado?'---':t?.exit?fmtTime(t.exit):(day.scheduled?.exit ? fmtTime(day.scheduled.exit) : '--:--')}</td>
                    <td className="px-4 text-center text-slate-500 font-medium">{isAtestado?'---':t?fmtWorked(t.totalWorked):'--:--'}</td>
                    <td className={`px-4 text-center font-bold ${isAtestado?'text-slate-300':t&&(t.dailyBalance??0)<0?'text-rose-500':t?'text-emerald-500':'text-slate-300'}`}>{isAtestado?'---':t?fmtBalance(t.dailyBalance):'--:--'}</td>
                    <td className="px-4 text-center">
                      <StatusBadge status={status}/>
                    </td>
                    <td className="px-4">
                      <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                        {!day.isFuture && (
                          <button onClick={() => onEdit(t || { employeeId: employee.id, date: day.key, entry: null, lunchStart: null, lunchReturn: null, exit: null } as any)} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            <Edit3 size={12} />
                          </button>
                        )}
                        {t && canApprove && t.manualStatus === 'pending' && (
                          <button onClick={() => onApprove(t.id, true)} className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                            <CheckCircle size={12} />
                          </button>
                        )}
                        {t && canManage && (
                          <button onClick={() => onDelete(t)} className="p-1.5 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-xs text-slate-500 font-medium flex gap-4">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-emerald-500"></span> Batida Normal</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-amber-500"></span> Pendente Ajuste</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-rose-500"></span> Falta / Atraso</div>
        </div>
      </SolidCard>
    </div>
  );
}

function TimeTrackModal({ track, employees, onClose, onDone, defaultEmpId, canManage }: any) {
  const initDate = track?.date ? toDateKey(track.date) : getLocalToday();
  const [date, setDate] = useState(initDate);
  const [empId, setEmpId] = useState(track ? track.employeeId : defaultEmpId || '');
  const [reason, setReason] = useState<TimeTrackAdjustmentReason>('ajuste_erro_marcacao');
  const [entry, setEntry] = useState(track?.entry ? fmtTime(track.entry) : '');
  const [lunchS, setLunchS] = useState(track?.lunchStart ? fmtTime(track.lunchStart) : '');
  const [lunchR, setLunchR] = useState(track?.lunchReturn ? fmtTime(track.lunchReturn) : '');
  const [exit, setExit] = useState(track?.exit ? fmtTime(track.exit) : '');
  const [detail, setDetail] = useState(track?.observation ?? '');
  
  const selReason = REASONS.find((r) => r.value === reason);
  const fullDay = Boolean(selReason?.fullDay);

  function toIso(date: string, time: string) {
    if (!date || !time || time === '--:--') return null;
    const [y,m,d] = date.split('-').map(Number);
    const [hh,mm] = time.split(':').map(Number);
    return new Date(y,m-1,d,hh,mm,0,0).toISOString();
  }

  const save = useMutation(async () => {
    const payload = {
      entry: toIso(date, entry),
      lunchStart: toIso(date, lunchS),
      lunchReturn: toIso(date, lunchR),
      exit: toIso(date, exit),
      reason,
      observation: detail,
    };

    if (track?.id && canManage) {
      await api.timeTrack.update(track.id, payload);
      return;
    }

    await api.timeTrack.manual({ employeeId: empId, date, ...payload });
  }, { onSuccess: () => { toast.success('Ponto salvo com sucesso'); onDone(); } });

  const ok = Boolean(empId && date && (fullDay || entry || lunchS || lunchR || exit));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-800">{track?.id ? 'Editar Ponto' : 'Lançar Ponto Manual'}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"><X size={20}/></button>
        </div>
        
        {save.error && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 border border-rose-100">{save.error}</p>}
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Colaborador</label>
            <select disabled={!!track?.id} value={empId} onChange={e=>setEmpId(e.target.value)} className="form-control">
              <option value="">Selecione...</option>
              {employees.map((e: any)=><option key={e.id} value={e.id}>[{e.registration || e.id.slice(0,8).toUpperCase()}] {normalizeDisplayName(e.name)}</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
              <input disabled={!!track?.id} type="date" value={date} onChange={e=>setDate(e.target.value)} className="form-control" />
            </div>
            {(!track?.id || !canManage) && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Motivo</label>
                <select value={reason} onChange={e=>setReason(e.target.value as any)} className="form-control">
                  {REASONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {!fullDay && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Entrada</label>
                <input type="time" value={entry} onChange={e=>setEntry(e.target.value)} className="form-control bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Saída</label>
                <input type="time" value={exit} onChange={e=>setExit(e.target.value)} className="form-control bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Saída Almoço</label>
                <input type="time" value={lunchS} onChange={e=>setLunchS(e.target.value)} className="form-control bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Retorno Almoço</label>
                <input type="time" value={lunchR} onChange={e=>setLunchR(e.target.value)} className="form-control bg-white" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Observação</label>
            <input value={detail} onChange={e=>setDetail(e.target.value)} className="form-control" placeholder="Motivo do ajuste..." />
          </div>
        </div>
        
        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={()=>ok && save.mutate().catch(()=>{})} disabled={!ok || save.loading} className="btn-nubank">
            {save.loading ? 'Salvando...' : 'Salvar Registro'}
          </button>
        </div>
      </div>
    </div>
  );
}
