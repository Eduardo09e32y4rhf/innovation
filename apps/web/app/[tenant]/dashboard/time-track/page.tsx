'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Check, Edit3, MapPin, Printer, Shield, Save, X, RefreshCw, FileText, Download, 
  Trash2, Filter, AlertTriangle, FileSpreadsheet, Send, Search, Image as ImageIcon, CalendarDays, Clock3, XCircle 
} from 'lucide-react';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Employee, type TimeTrack, type TimeTrackAdjustmentReason } from '@/app/lib/api';
import { formatMinutes } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { buildPdfShell, section, infoGrid, pdfTable, signatureBlock, printPdf, type PdfCompanyInfo } from '@/app/lib/pdf-utils';

const WEEKDAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

const REASONS: { value: TimeTrackAdjustmentReason; label: string; fullDay?: boolean }[] = [
  { value:'ajuste_erro_marcacao', label:'AJUSTE - ERRO MARCAÇÃO', fullDay:false },
  { value:'ajuste_atestado_integral', label:'ATESTADO INTEGRAL', fullDay:true },
  { value:'ajuste_feriado', label:'FERIADO', fullDay:true },
  { value:'ajuste_abono_atestado_horas', label:'ABONO - ATESTADO DE HORAS', fullDay:true },
  { value:'ajuste_folga_dsr', label:'FOLGA', fullDay:true },
  { value:'ajuste_abono_folga', label:'ABONO - FOLGA (BANCO)', fullDay:true },
  { value:'ajuste_abono_banco_saida_antecipada', label:'ABONO - BANCO SAÍDA ANTECIPADA', fullDay:true },
  { value:'ajuste_abono_atraso', label:'ABONO - ATRASO', fullDay:true },
  { value:'ajuste_suspensao', label:'SUSPENSÃO', fullDay:true },
];

