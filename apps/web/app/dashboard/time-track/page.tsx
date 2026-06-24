'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Clock3, Download, Edit3, Eye, FileText, Trash2, X, XCircle } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Company, type Employee, type TimeTrack, type RestDayMode, type TimeTrackAdjustmentReason } from '@/app/lib/api';
import { formatDate, formatMinutes } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

function defaultDaysOff(workScale?: string | null) {
  if (workScale === '5X2') return [0, 6];
  if (workScale === '6X1') return [0];
  return [];
}

function defaultCycle(workScale?: string | null) {
  if (workScale === '6X1') return { workDays: 6, offDays: 1 };
  if (workScale === '5X2') return { workDays: 5, offDays: 2 };
  if (workScale === '12X36') return { workDays: 1, offDays: 1 };
  if (workScale === '4X2') return { workDays: 4, offDays: 2 };
  return { workDays: 6, offDays: 1 };
}
const ADJUSTMENT_REASONS: { value: TimeTrackAdjustmentReason; label: string; fullDay?: boolean }[] = [
  { value: 'ajuste_abono_atestado_horas', label: 'Ajuste - abono (atestado de horas)' },
  { value: 'ajuste_atestado_integral', label: 'Ajuste - atestado integral', fullDay: true },
  { value: 'ajuste_folga_dsr', label: 'Ajuste - folga DSR' },
  { value: 'ajuste_abono_folga', label: 'Ajuste abono - folga' },
  { value: 'ajuste_erro_marcacao', label: 'Ajuste - erro de marcação' },
  { value: 'ajuste_feriado', label: 'Ajuste - feriado', fullDay: true },
];

type CompanyPrintInfo = { name: string; document: string; logoUrl?: string | null };

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function toDateKey(value?: string | null) { return value ? value.slice(0, 10) : ''; }
function displayTime(value?: string | null) {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function timeInput(value?: string | null) { return displayTime(value) === '--:--' ? '' : displayTime(value); }
function displayWorked(minutes?: number | null) { return minutes === null || minutes === undefined ? '--:--' : formatMinutes(minutes); }
function displayBalance(minutes?: number | null) { return minutes === null || minutes === undefined ? '--:--' : formatMinutes(minutes); }
function displayLunch(start?: string | null, end?: string | null) { if (!start && !end) return '--:--'; return `${displayTime(start)} - ${displayTime(end)}`; }

// ─── MONTH GRID & REST DAYS ───────────────────────────────────────────────

interface DaySlot {
  date: Date; dateKey: string; dayNumber: number; weekday: number;
  weekdayLabel: string; isRestDay: boolean; isFuture: boolean; track?: TimeTrack;
}

function daysInMonth(year: number, month: number) { return new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); }

function isEmployeeRestDay(date: Date, employee: Employee): boolean {
  const weekday = date.getUTCDay();
  const scale = employee.workScale;
  const custom = employee.customWorkScale;
  if (scale === '5X2') return weekday === 0 || weekday === 6;
  if (scale === '6X1') return weekday === 0;
  if (scale === '4X2') return isCycleRestDay(date, employee, 4, 2);
  if (scale === '12X36') return isCycleRestDay(date, employee, 1, 1);
  if (scale === 'OUTRO' && custom) {
    const match = custom.match(/(\d+)X(\d+)/i);
    if (match) return isCycleRestDay(date, employee, parseInt(match[1], 10), parseInt(match[2], 10));
    return weekday === 0 || weekday === 6;
  }
  return weekday === 0;
}

function isCycleRestDay(date: Date, employee: Employee, workDays: number, offDays: number): boolean {
  const admission = employee.admissionDate ? new Date(employee.admissionDate) : new Date('2020-01-01');
  const admissionUtc = Date.UTC(admission.getUTCFullYear(), admission.getUTCMonth(), admission.getUTCDate());
  const dateUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diffDays = Math.floor((dateUtc - admissionUtc) / 86400000);
  if (diffDays < 0) return false;
  return (diffDays % (workDays + offDays)) >= workDays;
}

function generateMonthGrid(monthStr: string, employee: Employee, tracks: TimeTrack[]): DaySlot[] {
  const [year, month] = monthStr.split('-').map(Number);
  const totalDays = daysInMonth(year, month - 1);
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const trackMap = new Map<string, TimeTrack>();
  for (const t of tracks) trackMap.set(toDateKey(t.date), t);
  const grid: DaySlot[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const dateKey = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    grid.push({ date, dateKey, dayNumber: day, weekday, weekdayLabel: WEEKDAYS.find(w => w.value === weekday)?.label.slice(0, 3) ?? '', isRestDay: isEmployeeRestDay(date, employee), isFuture: dateKey > todayKey, track: trackMap.get(dateKey) });
  }
  return grid;
}

function restDayBadge(reason?: string) { return reason || 'Folga (DSR)'; }