function getLocalToday() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function currentMonth() { return getLocalToday().slice(0,7); }
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
function sumMin(rows: Array<Pick<TimeTrack, 'totalWorked' | 'dailyBalance'>>, key: 'totalWorked' | 'dailyBalance') {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

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

function daysInMonth(y: number, m: number) { return new Date(Date.UTC(y,m+1,0)).getUTCDate(); }
function defaultDaysOff(scale?: string | null) {
  if (scale==='5X2') return [0,6];
  if (scale==='6X1') return [0];
  return [];
}
function defaultCycle(scale?: string | null) {
  if (scale==='6X1') return {workDays:6,offDays:1};
  if (scale==='5X2') return {workDays:5,offDays:2};
  if (scale==='12X36') return {workDays:1,offDays:1};
  if (scale==='4X2') return {workDays:4,offDays:2};
  return {workDays:6,offDays:1};
}

function isRestDay(date: Date, emp: Employee): boolean {
  const wd = date.getUTCDay();
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

function buildGrid(month: string, emp: Employee, tracks: TimeTrack[], startDay: number = 1, holidays: any[] = []) {
  const safeHolidays = holidays || [];
  const [y,m] = month.split('-').map(Number); if (!y||!m) return [];
  const today = getLocalToday();
  const map = new Map<string, TimeTrack>();
  for (const t of tracks) map.set(toDateKey(t.date), t);
  const g: any[] = [];
  
  let startDate = new Date(Date.UTC(y, m - 1, 1));
  let endDate = new Date(Date.UTC(y, m, 0)); // last day of month

  if (startDay > 1) {
    startDate = new Date(Date.UTC(y, m - 2, startDay)); // Previous month, startDay
    const nextMonth = new Date(Date.UTC(y, m - 1, startDay));
    endDate = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000); // One day before next month startDay
  }

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = new Date(d);
    const key = date.toISOString().slice(0,10);
    const holiday = safeHolidays.find(h => h.date && h.date.startsWith(key));
    const isHoliday = !!holiday;
    g.push({
      date, key, day: date.getUTCDate(), wd: date.getUTCDay(),
      isRest: isRestDay(date,emp), isFuture: key>today, antesAdmissao: isAntesAdmissao(key,emp), depoisDemissao: isDepoisDemissao(key,emp),
      track: map.get(key), holidayName: holiday?.name
    });
  }
  return g;
}
function dayStatus(row: TimeTrack, holidayName?: string) {
  if (row.manualStatus==='revoked') return 'REVOGADO';
  const o = (row.observation ?? '').toLowerCase();
  if (o.includes('atestado integral')) return 'ATESTADO';
  if (o.includes('atestado') && o.includes('horas')) return 'ATESTADO (HORAS)';
  if (o.includes('suspensao') || o.includes('suspensão')) return 'SUSPENSÃO';
  if (o.includes('feriado') || holidayName) return 'FERIADO';
  if (o.includes('folga extra')) return 'FOLGA EXTRA';
  if (o.includes('folga banco')) return 'FOLGA BANCO';
  if (o.includes('folga')) return 'FOLGA';
  const r = (row.manualReason ?? '').toLowerCase();
  if (r.includes('atestado integral')) return 'ATESTADO';
  if (r.includes('feriado')) return 'FERIADO';
  if (r.includes('folga dsr')) return 'FOLGA';
  if (row.incidentType === 'atraso') return 'ATRASO';
  if (row.incidentType === 'saida_antecipada') return 'saída ANTECIPADA';
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

function isOcorrencia(row: TimeTrack) {
  const o = (row.observation ?? '').toLowerCase();
  const r = (row.manualReason ?? '').toLowerCase();
  
  if (o.includes('abonado') || r.includes('abonado')) return false;
  if (o.includes('atestado') || r.includes('atestado')) return false;
  if (o.includes('feriado') || r.includes('feriado')) return false;
  if (o.includes('folga') || r.includes('folga')) return false;

  if (isFalta(row)) return true;
  if (row.incidentType === 'atraso') return true;
  if (row.incidentType === 'saida_antecipada') return true;
  if (o.includes('suspensao') || o.includes('suspensão') || r.includes('suspensao') || r.includes('suspensão')) return true;
  if (row.dailyBalance != null && row.dailyBalance < 0) return true;
  
  return false;
}

function getEffectiveStats(rows: TimeTrack[]) {
  let worked = 0;
  let saldo = 0;
  let extra = 0;
  let missing = 0;
  for (const r of rows) {
    let dailyTotal = r.totalWorked ?? 0;
    let dailyBal = r.dailyBalance ?? 0;
    let ext = Math.max(dailyBal, 0);
    let mis = Math.abs(Math.min(dailyBal, 0));
    if ((r as any).overtimeApprovalStatus === 'PENDING' || (r as any).overtimeApprovalStatus === 'REJECTED') {
      if (ext > 0) {
        dailyTotal -= ext;
        dailyBal -= ext;
        ext = 0;
      }
    }
    worked += dailyTotal;
    saldo += dailyBal;
    extra += ext;
    missing += mis;
  }
  return { worked, saldo, extra, missing };
}

export default function TimeTrackPage() {
  const params = useParams();
  const tenant = params?.tenant as string;

  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canManage = profile==='DEV'||profile==='ADMIN'||profile==='RH';
  const canApprove = canManage || profile==='GESTOR';
  const isFunc = profile==='FUNCIONARIO';
  const isGestor = profile==='GESTOR';

  const searchParams = useSearchParams();
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth());
  const tracks = useQuery(() => api.timeTrack.list(month), [month]);
  const employees = useQuery(() => api.employees.list(), []);
  const company = useQuery(() => api.companies.me(), []);
  const holidays = useQuery(() => api.companies.getHolidays(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TimeTrack | null>(null);
  const [empFilter, setEmpFilter] = useState(searchParams.get('employeeId') ?? '');
  const [deptFilter, setDeptFilter] = useState('');
  const [tab, setTab] = useState<'ponto'|'ocorrencias'>('ponto');

  useEffect(() => {
    const q = searchParams.get('employeeId');
    if (q) setEmpFilter(q);
  }, [searchParams]);

  const actives = useMemo(() => (employees.data ?? []).filter(e=>e.status==='ACTIVE' && (profile === 'DEV' || e.user?.role !== 'DEV')).slice().sort((a,b)=>normalizeDisplayName(a.name).localeCompare(normalizeDisplayName(b.name),'pt-BR')), [employees.data, profile]);
  const depts = useMemo(() => [...new Set((employees.data ?? []).map(e=>e.department).filter(Boolean))].sort(), [employees.data]);
  const selected = isFunc ? actives[0] : (employees.data ?? []).find(e=>e.id===empFilter);
  const byEmp = useMemo(() => (tracks.data ?? []).filter(r => {
    if (empFilter && r.employeeId!==empFilter) return false;
    if (month && !toDateKey(r.date).startsWith(month)) return false;
    if (deptFilter && r.employee?.department!==deptFilter) return false;
    return true;
  }).slice().sort((a,b)=> toDateKey(a.date).localeCompare(toDateKey(b.date))), [tracks.data, empFilter, month, deptFilter]);
  const byEmpMap: Record<string, TimeTrack[]> = {};
  for (const r of byEmp) {
    if (!byEmpMap[r.employeeId]) byEmpMap[r.employeeId] = [];
    byEmpMap[r.employeeId].push(r);
  }
  const visible = useMemo(() => (employees.data ?? []).filter(e => {
    if (profile !== 'DEV' && e.user?.role === 'DEV') return false;
    if (empFilter && e.id!==empFilter) return false;
    if (deptFilter && e.department!==deptFilter) return false;
    
    if (month) {
      const [y,m] = month.split('-').map(Number);
      const startOfMonth = `${y}-${String(m).padStart(2,'0')}-01`;
      const endOfMonth = new Date(y, m, 0).toISOString().slice(0,10);
      if (e.admissionDate && e.admissionDate.slice(0,10) > endOfMonth) return false;
      if (e.terminationDate && e.terminationDate.slice(0,10) < startOfMonth) return false;
    } else if (e.status !== 'ACTIVE') {
      return false;
    }
    return true;
  }).sort((a,b)=>normalizeDisplayName(a.name).localeCompare(normalizeDisplayName(b.name),'pt-BR')), [employees.data, empFilter, deptFilter, month]);

  const remove = useMutation((id:string)=> api.timeTrack.delete(id), { onSuccess: ()=> tracks.refetch() });
  const pending = useQuery(() => api.timeTrack.listPending(), [], { enabled: canApprove });
  const approveMut = useMutation((p:{id:string;approved:boolean})=> api.timeTrack.approve(p.id, p.approved), { onSuccess:()=>{ pending.refetch(); tracks.refetch(); }});

  const onDelete = async (r: TimeTrack) => {
    if (!window.confirm(`Excluir ponto de ${normalizeDisplayName(r.employee?.name ??'-')} em ${fmtDateFull(r.date)}?`)) return;
    await remove.mutate(r.id).catch(()=>{});
  };

  const initialLoading = tracks.loading && !tracks.data;
  const refreshing = tracks.loading && !!tracks.data;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">CONTROLE DE PONTO</p>
          <h2 className="text-2xl font-black text-slate-950">{isFunc?'MEU PONTO':isGestor?'PONTO DA EQUIPE':'FOLHA DE PONTO'}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${tenant}/dashboard/time-track/clock-in`} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"><Clock3 size={14}/> BATER PONTO</Link>
          {(canManage||isGestor) && <button onClick={() => downloadCollectiveSheet(month, visible, byEmpMap, company.data || null, holidays.data || [])} disabled={refreshing || visible.length === 0} className="btn-outline-premium inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black"><FileText size={14}/> FOLHAS DE PONTO</button>}
          {canManage && <button onClick={()=>setOpen(true)} disabled={refreshing} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"><Edit3 size={14}/> LANÇAR PONTO</button>}
        </div>
      </header>

      {canApprove && (pending.data ?? []).length > 0 && (
        <section className="rounded-[12px] border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-3 text-sm font-black text-amber-900">PONTOS PENDENTES DE APROVAÇÃO ({(pending.data ?? []).length})</h3>
          {approveMut.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{approveMut.error}</p>}
          <div className="space-y-2">{(pending.data ?? []).map(t=> (
            <div key={t.id} className="flex items-center justify-between rounded-[8px] border border-amber-200 bg-white px-4 py-3">
              <div className="text-xs">
                  <p className="font-black text-slate-950">{normalizeDisplayName(t.employee?.name ??'-')}</p>
                  <p className="text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="font-semibold">{fmtDateFull(t.date)}</span>
                    <span className="inline-flex items-center rounded-sm bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-600">{REASONS.find(r => r.value === t.manualReason)?.label || t.manualReason || 'AJUSTE MANUAL'}</span>
                  </p>
                </div>
              <div className="flex gap-2">
                <button onClick={()=>approveMut.mutate({id:t.id,approved:true}).catch(()=>{})} disabled={approveMut.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-60"><Check size={12}/>APROVAR</button>
                <button onClick={()=>approveMut.mutate({id:t.id,approved:false}).catch(()=>{})} disabled={approveMut.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-rose-600 px-3 text-[11px] font-bold text-white disabled:opacity-60"><XCircle size={12}/>RECUSAR</button>
              </div>
            </div>
          ))}</div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-[8px] bg-slate-100 p-1">
          <button onClick={()=>setTab('ponto')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab==='ponto'?'bg-white shadow-sm text-teal-700':'text-slate-500'}`}>Ponto</button>
          <button onClick={()=>setTab('ocorrencias')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab==='ocorrencias'?'bg-white shadow-sm text-teal-700':'text-slate-500'}`}>Ocorrências</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isFunc && (
            <select value={empFilter} onChange={e=>setEmpFilter(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
              <option value="">TODOS</option>{actives.map(e=><option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
            </select>
          )}
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="h-9 w-36 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500" />
          {!isFunc && (
            <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
              <option value="">DEPTO</option>{depts.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
      </div>

      {remove.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{remove.error}</p>}
      {refreshing && <p className="rounded-[8px] border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700">Atualizando...</p>}

      {initialLoading ? <LoadingState label="Carregando folha de ponto..."/> :
       tracks.error && !tracks.data ? <ErrorState message={tracks.error} onRetry={tracks.refetch}/> :
       (empFilter || isFunc) && selected ? (
        <div>
          {tab === 'ponto' ? (
            <MonthGrid employee={selected} tracks={(byEmpMap[selected.id] ?? [])} month={month} canManage={canManage} canApprove={canApprove} refreshing={refreshing} removeLoading={remove.loading} onEdit={setEditing} onDelete={onDelete} showActions company={company.data} />
          ) : (
            <Ocorrencias employee={selected} tracks={(byEmpMap[selected.id] ?? [])} month={month} canManage={canManage} canApprove={canApprove} refreshing={refreshing} removeLoading={remove.loading} onEdit={setEditing} onDelete={onDelete} company={company.data} holidays={holidays.data as any[]} />
          )}
        </div>
      ) : visible.length===0 ? <p className="text-center text-sm text-slate-400 py-8">Nenhum colaborador encontrado.</p> :
        tab === 'ponto' ? (
          <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4"><h3 className="text-sm font-black text-slate-950">COLABORADORES</h3><p className="mt-1 text-xs text-slate-500">Selecione para abrir a folha mensal.</p></div>
            <div className="divide-y divide-slate-100">
              {visible.map(emp=>{
                const rows = byEmpMap[emp.id] ?? [];
                const { worked, saldo } = getEffectiveStats(rows);
                const faltas = rows.filter(isFalta).length;
                return (
                  <div key={emp.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white">{normalizeDisplayName(emp.name).charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700">{emp.registration || emp.id.slice(0,8).toUpperCase()}</span><p className="text-sm font-black text-slate-950">{normalizeDisplayName(emp.name)}</p></div>
                        <p className="mt-1 text-[10px] font-semibold text-slate-500">{emp.department || '-'} {faltas>0 && <span className="text-rose-600 ml-2">{faltas} FALTA(S)</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2 text-[10px] font-bold">
                        <div className="rounded-[6px] border border-slate-200 px-2 py-1"><span className="block text-[8px] uppercase text-slate-400">TRAB</span><span>{fmtWorked(worked)}</span></div>
                        <div className={`rounded-[6px] border px-2 py-1 ${saldo>=0?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-rose-200 bg-rose-50 text-rose-700'}`}><span className="block text-[8px] uppercase text-slate-400">SALDO</span><span className="font-black">{fmtBalance(saldo)}</span></div>
                      </div>
                      <button onClick={()=>router.push(`/${tenant}/dashboard/time-track?employeeId=${emp.id}`)} className="btn-outline-premium inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[10px] font-black"><CalendarDays size={12}/> ABRIR</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <OcorrenciasList employees={visible} byEmpMap={byEmpMap} month={month} onSelect={setEmpFilter} />
        )}

      {(open || editing) && <Modal employees={actives} track={editing ?? undefined} defaultEmpId={empFilter} onClose={()=>{setOpen(false);setEditing(null);}} onDone={()=>{setOpen(false);setEditing(null);tracks.refetch();}} />}
    </div>
  );
}

// --- FOLHA DE PONTO ---

function monthLabelFn(month: string) {
  if (!month) return 'Período completo';
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  const date = new Date(year, monthNumber - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&', '<': '<', '>': '>', '"': '"' })[char] ?? char);
}

function downloadCollectiveSheet(month: string, visibleEmployees: Employee[], byEmpMap: Record<string, TimeTrack[]>, companyData: any, holidaysData: any[]) {
  const subtitle = monthLabelFn(month);
  
  const blocks = visibleEmployees.map((employee, index) => {
    const rows = byEmpMap[employee.id] || [];
    const grid = buildGrid(month, employee, rows, companyData?.payrollStartDay || 1, holidaysData);

    const validTracks = grid.map(g => g.track).filter(Boolean) as TimeTrack[];
    
    const { worked: totalWorked, saldo: totalBalance, extra: positiveBalance, missing: negativeBalance } = getEffectiveStats(validTracks);
    
    let faltasCount = 0;
    let dsrLost = 0;
    let currentWeekFaltas = 0;
    grid.forEach(g => {
      if (g.wd === 1) currentWeekFaltas = 0; // Reset on Monday
      const t = g.track;
      const isFaltaDay = t ? isFalta(t) : (!g.isRest && !g.isFuture && !g.antesAdmissao && !g.depoisDemissao);
      if (isFaltaDay) {
        faltasCount++;
        if (g.wd !== 0) currentWeekFaltas++;
      }
      if (g.wd === 0 && currentWeekFaltas > 0) {
        dsrLost++; // Lost Sunday DSR
      }
    });

    const totalFaltas = faltasCount + dsrLost;

    const employeeInfo = [
      { label: 'Nome', value: normalizeDisplayName(employee.name) },
      { label: 'Matrícula', value: employee.registration || '-' },
      { label: 'CPF', value: employee.cpf || '-' },
      { label: 'Cargo', value: employee.position || '-' },
      { label: 'Departamento', value: employee.department || '-' },
      { label: 'Admissao', value: employee.admissionDate ? employee.admissionDate.slice(0,10).split('-').reverse().join('/') : '-' },
      { label: 'Periodo', value: subtitle },
    ];

    const tableHeaders = ['Data', 'Entrada', 'Saida Almoco', 'Retorno Almoco', 'Saida', 'Trabalhado', 'Saldo', 'Ocorrencia', 'Assinatura Diaria'];
    const tableRows = grid.map((g) => {
      const wd = WEEKDAYS[g.wd];
      const dateStr = `${String(g.day).padStart(2,'0')} - ${wd}`;

      if (g.isFuture) {
        return `<tr><td style="padding:4px 8px;font-size:8px;color:#cbd5e1;">${dateStr}</td><td colspan="8" style="padding:4px 8px;font-size:8px;color:#cbd5e1;text-align:center;">-</td></tr>`;
      }
      if (g.antesAdmissao || g.depoisDemissao) {
        return `<tr><td style="padding:4px 8px;font-size:8px;color:#94a3b8;">${dateStr}</td><td colspan="8" style="padding:4px 8px;font-size:8px;color:#94a3b8;text-align:center;">${g.antesAdmissao ? 'ANTES DA ADMISSAO' : 'APOS DEMISSAO'}</td></tr>`;
      }

      const t = g.track;
      if (!t) {
        if (g.isRest) return `<tr><td style="padding:4px 8px;font-size:8px;color:#64748b;">${dateStr}</td><td colspan="8" style="padding:4px 8px;font-size:8px;color:#64748b;text-align:center;font-weight:700;">DSR / FOLGA</td></tr>`;
        return `<tr><td style="padding:4px 8px;font-size:8px;color:#e11d48;font-weight:600;">${dateStr}</td><td colspan="8" style="padding:4px 8px;font-size:8px;color:#e11d48;text-align:center;font-weight:700;">FALTA NAO JUSTIFICADA</td></tr>`;
      }

      const balance = t.dailyBalance ?? 0;
      const balanceColor = balance < 0 ? '#e11d48' : balance > 0 ? '#059669' : '#64748b';
      const hasMissing = !t.entry || !t.exit;
      let ocorrencia = dayStatus(t, g.holidayName);
      if (ocorrencia === 'NORMAL') {
        if (isFalta(t)) ocorrencia = 'FALTA NAO JUSTIFICADA';
        else if (hasMissing) ocorrencia = 'FALTA DE MARCACAO';
      }
      
      return `<tr>
        <td style="padding:4px 8px;font-size:8px;font-weight:600;color:#0f172a;">${dateStr}</td>
        <td style="padding:4px 8px;font-size:8px;color:#334155;text-align:center;">${escapeHtml(fmtTime(t.entry))}</td>
        <td style="padding:4px 8px;font-size:8px;color:#94a3b8;text-align:center;">${t.lunchStart ? escapeHtml(fmtTime(t.lunchStart)) : '--:--'}</td>
        <td style="padding:4px 8px;font-size:8px;color:#94a3b8;text-align:center;">${t.lunchReturn ? escapeHtml(fmtTime(t.lunchReturn)) : '--:--'}</td>
        <td style="padding:4px 8px;font-size:8px;color:#334155;text-align:center;">${escapeHtml(fmtTime(t.exit))}</td>
        <td style="padding:4px 8px;font-size:8px;font-weight:700;color:#0f172a;text-align:center;">${escapeHtml(formatMinutes(t.totalWorked))}</td>
        <td style="padding:4px 8px;font-size:8px;font-weight:700;color:${balanceColor};text-align:center;">${escapeHtml(formatMinutes(balance))}</td>
        <td style="padding:4px 8px;font-size:7px;color:#64748b;">${escapeHtml(ocorrencia !== 'NORMAL' ? ocorrencia : '')}</td>
        <td style="padding:4px 8px;font-size:8px;color:#cbd5e1;border-bottom:1px dashed #e2e8f0;"></td>
      </tr>`;
    });

    const empHtml = `
      ${section('Dados do Colaborador', infoGrid(employeeInfo, 4))}
      ${section('Registros de Ponto Diario', pdfTable(tableHeaders, tableRows, { compact: true }))}
      ${section('Resumo do Periodo', `
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">
          <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:8px;font-weight:800;text-transform:uppercase;color:#0f766e;letter-spacing:0.05em;">Dias Trabalhados</div>
            <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${validTracks.filter(t => t.incidentType !== 'falta' && (t.totalWorked || 0) > 0).length}</div>
          </div>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:8px;font-weight:800;text-transform:uppercase;color:#e11d48;letter-spacing:0.05em;">Faltas Integrais</div>
            <div style="font-size:16px;font-weight:900;color:#e11d48;margin-top:4px;">${faltasCount}</div>
            ${dsrLost > 0 ? `<div style="font-size:8px;font-weight:700;color:#9f1239;margin-top:2px;">(+${dsrLost} DSR)</div>` : ''}
          </div>
          <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:8px;font-weight:800;text-transform:uppercase;color:#0f766e;letter-spacing:0.05em;">Total Horas</div>
            <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${escapeHtml(formatMinutes(totalWorked))}</div>
          </div>
          <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:8px;font-weight:800;text-transform:uppercase;color:#0f766e;letter-spacing:0.05em;">Horas Extras</div>
            <div style="font-size:16px;font-weight:900;color:#059669;margin-top:4px;">${escapeHtml(formatMinutes(positiveBalance))}</div>
          </div>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:8px;font-weight:800;text-transform:uppercase;color:#e11d48;letter-spacing:0.05em;">Horas Atraso</div>
            <div style="font-size:16px;font-weight:900;color:#e11d48;margin-top:4px;">${escapeHtml(formatMinutes(negativeBalance))}</div>
          </div>
        </div>
        <div style="margin-top:16px;background:#f8fafc;padding:16px;border-radius:8px;font-size:12px;color:#334155;font-weight:700;text-align:center;border:1px solid #e2e8f0;">
          SALDO DO BANCO DE HORAS NESTE MES: <span style="font-weight:900;color:${totalBalance < 0 ? '#e11d48' : totalBalance > 0 ? '#059669' : '#64748b'};">
            ${escapeHtml(formatMinutes(totalBalance))}
          </span>
        </div>
      `)}
      ${signatureBlock(['Assinatura do Colaborador', 'Assinatura do RH / Responsavel'])}
    `;

    return empHtml + (index < visibleEmployees.length - 1 ? '<div style="page-break-after: always;"></div>' : '');
  }).join('');

  const pdfCompanyData: PdfCompanyInfo | null = companyData ? {
    name: companyData.name,
    legalName: companyData.legalName,
    document: companyData.cnpj,
    logoUrl: companyData.logoUrl,
    phone: companyData.phone,
    email: companyData.email,
    address: [companyData.street, companyData.streetNumber, companyData.neighborhood, companyData.city, companyData.state, companyData.cep].filter(Boolean).map(String).join(', ') || undefined
  } : null;

  const html = buildPdfShell({ title: 'FOLHA DE PONTO', subtitle, landscape: false }, pdfCompanyData, blocks);
  printPdf(html, `folha-coletiva-${month}.pdf`);
}

function OcorrenciasList({ employees, byEmpMap, month, onSelect }: { employees: Employee[]; byEmpMap: Record<string,TimeTrack[]>; month: string; onSelect: (id:string)=>void }) {
  const withIssues = employees.filter(e => (byEmpMap[e.id] ?? []).some(t => isOcorrencia(t)));
  if (withIssues.length===0) return <p className="text-center text-sm font-semibold text-slate-400 py-8">Nenhuma ocorrencia no mes.</p>;
  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-amber-50/50 px-5 py-4"><h3 className="text-sm font-black text-amber-900">OCORRENCIAS DO MES</h3><p className="mt-1 text-xs text-amber-700">Atrasos, faltas e saídas antecipadas.</p></div>
      <div className="divide-y divide-slate-100">
        {withIssues.map(e=> {
          const rows = byEmpMap[e.id] ?? [];
          const ocorrenciasCount = rows.filter(t => isOcorrencia(t)).length;
          return (
            <div key={e.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-rose-500 to-pink-600 text-sm font-black text-white">{normalizeDisplayName(e.name).charAt(0).toUpperCase()}</div>
                <div>
                  <p className="text-sm font-black text-slate-950">{normalizeDisplayName(e.name)}</p>
                  <p className="text-[10px] font-semibold text-rose-600">{ocorrenciasCount} OCORRÃNCIA(S) -¢ {e.department || '-'}</p>
                </div>
              </div>
              <button onClick={()=>onSelect(e.id)} className="btn-outline inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[10px] font-black"><CalendarDays size={12}/> VER</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MonthGrid({ employee, tracks, month, canManage, canApprove, refreshing, removeLoading, onEdit, onDelete, showActions, company }: { employee: Employee; tracks: TimeTrack[]; month: string; canManage: boolean; canApprove: boolean; refreshing: boolean; removeLoading: boolean; onEdit: (r:TimeTrack)=>void; onDelete: (r:TimeTrack)=>void; showActions?: boolean; company?: any }) {
  const grid = useMemo(()=> buildGrid(month, employee, tracks, company?.payrollStartDay || 1), [month, employee, tracks, company]);
  const worked = sumMin(tracks,'totalWorked');
  const saldo = sumMin(tracks,'dailyBalance');
  const restDays = grid.filter(g=>g.isRest).length;
  const batidas = grid.filter(g=>g.track && !g.isRest).length;
  const pendentes = grid.filter(g=>!g.isRest && !g.isFuture && !g.track).length;

  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white">{normalizeDisplayName(employee.name).charAt(0).toUpperCase()}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700">{employee.registration || employee.id.slice(0,8).toUpperCase()}</span>
                <h3 className="text-sm font-black text-slate-950">{normalizeDisplayName(employee.name)}</h3>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span>{employee.department||'-'}</span><span className="text-slate-300">|</span>
                <span>{employee.position||'-'}</span><span className="text-slate-300">|</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px]">ESCALA: {employee.workScale || (employee.customWorkScale || '6X1')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 text-[10px] font-bold">
              <div className="rounded-[6px] border border-slate-200 px-2 py-1"><span className="block text-[8px] uppercase text-slate-400">TRAB</span><span className="font-black">{fmtWorked(worked)}</span></div>
              <div className={`rounded-[6px] border px-2 py-1 ${saldo>=0?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-rose-200 bg-rose-50 text-rose-700'}`}><span className="block text-[8px] uppercase text-slate-400">SALDO</span><span className="font-black">{fmtBalance(saldo)}</span></div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 rounded-[8px] border border-slate-100 bg-slate-50/50 px-3 py-2 text-[10px] font-semibold text-slate-600">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>{batidas} BATIDA(S)</span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-500"/>{restDays} FOLGA(S)</span>
          {pendentes>0 && <><span className="text-slate-300">|</span><span className="flex items-center gap-1 text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"/>{pendentes} PENDENTE(S)</span></>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
              <th className="px-3 py-2 w-[16%] border-b border-slate-200">DATA</th>
              <th className="px-3 py-2 w-[9%] border-b border-slate-200">ENTRADA</th>
              <th className="px-3 py-2 w-[11%] border-b border-slate-200">ALMOÃO</th>
              <th className="px-3 py-2 w-[9%] border-b border-slate-200">saída</th>
              <th className="px-3 py-2 w-[9%] border-b border-slate-200">TRAB</th>
              <th className="px-3 py-2 w-[9%] border-b border-slate-200">SALDO</th>
              <th className="px-3 py-2 w-[8%] border-b border-slate-200">ABONO</th>
              <th className="px-3 py-2 w-[10%] border-b border-slate-200">STATUS</th>
              <th className="px-3 py-2 w-[19%] border-b border-slate-200 text-center">AÃÃES</th>
            </tr>
          </thead>
          <tbody>
            {grid.map(day => {
              const t = day.track;
              let bg = '';
              if (day.isRest) bg = 'bg-sky-50/30';
              else if (day.isFuture) bg = 'bg-slate-50/40 opacity-70';
              else if (!t && !day.antesAdmissao && !day.depoisDemissao) bg = 'bg-amber-50/20';
              else if (day.antesAdmissao || day.depoisDemissao) bg = 'bg-slate-100/50 opacity-50';
              const status = day.isRest ? 'FOLGA' : (day.antesAdmissao || day.depoisDemissao) ? '---' : t ? dayStatus(t) : day.isFuture ? '---' : 'FALTA';
              const isAtestado = ['ATESTADO','FERIADO','SUSPENSÃO','FOLGA','FOLGA EXTRA','FOLGA BANCO','FOLGA (DSR)','---'].includes(status);

              return (
                <tr key={day.key} className={`h-9 border-t border-slate-100 text-[11px] font-semibold text-slate-700 hover:bg-slate-50/70 ${bg}`}>
                  <td className="px-3 text-slate-500 text-[11px] font-bold">
    <div className="flex flex-col">
      <span>{fmtDateFull(day.key)}</span>
      {t?.locationAddress && (
        <span className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold text-teal-600" title={t.locationAddress}>
          <MapPin size={9} /> <span className="max-w-[80px] truncate">{t.locationAddress}</span>
        </span>
      )}
    </div>
  </td>
              <td className={`px-3 font-mono text-[11px] ${isAtestado?'text-slate-300':t?.entry?'text-slate-950 font-black':'text-slate-300'}`}>{isAtestado?'---':t?.entry?fmtTime(t.entry):'--:--'}</td>
              <td className={`px-3 font-mono text-[11px] ${t?.lunchStart||t?.lunchReturn?'text-slate-600':'text-slate-300'}`}>{isAtestado?'---':t?.lunchStart?fmtLunch(t?.lunchStart,t?.lunchReturn):'--:--'}</td>
              <td className={`px-3 font-mono text-[11px] ${isAtestado?'text-slate-300':t?.exit?'text-slate-950 font-black':'text-slate-300'}`}>{isAtestado?'---':t?.exit?fmtTime(t.exit):'--:--'}</td>
              <td className="px-3 text-slate-600 text-[11px]">{isAtestado?'---':t?fmtWorked(t.totalWorked):'--:--'}</td>
              <td className={`px-3 text-[11px] font-black ${isAtestado?'text-slate-300':t&&(t.dailyBalance??0)<0?'text-rose-600':t?'text-emerald-600':'text-slate-300'}`}>{isAtestado?'---':t?fmtBalance(t.dailyBalance):'--:--'}</td>
                  <td className={`px-3 text-[11px] ${isAtestado?'text-slate-300':'text-slate-400'}`}>{isAtestado?'---':'--:--'}</td>
                  <td className="px-3 text-center">
                    <StatusBadge status={status}/>
                    {t?.observation && <div className="mt-0.5 text-[9px] font-medium text-amber-700 max-w-[120px] truncate mx-auto" title={t.observation}>{t.observation}</div>}
                  </td>
                  <td className="px-3">
                    <div className="flex justify-center gap-1 whitespace-nowrap">
                      {showActions && !day.isRest && !day.isFuture && (
                        <button onClick={()=>onEdit(t||{id:'',employeeId:employee.id,date:day.key,entry:null,lunchStart:null,lunchReturn:null,exit:null,totalWorked:null,dailyBalance:null} as unknown as TimeTrack)} disabled={refreshing||removeLoading} className="btn-outline-premium h-6 px-2 text-[9px] font-bold"><Edit3 size={10}/>{t?'EDITAR':'SOLICITAR'}</button>
                      )}
                      {showActions && t && canApprove && t.manualStatus==='pending' && (
                        <button onClick={()=>onEdit(t)} disabled={refreshing||removeLoading} className="crystal-button h-6 px-2 text-[9px] font-bold"><Check size={10}/>ACEITAR</button>
                      )}
                      {showActions && t && canManage && (
                        <button onClick={()=>onDelete(t)} disabled={refreshing||removeLoading} className="inline-flex h-6 items-center gap-1 rounded-[5px] bg-gradient-to-r from-rose-500 to-pink-600 px-2 text-[9px] font-black text-white"><Edit3 size={10}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5">
        <div className="flex flex-wrap gap-4 text-[9px] font-semibold text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border border-sky-200 bg-sky-50"/> FOLGA</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border border-amber-200 bg-amber-50/40"/> PENDENTE</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border border-slate-200 bg-slate-50/40"/> FUTURO</span>
          <span className="text-slate-400">--:-- SEM REGISTRO</span>
        </div>
      </div>
    </section>
  );
}

function Ocorrencias({ employee, tracks, month, canManage, canApprove, refreshing, removeLoading, onEdit, onDelete, company, holidays }: { employee: Employee; tracks: TimeTrack[]; month: string; canManage: boolean; canApprove: boolean; refreshing: boolean; removeLoading: boolean; onEdit: (r:TimeTrack)=>void; onDelete: (r:TimeTrack)=>void; company: any; holidays: any[]; }) {
  const grid = useMemo(()=> buildGrid(month, employee, tracks, company?.payrollStartDay, holidays), [month, employee, tracks, company, holidays]);
  const ocorrencias = useMemo(()=>grid.filter(g=>{
    if (!g.track) return false;
    return isOcorrencia(g.track);
  }), [grid]);
  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-amber-50/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">{employee.registration || employee.id.slice(0,8)}</span>
          <h3 className="text-sm font-black text-amber-900">{normalizeDisplayName(employee.name)}</h3>
        </div>
        <p className="mt-2 text-xs text-amber-700">{ocorrencias.length} ocorrência(s) em {monthLabelFn(month)}</p>
      </div>
      {ocorrencias.length===0 ? <div className="px-5 py-8 text-center text-sm font-semibold text-slate-400">Nenhuma ocorrência no mês.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <th className="px-3 py-2 w-[20%]">DATA</th><th className="px-3 py-2 w-[15%]">STATUS</th><th className="px-3 py-2 w-[15%]">ENTRADA</th><th className="px-3 py-2 w-[15%]">saída</th><th className="px-3 py-2 w-[35%]">AÃÃES</th>
              </tr>
            </thead>
            <tbody>
              {ocorrencias.map(day=>{
                const t = day.track!;
                return (
                  <tr key={day.key} className="border-t border-slate-100 text-[11px] font-semibold hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500">{fmtDateFull(day.key)}</td>
                    <td className="px-3 py-2 text-slate-300">--:--</td>
                    <td className="px-3 py-2 text-slate-300">--:--</td>
                    <td className="px-3 py-2 text-slate-300">--:--</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={()=>onEdit(t)} disabled={refreshing||removeLoading} className="btn-outline-premium h-6 px-2 text-[10px]"><Edit3 size={10}/>SOLICITAR</button>
                        {canApprove && <button onClick={()=>onEdit(t)} disabled={refreshing||removeLoading} className="crystal-button h-6 px-2 text-[10px]"><Check size={10}/>ACEITAR</button>}
                        {canManage && <button onClick={()=>onDelete(t)} disabled={refreshing||removeLoading} className="inline-flex h-6 items-center gap-1 rounded-[5px] bg-rose-500 px-2 text-[10px] font-black text-white"><Edit3 size={10}/></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
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
    'SUSPENSÃO':'bg-orange-50 text-orange-700 border-orange-200',
    'FOLGA':'bg-sky-50 text-sky-700 border-sky-200',
    'FOLGA (DSR)':'bg-sky-50 text-sky-700 border-sky-200',
    'FOLGA EXTRA':'bg-indigo-50 text-indigo-700 border-indigo-200',
    'FOLGA BANCO':'bg-cyan-50 text-cyan-700 border-cyan-200',
    'AJUSTE MANUAL':'bg-orange-50 text-orange-700 border-orange-200',
    'FALTA':'bg-rose-50 text-rose-700 border-rose-200',
    'ATRASO':'bg-rose-50 text-rose-800 border-rose-300 shadow-sm',
    'saída ANTECIPADA':'bg-rose-50 text-rose-800 border-rose-300 shadow-sm',
  };
  return <span className={`inline-flex items-center rounded-[5px] border px-2 py-0.5 text-[9px] font-black whitespace-nowrap ${c[u]||'bg-slate-100 text-slate-600 border-slate-200'}`}>{u}</span>;
}

function Modal({ employees, track, defaultEmpId, onClose, onDone }: { employees: Employee[]; track?: TimeTrack; defaultEmpId: string; onClose: ()=>void; onDone: ()=>void; }) {
  const initDate = track ? toDateKey(track.date) : getLocalToday();
  const [date, setDate] = useState(initDate);
  const [endDate, setEndDate] = useState('');
  const [empId, setEmpId] = useState(track ? track.employeeId : defaultEmpId || '');
  const [reason, setReason] = useState<TimeTrackAdjustmentReason>('ajuste_erro_marcacao');
  const [entry, setEntry] = useState(track?.entry ? fmtTime(track.entry) : '');
  const [lunchS, setLunchS] = useState(track?.lunchStart ? fmtTime(track.lunchStart) : '');
  const [lunchR, setLunchR] = useState(track?.lunchReturn ? fmtTime(track.lunchReturn) : '');
  const [exit, setExit] = useState(track?.exit ? fmtTime(track.exit) : '');
  const [detail, setDetail] = useState(track?.observation ?? '');
  
  const selReason = REASONS.find((r) => r.value === reason);
  const fullDay = Boolean(selReason?.fullDay);

  const save = useMutation(async () => {
    const payload = {
      entry: toIso(date, entry),
      lunchStart: toIso(date, lunchS),
      lunchReturn: toIso(date, lunchR),
      exit: toIso(date, exit),
      reason: reason as TimeTrackAdjustmentReason,
      observation: detail,
    };

    if (track) {
      await api.timeTrack.update(track.id, {
        entry: payload.entry,
        lunchStart: payload.lunchStart,
        lunchReturn: payload.lunchReturn,
        exit: payload.exit,
        observation: detail?.trim() || track.observation || null,
      });
      return;
    }

    const targets = empId === 'ALL' ? employees.map((e: any) => e.id) : [empId];
    
    let currentDate = date;
    let lastDate = endDate || date;
    if (lastDate < currentDate) lastDate = currentDate;

    const startD = new Date(currentDate + 'T00:00:00');
    const endD = new Date(lastDate + 'T00:00:00');
    
    const datesToInsert: string[] = [];
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      datesToInsert.push(d.toISOString().slice(0,10));
    }

    const promises = [];
    for (const d of datesToInsert) {
      const dayPayload = {
        entry: toIso(d, entry),
        lunchStart: toIso(d, lunchS),
        lunchReturn: toIso(d, lunchR),
        exit: toIso(d, exit),
        reason: reason as TimeTrackAdjustmentReason,
        observation: detail,
      };
      for (const tId of targets) {
        if (!tId) continue;
        promises.push(api.timeTrack.manual({ employeeId: tId, date: d, ...dayPayload }));
      }
    }
    
    await Promise.all(promises);
  }, { onSuccess: onDone });

  const ok = Boolean(empId && date && (fullDay || entry || lunchS || lunchR || exit));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-black text-slate-950">{track ? 'EDITAR PONTO' : 'LANÇAR PONTO MANUAL'}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><Edit3 size={18} className="rotate-45"/></button></div>
        {save.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{save.error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>FUNCIONÁRIO</span>
            <select disabled={!!track} value={empId} onChange={e=>setEmpId(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50">
              <option value="">Selecione...</option>
              {!track && <option value="ALL">TODOS OS FUNCIONÁRIOS ATIVOS</option>}
              {employees.map(e=><option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <label className="space-y-1 text-xs font-medium text-slate-600 flex-1"><span>{track || endDate ? 'DATA' : 'DATA INICIAL'}</span><input disabled={!!track} type="date" value={date} onChange={e=>setDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"/></label>
            {!track && <label className="space-y-1 text-xs font-medium text-slate-600 flex-1"><span>DATA FINAL (OPCIONAL)</span><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} min={date} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"/></label>}
          </div>
          {!track && <label className="space-y-1 text-xs font-medium text-slate-600"><span>MOTIVO</span><select value={reason} onChange={e=>setReason(e.target.value as TimeTrackAdjustmentReason)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{REASONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></label>}
          {!fullDay && <><TimeField label="ENTRADA" value={entry} onChange={setEntry}/><TimeField label="SAÍDA ALMOÇO" value={lunchS} onChange={setLunchS}/><TimeField label="RETORNO ALMOÇO" value={lunchR} onChange={setLunchR}/><TimeField label="SAÍDA" value={exit} onChange={setExit}/></>}
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>OBSERVAÇÃO</span><input value={detail} onChange={e=>setDetail(e.target.value)} placeholder={track ? track.observation ?? '' : ''} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
        </div>
        {employees.length===0 && <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Cadastre um funcionário ativo.</p>}
        {empId === 'ALL' && <p className="mt-4 rounded-[10px] border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">Você está prestes a lançar ponto para <b>TODOS ({employees.length})</b> funcionários ativos.</p>}
        {endDate && endDate > date && <p className="mt-4 rounded-[10px] border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">Você está prestes a lançar ponto para o período de <b>{date.split('-')[2]}/{date.split('-')[1]}/{date.split('-')[0]}</b> até <b>{endDate.split('-')[2]}/{endDate.split('-')[1]}/{endDate.split('-')[0]}</b>.</p>}
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">CANCELAR</button><button onClick={()=>ok&&save.mutate().catch(()=>{})} disabled={!ok||employees.length===0||save.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{save.loading ? 'SALVANDO...' : track ? 'SALVAR' : 'LANÇAR'}</button></div>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v:string)=>void; }) {
  return <label className="space-y-1 text-xs font-medium text-slate-600"><span>{label}</span><input type="time" value={value} onChange={e=>onChange(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>;
}

function toIso(date: string, time: string) {
  if (!date || !time) return null;
  const [y,m,d] = date.split('-').map(Number);
  const [hh,mm] = time.split(':').map(Number);
  return new Date(y,m-1,d,hh,mm,0,0).toISOString();
}