function toIso(date: string, time: string) {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function escapeHtml(value: unknown) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#039;' }[char] ?? char)); }
function formatDocument(value?: string | null) { const digits = String(value ?? '').replace(/\D/g, ''); if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'); if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); return value || '-'; }

function normalizeCompanyInfo(company?: Company | null): CompanyPrintInfo {
  return { name: normalizeDisplayName(company?.name ?? 'Empresa'), document: formatDocument(company?.document ?? null), logoUrl: company?.logoUrl ?? null };
}

function monthLabel(month: string) {
  if (!month) return 'Todos os períodos';
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  const date = new Date(year, monthNumber - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dateWeekday(value?: string | null) { const date = value ? new Date(value) : null; if (!date || Number.isNaN(date.getTime())) return '-'; return date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, (char) => char.toUpperCase()); }
function minutesPositive(minutes?: number | null) { return Math.max(minutes ?? 0, 0); }

function compareTimeTracks(a: TimeTrack, b: TimeTrack) {
  const nameComparison = collator.compare(normalizeDisplayName(a.employee?.name ?? ''), normalizeDisplayName(b.employee?.name ?? ''));
  if (nameComparison !== 0) return nameComparison;
  const dateComparison = toDateKey(a.date).localeCompare(toDateKey(b.date));
  if (dateComparison !== 0) return dateComparison;
  return displayTime(a.entry).localeCompare(displayTime(b.entry));
}

function dayStatus(row: TimeTrack) {
  if (row.manualStatus === 'revoked') return 'Revogado';
  const text = `${row.observation ?? ''} ${row.manualReason ?? ''}`.toLowerCase();
  if (row.manualStatus === 'pending') return 'Pendente';
  if (row.manualStatus === 'rejected') return 'Rejeitado';
  if (text.includes('feriado')) return 'Feriado';
  if (text.includes('atestado integral')) return 'Atestado integral';
  if (text.includes('folga')) return 'Folga';
  if (row.manualReason || text.includes('ajuste')) return 'Ajuste manual';
  if (!row.entry && !row.exit) return 'Falta';
  return 'Normal';
}

function sumMinutes(rows: TimeTrack[], field: 'totalWorked' | 'dailyBalance') { return rows.reduce((total, row) => total + (row[field] ?? 0), 0); }

function openPrintableReport(rows: TimeTrack[], month: string, company: CompanyPrintInfo, employee?: Employee) {
  const title = employee ? `Espelho individual - ${normalizeDisplayName(employee.name)} - ${monthLabel(month)}` : `Espelho da empresa - ${monthLabel(month)}`;
  const win = window.open('', '_blank');
  if (!win) { window.alert('Não foi possível abrir o relatório. Verifique se o navegador bloqueou pop-ups.'); return; }
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${title}</title><style>body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;margin:0;background:#fff;font-size:9.5pt}table{width:100%;border-collapse:collapse}th,td{padding:3px 5px;border-bottom:1px solid #f1f5f9}th{background:#fff;color:#64748b;font-weight:800;font-size:8px;text-transform:uppercase}td{color:#334155;font-size:9px}</style></head><body><div style="padding:10px"><h1>${title}</h1><p>Gerado em ${new Date().toLocaleString('pt-BR')}</p></div></body></html>`);
  win.document.close();
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────

export default function TimeTrackPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';
  const isFuncionario = profile === 'FUNCIONARIO';
  const isGestor = profile === 'GESTOR';

  const tracks = useQuery(() => api.timeTrack.list(), []);
  const employees = useQuery(() => api.employees.list(), [], { enabled: !isFuncionario });
  const company = useQuery(() => api.companies.me(), [], { enabled: canManage || isGestor });
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<TimeTrack | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

  const activeEmployees = useMemo(() => (employees.data ?? []).filter(e => e.status === 'ACTIVE').toSorted((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name))), [employees.data]);
  const departments = useMemo(() => [...new Set((employees.data ?? []).map(e => e.department).filter(Boolean))].sort(), [employees.data]);
  const managers = useMemo(() => (employees.data ?? []).filter(e => (employees.data ?? []).some(sub => sub.managerId === e.id)).toSorted((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name))), [employees.data]);
  const units = useMemo(() => [...new Set((employees.data ?? []).map(e => e.unit).filter(Boolean))].sort() as string[], [employees.data]);

  const rows = useMemo(() => (tracks.data ?? []).filter(row => {
    if (employeeFilter && row.employeeId !== employeeFilter) return false;
    if (monthFilter && !toDateKey(row.date).startsWith(monthFilter)) return false;
    if (departmentFilter && row.employee?.department !== departmentFilter) return false;
    if (managerFilter && row.employee?.managerId !== managerFilter) return false;
    if (unitFilter && row.employee?.unit !== unitFilter) return false;
    return true;
  }).toSorted(compareTimeTracks), [tracks.data, employeeFilter, monthFilter, departmentFilter, managerFilter, unitFilter]);

  const selectedEmployee = activeEmployees.find(e => e.id === employeeFilter) ?? rows[0]?.employee;
  const rowsByEmployee = useMemo(() => rows.reduce<Record<string, TimeTrack[]>>((acc, row) => { acc[row.employeeId] = acc[row.employeeId] ?? []; acc[row.employeeId].push(row); return acc; }, {}), [rows]);
  const visibleEmployees = useMemo(() => activeEmployees.filter(e => {
    if (employeeFilter && e.id !== employeeFilter) return false;
    if (departmentFilter && e.department !== departmentFilter) return false;
    if (managerFilter && e.managerId !== managerFilter) return false;
    if (unitFilter && e.unit !== unitFilter) return false;
    return true;
  }), [activeEmployees, employeeFilter, departmentFilter, managerFilter, unitFilter]);
  const reportCompany = useMemo(() => normalizeCompanyInfo(isFuncionario ? null : company.data), [company.data, isFuncionario]);
  const remove = useMutation((id: string) => api.timeTrack.delete(id), { onSuccess: () => tracks.refetch() });

  const canClockIn = Boolean(profile && !['DEV', 'COMERCIAL', 'CONSULTA'].includes(profile));
  const canApprove = canManage || isGestor;
  const canDownloadOwnOrTeam = canManage || isGestor || isFuncionario;
  const pendingTracks = useQuery(() => api.timeTrack.listPending(), [], { enabled: canApprove });
  const approveMutation = useMutation((params: { id: string; approved: boolean }) => api.timeTrack.approve(params.id, params.approved), { onSuccess: () => { pendingTracks.refetch(); tracks.refetch(); } });

  useEffect(() => { const id = window.setInterval(() => { tracks.refetch(); if (canApprove) pendingTracks.refetch(); }, 30000); return () => window.clearInterval(id); }, [tracks, pendingTracks, canApprove]);

  async function handleDelete(row: TimeTrack) {
    const employeeName = normalizeDisplayName(row.employee?.name ?? 'funcionário');
    if (!window.confirm(`Excluir o ponto de ${employeeName} em ${formatDate(row.date)}?`)) return;
    await remove.mutate(row.id).catch(() => {});
  }

  const pageTitle = isFuncionario ? 'Meu ponto' : isGestor ? 'Ponto da equipe' : 'Folha de ponto da empresa';
  const isInitialTracksLoading = tracks.loading && !tracks.data;
  const isRefreshingTracks = tracks.loading && Boolean(tracks.data);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Controle de ponto</p>
          <h2 className="text-2xl font-black text-slate-950">{pageTitle}</h2>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-row sm:items-center">
          {canClockIn && <Link href="/dashboard/time-track/clock-in" className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"><Clock3 size={14} /> Bater ponto</Link>}
          {canManage && (<>
            <button onClick={() => setBulkOpen(true)} disabled={isRefreshingTracks} className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black"><Clock3 size={14} /> Lançar em lote</button>
            <button onClick={() => setOpen(true)} disabled={isRefreshingTracks} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"><Clock3 size={14} /> Lançar ponto</button>
          </>)}
        </div>
      </header>

      {canApprove && (pendingTracks.data ?? []).length > 0 && (
        <section className="ops-card rounded-[8px] border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-3 text-sm font-black text-amber-900">Pontos manuais pendentes de aprovacao ({(pendingTracks.data ?? []).length})</h3>
          {approveMutation.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{approveMutation.error}</p>}
          <div className="space-y-2">{(pendingTracks.data ?? []).map(track => (
            <div key={track.id} className="flex items-center justify-between rounded-[8px] border border-amber-200 bg-white px-4 py-3">
              <div className="text-xs"><p className="font-bold text-slate-950">{normalizeDisplayName(track.employee?.name ?? '-')}</p><p className="text-slate-500">{formatDate(track.date)} - {track.manualReason ?? 'Lancamento manual'}</p></div>
              <div className="flex gap-2">
                <button onClick={() => approveMutation.mutate({ id: track.id, approved: true }).catch(() => {})} disabled={approveMutation.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-60"><Check size={12} />Aprovar</button>
                <button onClick={() => approveMutation.mutate({ id: track.id, approved: false }).catch(() => {})} disabled={approveMutation.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-rose-600 px-3 text-[11px] font-bold text-white disabled:opacity-60"><XCircle size={12} />Recusar</button>
              </div>
            </div>))}
          </div>
        </section>
      )}

      {!isFuncionario && (
        <section className="grid gap-3 rounded-[14px] border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600"><span>Funcionário</span><select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"><option value="">Todos</option>{activeEmployees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}</select></label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600"><span>Mês</span><input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600"><span>Departamento</span><select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"><option value="">Todos</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600"><span>Gestor</span><select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"><option value="">Todos</option>{managers.map(m => <option key={m.id} value={m.id}>{normalizeDisplayName(m.name)}</option>)}</select></label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600"><span>Unidade</span><select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"><option value="">Todas</option>{units.map(u => <option key={u} value={u}>{u}</option>)}</select></label>
        </section>
      )}
      {isFuncionario && (
        <section className="grid gap-3 rounded-[14px] border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600"><span>Mês da folha</span><input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-10 w-full max-w-[220px] rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>
        </section>
      )}

      {remove.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{remove.error}</p>}
      {isRefreshingTracks && <p className="rounded-[8px] border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700">Atualizando a folha de ponto...</p>}
      {tracks.error && tracks.data && <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">Nao foi possivel atualizar agora. Os ultimos dados carregados continuam visiveis.</p>}

      {isInitialTracksLoading ? <LoadingState label="Carregando folha de ponto..." /> : tracks.error && !tracks.data ? <ErrorState message={tracks.error} onRetry={tracks.refetch} /> : isFuncionario ? (
        selectedEmployee ? <MonthGridSection employee={selectedEmployee} tracks={rowsByEmployee[selectedEmployee.id] ?? []} monthFilter={monthFilter} canManage={false} isRefreshing={isRefreshingTracks} removeLoading={remove.loading} onEdit={setEditing} onDelete={handleDelete} canDownload={canDownloadOwnOrTeam} reportCompany={reportCompany} companyLoading={company.loading} isRefreshingTracks={isRefreshingTracks} /> : <EmptyState message="Nenhum registro de ponto encontrado." />
      ) : visibleEmployees.length === 0 ? <EmptyState message="Nenhum colaborador encontrado para o filtro selecionado." /> : employeeFilter ? (
        <MonthGridSection employee={visibleEmployees[0]} tracks={rowsByEmployee[visibleEmployees[0].id] ?? []} monthFilter={monthFilter} canManage={canManage} isRefreshing={isRefreshingTracks} removeLoading={remove.loading} onEdit={setEditing} onDelete={handleDelete} canDownload={canDownloadOwnOrTeam} reportCompany={reportCompany} companyLoading={company.loading} isRefreshingTracks={isRefreshingTracks} />
      ) : (
        <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5"><h3 className="text-sm font-black text-slate-950">Colaboradores da folha</h3><p className="mt-1 text-xs font-semibold text-slate-500">Selecione um colaborador para ver a folha mensal completa com todos os dias e folgas.</p></div>
          <div className="divide-y divide-slate-100">
            {visibleEmployees.map(employee => {
              const employeeRows = rowsByEmployee[employee.id] ?? [];
              const workedTotal = sumMinutes(employeeRows, 'totalWorked');
              const balanceTotal = sumMinutes(employeeRows, 'dailyBalance');
              const grid = generateMonthGrid(monthFilter, employee, employeeRows);
              const restDaysCount = grid.filter(d => d.isRestDay).length;
              const workedDaysCount = grid.filter(d => d.track && !d.isRestDay).length;
              return (
                <div key={employee.id} className="bg-white px-6 py-5 transition-all duration-200 hover:bg-slate-50/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white shadow-lg shadow-teal-500/20">{normalizeDisplayName(employee.name).charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><span className="inline-flex rounded-full border border-teal-200/60 bg-gradient-to-r from-teal-50 to-cyan-50 px-2.5 py-1 text-[11px] font-black text-teal-700">{employee.registration || employee.id.slice(0, 8).toUpperCase()}</span><p className="text-sm font-black text-slate-950">{normalizeDisplayName(employee.name)}</p></div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500"><span>{workedDaysCount} batida(s) no mês</span><span className="text-slate-300">|</span><span>{restDaysCount} folga(s)</span><span className="text-slate-300">|</span><span>{employee.department || 'Sem departamento'}</span><span className="text-slate-300">|</span><span>{employee.position || 'Sem cargo'}</span></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex gap-3 text-[11px] font-bold">
                        <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5"><span className="block text-[9px] uppercase text-slate-400">Trabalhado</span><span className="text-slate-900">{formatMinutes(workedTotal)}</span></div>
                        <div className={`rounded-[8px] border px-3 py-1.5 ${balanceTotal >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><span className="block text-[9px] uppercase text-slate-400">Saldo</span><span className={balanceTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatMinutes(balanceTotal)}</span></div>
                      </div>
                      <button onClick={() => setEmployeeFilter(employee.id)} className="btn-outline-premium inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-[11px] font-black"><Eye size={13} /> Abrir folha</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(open || bulkOpen || editing) && <ManualTimeSheetModal employees={activeEmployees} employeesLoading={employees.loading} employeesError={employees.error} defaultEmployeeId={employeeFilter} track={editing ?? undefined} bulk={bulkOpen} onClose={() => { setOpen(false); setBulkOpen(false); setEditing(null); }} onDone={() => { setOpen(false); setBulkOpen(false); setEditing(null); tracks.refetch(); }} />}
    </div>
  );
}

// ─── STATUS BADGE ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { 'Normal': 'bg-emerald-50 text-emerald-700 border-emerald-200/60', 'Pendente': 'bg-amber-50 text-amber-700 border-amber-200/60', 'Rejeitado': 'bg-rose-50 text-rose-700 border-rose-200/60', 'Revogado': 'bg-red-100 text-red-700 border-red-200/60', 'Feriado': 'bg-teal-50 text-teal-700 border-teal-200/60', 'Atestado integral': 'bg-violet-50 text-violet-700 border-violet-200/60', 'Folga': 'bg-sky-50 text-sky-700 border-sky-200/60', 'Ajuste manual': 'bg-orange-50 text-orange-700 border-orange-200/60', 'Falta': 'bg-rose-50 text-rose-700 border-rose-200/60' };
  return <span className={`inline-flex items-center rounded-[6px] border px-2.5 py-1 text-[10px] font-black ${colors[status] || 'bg-slate-100 text-slate-600 border-slate-200/60'}`}>{status}</span>;
}

// ─── MANUAL TIME SHEET MODAL ──────────────────────────────────────────────

function ManualTimeSheetModal({ employees, employeesLoading, employeesError, defaultEmployeeId, track, bulk, onClose, onDone }: { employees: Employee[]; employeesLoading: boolean; employeesError: string | null; defaultEmployeeId: string; track?: TimeTrack; bulk?: boolean; onClose: () => void; onDone: () => void }) {
  const initialDate = track ? toDateKey(track.date) : new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<'single' | 'bulk'>(bulk ? 'bulk' : 'single');
  const [bulkMode, setBulkMode] = useState<'day' | 'period'>('day');
  const [employeeId, setEmployeeId] = useState(track?.employeeId ?? defaultEmployeeId);
  const initialEmployeeScale = employees.find(e => e.id === (track?.employeeId ?? defaultEmployeeId))?.workScale;
  const [date, setDate] = useState(initialDate);
  const [startDate, setStartDate] = useState(initialDate.slice(0, 8) + '01');
  const [endDate, setEndDate] = useState(initialDate);
  const [selectedBulkEmployees, setSelectedBulkEmployees] = useState<string[]>([]);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [entry, setEntry] = useState(track ? timeInput(track.entry) : '');
  const [lunchStart, setLunchStart] = useState(track ? timeInput(track.lunchStart) : '');
  const [lunchReturn, setLunchReturn] = useState(track ? timeInput(track.lunchReturn) : '');
  const [exit, setExit] = useState(track ? timeInput(track.exit) : '');
  const [reason, setReason] = useState<TimeTrackAdjustmentReason>('ajuste_erro_marcacao');
  const [detail, setDetail] = useState('');
  const initialCycle = defaultCycle(initialEmployeeScale);
  const [restDayMode, setRestDayMode] = useState<RestDayMode>('employee_scale');
  const [daysOff, setDaysOff] = useState<number[]>(defaultDaysOff(initialEmployeeScale));
  const [cycleStartDate, setCycleStartDate] = useState(initialDate.slice(0, 8) + '01');
  const [cycleWorkDays, setCycleWorkDays] = useState(initialCycle.workDays);
  const [cycleOffDays, setCycleOffDays] = useState(initialCycle.offDays);
  const selectedReason = ADJUSTMENT_REASONS.find(item => item.value === reason);
  const selectedEmployee = employees.find(e => e.id === employeeId);
  const fullDay = Boolean(selectedReason?.fullDay);

  function applyEmployeeScaleDefaults(nextEmployeeId: string) { const emp = employees.find(item => item.id === nextEmployeeId); setDaysOff(defaultDaysOff(emp?.workScale)); const cycle = defaultCycle(emp?.workScale); setCycleWorkDays(cycle.workDays); setCycleOffDays(cycle.offDays); }
  function toggleDayOff(day: number) { setDaysOff(current => current.includes(day) ? current.filter(item => item !== day) : [...current, day].sort((a, b) => a - b)); }
  function toggleBulkEmployee(id: string) { setSelectedBulkEmployees(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]); }
  function selectAllEmployees() { const allIds = employees.map(e => e.id); setSelectedBulkEmployees(selectedBulkEmployees.length === allIds.length ? [] : allIds); }

  const save = useMutation(async () => {
    const payload = { entry: toIso(date, entry), lunchStart: toIso(date, lunchStart), lunchReturn: toIso(date, lunchReturn), exit: toIso(date, exit), reason, observation: detail };
    if (track) { await api.timeTrack.update(track.id, { entry: payload.entry, lunchStart: payload.lunchStart, lunchReturn: payload.lunchReturn, exit: payload.exit, observation: detail.trim() || track.observation || null }); return; }
    if (mode === 'bulk') {
      const employeeIds = bulkMode === 'period' ? [employeeId] : selectedBulkEmployees;
      const base = { employeeIds, entry: payload.entry, lunchStart: payload.lunchStart, lunchReturn: payload.lunchReturn, exit: payload.exit, reason, observation: detail, restDayMode, daysOff, cycleStartDate, cycleWorkDays, cycleOffDays };
      await api.timeTrack.manualBulk(bulkMode === 'period' ? { ...base, startDate, endDate } : { ...base, date });
      return;
    }
    await api.timeTrack.manual({ employeeId, date, ...payload });
  }, { onSuccess: onDone });

  const hasTime = fullDay || entry || lunchStart || lunchReturn || exit;
  const bulkValid = bulkMode === 'period' ? Boolean(employeeId && startDate && endDate && hasTime) : Boolean(selectedBulkEmployees.length && date && hasTime);
  const valid = mode === 'bulk' ? bulkValid : Boolean(employeeId && date && hasTime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-black text-slate-950">{track ? 'Editar ponto' : mode === 'bulk' ? 'Lançar ponto em lote' : 'Lançar ponto manual'}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button></div>
        {(save.error || employeesError) && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{save.error || employeesError}</p>}
        {!track && <div className="mb-4 grid grid-cols-2 gap-2 rounded-[8px] bg-slate-100 p-1 text-xs font-black"><button type="button" onClick={() => setMode('single')} className={`h-9 rounded-[7px] ${mode === 'single' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Individual</button><button type="button" onClick={() => setMode('bulk')} className={`h-9 rounded-[7px] ${mode === 'bulk' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Lote</button></div>}

        <div className="grid gap-3 sm:grid-cols-2">
          {mode === 'bulk' && !track ? (<>
            <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Tipo de lote</span><select value={bulkMode} onChange={e => setBulkMode(e.target.value as 'day' | 'period')} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"><option value="day">Um dia para vários colaboradores</option><option value="period">Período inteiro para um colaborador</option></select></label>
            {bulkMode === 'day' ? (
              <div className="sm:col-span-2 rounded-[10px] border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Selecione os funcionários ({selectedBulkEmployees.length})</span><button type="button" onClick={selectAllEmployees} className="text-[10px] font-bold text-teal-600 hover:text-teal-800">{selectedBulkEmployees.length === employees.length ? 'Desmarcar todos' : 'Selecionar todos'}</button></div>
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {(showAllEmployees ? employees : employees.slice(0, 8)).map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-slate-50 cursor-pointer text-xs">
                      <input type="checkbox" checked={selectedBulkEmployees.includes(emp.id)} onChange={() => toggleBulkEmployee(emp.id)} className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                      <span className="font-semibold text-slate-700">{normalizeDisplayName(emp.name)}</span>
                      <span className="text-[10px] text-slate-400">{emp.registration || emp.id.slice(0, 8)}</span>
                    </label>
                  ))}
                </div>
                {employees.length > 8 && <button type="button" onClick={() => setShowAllEmployees(!showAllEmployees)} className="mt-1 text-[10px] font-bold text-teal-600 hover:text-teal-800">{showAllEmployees ? 'Mostrar menos' : `Ver todos (${employees.length})`}</button>}
              </div>
            ) : <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Funcionário</span><select value={employeeId} onChange={e => { setEmployeeId(e.target.value); applyEmployeeScaleDefaults(e.target.value); }} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"><option value="">Selecione...</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}</select></label>}
            {bulkMode === 'period' ? <><label className="space-y-1 text-xs font-medium text-slate-600"><span>Data inicial</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label><label className="space-y-1 text-xs font-medium text-slate-600"><span>Data final</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label></> : <label className="space-y-1 text-xs font-medium text-slate-600"><span>Data da folha</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>}
          </>) : (<>
            <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Funcionário</span><select disabled={Boolean(track)} value={employeeId} onChange={e => { setEmployeeId(e.target.value); applyEmployeeScaleDefaults(e.target.value); }} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"><option value="">{employeesLoading ? 'Carregando equipe...' : 'Selecione...'}</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}</select></label>
            <label className="space-y-1 text-xs font-medium text-slate-600"><span>Data da folha</span><input disabled={Boolean(track)} type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50" /></label>
          </>)}
          {mode === 'bulk' && !track && (
            <section className="sm:col-span-2 rounded-[10px] border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-700">Folgas da escala serão respeitadas automaticamente.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Como calcular as folgas{selectedEmployee?.workScale ? ` (${selectedEmployee.workScale})` : ''}</span><select value={restDayMode} onChange={e => setRestDayMode(e.target.value as RestDayMode)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"><option value="employee_scale">Usar padrão da escala cadastrada</option><option value="fixed_weekly">Folga fixa na semana</option><option value="cycle">Escala alternada / ciclo</option></select></label>
                {(restDayMode === 'fixed_weekly' || restDayMode === 'employee_scale') && <div className="space-y-2 sm:col-span-2"><p className="text-xs font-medium text-slate-600">Dias de folga</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{WEEKDAYS.map(day => <label key={day.value} className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={daysOff.includes(day.value)} onChange={() => toggleDayOff(day.value)} /> {day.label}</label>)}</div></div>}
                {restDayMode === 'cycle' && <><label className="space-y-1 text-xs font-medium text-slate-600"><span>Início do ciclo</span><input type="date" value={cycleStartDate} onChange={e => setCycleStartDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500" /></label><label className="space-y-1 text-xs font-medium text-slate-600"><span>Dias trabalhados</span><input type="number" min={1} max={31} value={cycleWorkDays} onChange={e => setCycleWorkDays(Number(e.target.value))} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500" /></label><label className="space-y-1 text-xs font-medium text-slate-600"><span>Dias de folga</span><input type="number" min={1} max={31} value={cycleOffDays} onChange={e => setCycleOffDays(Number(e.target.value))} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500" /></label></>}
              </div>
            </section>
          )}
          {!track && <label className="space-y-1 text-xs font-medium text-slate-600"><span>Motivo do ajuste</span><select value={reason} onChange={e => setReason(e.target.value as TimeTrackAdjustmentReason)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{ADJUSTMENT_REASONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
          {!fullDay && <><TimeField label="Entrada" value={entry} onChange={setEntry} /><TimeField label="Saída almoço" value={lunchStart} onChange={setLunchStart} /><TimeField label="Retorno almoço" value={lunchReturn} onChange={setLunchReturn} /><TimeField label="Saída" value={exit} onChange={setExit} /></>}
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Observação complementar</span><input value={detail} onChange={e => setDetail(e.target.value)} placeholder={track ? track.observation ?? '' : selectedReason?.label} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        </div>
        {!employeesLoading && employees.length === 0 && <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Cadastre um funcionário ativo antes de lançar a folha de ponto.</p>}
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button><button onClick={() => valid && save.mutate().catch(() => {})} disabled={!valid || employees.length === 0 || save.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{save.loading ? 'Salvando...' : track ? 'Salvar ponto' : mode === 'bulk' ? 'Lançar lote' : 'Lançar ponto'}</button></div>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="space-y-1 text-xs font-medium text-slate-600"><span>{label}</span><input type="time" value={value} onChange={e => onChange(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>;
}

// ─── MONTH GRID SECTION ───────────────────────────────────────────────────

function MonthGridSection({ employee, tracks, monthFilter, canManage, isRefreshing, removeLoading, onEdit, onDelete, canDownload, reportCompany, companyLoading, isRefreshingTracks }: { employee: Employee; tracks: TimeTrack[]; monthFilter: string; canManage: boolean; isRefreshing: boolean; removeLoading: boolean; onEdit: (row: TimeTrack) => void; onDelete: (row: TimeTrack) => void; canDownload: boolean; reportCompany: CompanyPrintInfo; companyLoading: boolean; isRefreshingTracks: boolean; }) {
  const grid = useMemo(() => generateMonthGrid(monthFilter, employee, tracks), [monthFilter, employee, tracks]);
  const workedTotal = sumMinutes(tracks, 'totalWorked');
  const balanceTotal = sumMinutes(tracks, 'dailyBalance');
  const restDaysCount = grid.filter(d => d.isRestDay).length;
  const workedDaysCount = grid.filter(d => d.track && !d.isRestDay).length;
  const missingDaysCount = grid.filter(d => !d.isRestDay && !d.isFuture && !d.track).length;

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white shadow-lg shadow-teal-500/20">{normalizeDisplayName(employee.name).charAt(0).toUpperCase()}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="inline-flex rounded-full border border-teal-200/60 bg-gradient-to-r from-teal-50 to-cyan-50 px-2.5 py-1 text-[11px] font-black text-teal-700">{employee.registration || employee.id.slice(0, 8).toUpperCase()}</span><h3 className="text-sm font-black text-slate-950">{normalizeDisplayName(employee.name)}</h3></div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500"><span>{employee.department || 'Sem departamento'}</span><span className="text-slate-300">|</span><span>{employee.position || 'Sem cargo'}</span><span className="text-slate-300">|</span><span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px]">Escala: {employee.workScale || (employee.customWorkScale || '6X1')}</span></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-3 text-[11px] font-bold"><div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5"><span className="block text-[9px] uppercase text-slate-400">Trabalhado</span><span className="text-slate-900">{formatMinutes(workedTotal)}</span></div><div className={`rounded-[8px] border px-3 py-1.5 ${balanceTotal >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><span className="block text-[9px] uppercase text-slate-400">Saldo</span><span className={balanceTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatMinutes(balanceTotal)}</span></div></div>
            {canDownload && <button onClick={() => openPrintableReport(tracks, monthFilter, reportCompany, employee)} disabled={tracks.length === 0 || companyLoading || isRefreshingTracks} className="btn-outline-premium inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-[11px] font-black disabled:opacity-50"><FileText size={13} /> Folha</button>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 rounded-[10px] border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{workedDaysCount} batida(s)</span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />{restDaysCount} folga(s)</span>
          {missingDaysCount > 0 && <><span className="text-slate-300">|</span><span className="flex items-center gap-1 text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500" />{missingDaysCount} pendente(s)</span></>}
          <span className="text-slate-300">|</span><span className="text-slate-400">{monthLabel(monthFilter)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] table-fixed border-separate border-spacing-0 text-left">
          <thead>
            <tr className="bg-gradient-to-r from-slate-100 to-slate-50 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
              <th className="sticky top-0 z-10 px-2 py-2.5 w-[8%] border-b border-slate-200">Dia</th>
              <th className="sticky top-0 z-10 px-2 py-2.5 w-[10%] border-b border-slate-200">Data</th>
              <th className="sticky top-0 z-10 px-2 py-2.5 w-[10%] border-b border-slate-200">Entrada</th>
              <th className="sticky top-0 z-10 px-2 py-2.5 w-[14%] border-b border-slate-200">Almoço</th>
              <th className="sticky top-0 z-10 px-2 py-2.5 w-[10%] border-b border-slate-200">Saída</th>
              <th className="sticky top-0 z-10 px-2 py-2.5 w-[10%] border-b border-slate-200">Trabalhado</th>
              <th className="sticky top-0 z-10 px-2 py-2.5 w-[10%] border-b border-slate-200">Saldo</th>
              <th className="sticky top-0 z-10 px-2 py-2.5 w-[12%] border-b border-slate-200">Status</th>
              <th className="sticky top-0 z-10 px-2 py-2.5 w-[16%] text-center border-b border-slate-200">Ações</th>
            </tr>
          </thead>
          <tbody>
            {grid.map(day => {
              const t = day.track;
              let rowBg = '';
              if (day.isRestDay) rowBg = 'bg-sky-50/30';
              else if (day.isFuture) rowBg = 'bg-slate-50/40 opacity-70';
              else if (!t) rowBg = 'bg-amber-50/20';
              const dayStatusText = day.isRestDay ? restDayBadge() : t ? dayStatus(t) : day.isFuture ? '—' : 'Pendente';

              return (
                <tr key={day.dateKey} className={`h-9 border-t border-slate-100 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50/70 ${rowBg}`}>
                  <td className="px-2 overflow-hidden" title={`${day.weekdayLabel} ${day.dayNumber}`}>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-500 truncate">{day.weekdayLabel}</span>
                      <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${day.isRestDay ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'}`}>{day.dayNumber}</span>
                    </div>
                  </td>
                  <td className="px-2 truncate text-slate-500 text-xs" title={formatDate(day.dateKey)}>{formatDate(day.dateKey)}</td>
                  <td className={`px-2 truncate font-mono text-xs font-black ${t?.entry ? 'text-slate-950' : 'text-slate-300'}`}>{t?.entry ? displayTime(t.entry) : '--:--'}</td>
                  <td className={`px-2 truncate font-mono text-xs ${t?.lunchStart || t?.lunchReturn ? 'text-slate-600' : 'text-slate-300'}`}>{displayLunch(t?.lunchStart, t?.lunchReturn)}</td>
                  <td className={`px-2 truncate font-mono text-xs font-black ${t?.exit ? 'text-slate-950' : 'text-slate-300'}`}>{t?.exit ? displayTime(t.exit) : '--:--'}</td>
                  <td className="px-2 truncate text-slate-600 text-xs">{t ? displayWorked(t.totalWorked) : '--:--'}</td>
                  <td className={`px-2 truncate text-xs font-black ${t && (t.dailyBalance ?? 0) < 0 ? 'text-rose-600' : t ? 'text-emerald-600' : 'text-slate-300'}`}>{t ? displayBalance(t.dailyBalance) : '--:--'}</td>
                  <td className="px-2 truncate text-center"><StatusBadge status={dayStatusText} /></td>
                  <td className="px-2 text-center">
                    <div className="flex justify-center gap-1 whitespace-nowrap">
                      {t ? (<>
                        {canManage ? <button onClick={() => onEdit(t)} disabled={isRefreshing || removeLoading} className="btn-outline-premium inline-flex h-6 shrink-0 items-center gap-1 px-2 text-[10px]"><Edit3 size={10} />Editar</button> : null}
                        {canManage ? <button onClick={() => onDelete(t)} disabled={isRefreshing || removeLoading} className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[6px] bg-gradient-to-r from-rose-500 to-pink-600 px-2 text-[10px] font-black text-white shadow-md shadow-rose-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"><Trash2 size={10} />Excluir</button> : null}
                        {!canManage && <span className="text-[10px] text-slate-400">{t.manualStatus === 'approved' ? 'Aprovado' : t.manualStatus === 'pending' ? 'Aguardando' : t.manualStatus === 'revoked' ? 'Revogado' : ''}</span>}
                      </>) : !day.isRestDay && !day.isFuture ? (
                        <button onClick={() => onEdit({ id: '', employeeId: employee.id, date: day.dateKey, entry: null, lunchStart: null, lunchReturn: null, exit: null, totalWorked: null, dailyBalance: null } as unknown as TimeTrack)} disabled={isRefreshing || removeLoading} className="crystal-button inline-flex h-6 shrink-0 items-center gap-1 px-2 text-[10px]"><Edit3 size={10} />Lançar</button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
        <div className="flex flex-wrap gap-4 text-[10px] font-semibold text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-sky-200 bg-sky-50" /> Folga (DSR)</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-amber-200 bg-amber-50/40" /> Pendente</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-slate-200 bg-slate-50/40" /> Futuro</span>
          <span className="flex items-center gap-1 text-slate-400">--:-- Sem registro</span>
        </div>
      </div>
    </section>
  );
}