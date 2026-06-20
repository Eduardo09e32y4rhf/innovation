'use client';

import { useMemo, useState } from 'react';
import { Clock3, Download, Edit3, FileText, Trash2, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Employee, type TimeTrack, type TimeTrackAdjustmentReason } from '@/app/lib/api';
import { formatDate, formatMinutes } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

const ADJUSTMENT_REASONS: { value: TimeTrackAdjustmentReason; label: string; fullDay?: boolean }[] = [
  { value: 'ajuste_abono_atestado_horas', label: 'Ajuste - abono (atestado de horas)' },
  { value: 'ajuste_atestado_integral', label: 'Ajuste - atestado integral', fullDay: true },
  { value: 'ajuste_folga_dsr', label: 'Ajuste - folga DSR' },
  { value: 'ajuste_abono_folga', label: 'Ajuste abono - folga' },
  { value: 'ajuste_erro_marcacao', label: 'Ajuste erro de marcacao' },
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function toDateKey(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function displayTime(value?: string | null) {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function timeInput(value?: string | null) {
  return displayTime(value) === '--:--' ? '' : displayTime(value);
}

function toIso(date: string, time: string) {
  return time ? `${date}T${time}:00.000` : null;
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char));
}

function buildMirrorRows(rows: TimeTrack[]) {
  return rows.map((row) => ({
    funcionario: normalizeDisplayName(row.employee?.name ?? ''),
    data: formatDate(row.date),
    entrada1: displayTime(row.entry),
    saida1: displayTime(row.lunchStart),
    entrada2: displayTime(row.lunchReturn),
    saida2: displayTime(row.exit),
    trabalhado: formatMinutes(row.totalWorked),
    saldo: formatMinutes(row.dailyBalance),
    observacao: row.observation || 'Ponto normal',
  }));
}

function downloadExcel(filename: string, rows: TimeTrack[]) {
  const mirrorRows = buildMirrorRows(rows);
  const bodyRows = mirrorRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.funcionario)}</td><td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.entrada1)}</td>
      <td>${escapeHtml(row.saida1)}</td><td>${escapeHtml(row.entrada2)}</td><td>${escapeHtml(row.saida2)}</td>
      <td>${escapeHtml(row.trabalhado)}</td><td>${escapeHtml(row.saldo)}</td><td>${escapeHtml(row.observacao)}</td>
    </tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
    <h2>Espelho de ponto</h2>
    <table border="1">
      <thead><tr><th>Funcionario</th><th>Data</th><th>Ent. 1</th><th>Sai. 1</th><th>Ent. 2</th><th>Sai. 2</th><th>Trabalhado</th><th>Saldo</th><th>Observacao</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printPdf(rows: TimeTrack[], title: string) {
  const mirrorRows = buildMirrorRows(rows);
  const bodyRows = mirrorRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.funcionario)}</td><td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.entrada1)}</td>
      <td>${escapeHtml(row.saida1)}</td><td>${escapeHtml(row.entrada2)}</td><td>${escapeHtml(row.saida2)}</td>
      <td>${escapeHtml(row.trabalhado)}</td><td>${escapeHtml(row.saldo)}</td><td>${escapeHtml(row.observacao)}</td>
    </tr>`).join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
    <style>body{font-family:Arial,sans-serif;color:#111827;padding:24px}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #CBD5E1;padding:6px;text-align:left}th{background:#F1F5F9}.summary{margin:12px 0;font-size:12px}</style>
    </head><body><h1>${escapeHtml(title)}</h1><div class="summary">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
    <table><thead><tr><th>Funcionario</th><th>Data</th><th>Ent. 1</th><th>Sai. 1</th><th>Ent. 2</th><th>Sai. 2</th><th>Trabalhado</th><th>Saldo</th><th>Observacao</th></tr></thead><tbody>${bodyRows}</tbody></table>
    <script>window.onload=()=>{window.print()}</script></body></html>`);
  win.document.close();
}

export default function TimeTrackPage() {
  const tracks = useQuery(() => api.timeTrack.list(), []);
  const employees = useQuery(() => api.employees.list(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TimeTrack | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonth());

  const activeEmployees = (employees.data ?? []).filter((employee) => employee.status === 'ACTIVE');
  const rows = useMemo(() => {
    return (tracks.data ?? []).filter((row) => {
      if (employeeFilter && row.employeeId !== employeeFilter) return false;
      if (monthFilter && !toDateKey(row.date).startsWith(monthFilter)) return false;
      return true;
    });
  }, [tracks.data, employeeFilter, monthFilter]);

  const selectedEmployee = activeEmployees.find((employee) => employee.id === employeeFilter);
  const remove = useMutation((id: string) => api.timeTrack.delete(id), { onSuccess: () => tracks.refetch() });

  async function handleDelete(row: TimeTrack) {
    const employeeName = normalizeDisplayName(row.employee?.name ?? 'funcionario');
    if (!window.confirm(`Excluir o ponto de ${employeeName} em ${formatDate(row.date)}?`)) return;
    await remove.mutate(row.id).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Controle de ponto</p>
          <h2 className="text-2xl font-black text-slate-950">Folha de ponto da empresa</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button onClick={() => downloadExcel(`folha-ponto-${selectedEmployee?.name ?? 'empresa'}-${monthFilter || 'todos'}.xls`, rows)} disabled={rows.length === 0} className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black disabled:opacity-50">
            <Download size={14} /> Excel filtro
          </button>
          <button onClick={() => printPdf(rows, `Espelho de ponto - ${selectedEmployee?.name ?? 'Empresa'} - ${monthFilter || 'todos'}`)} disabled={rows.length === 0} className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black disabled:opacity-50">
            <FileText size={14} /> PDF filtro
          </button>
          <button onClick={() => setOpen(true)} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
            <Clock3 size={14} /> Lancar ponto
          </button>
        </div>
      </header>

      <section className="ops-card grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px]">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Filtrar por funcionario</span>
          <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
            <option value="">Todos os funcionarios</option>
            {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{normalizeDisplayName(employee.name)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Mes da folha</span>
          <input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
        </label>
      </section>

      {remove.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{remove.error}</p>}

      {tracks.loading ? <LoadingState label="Carregando folha de ponto..." /> : tracks.error ? <ErrorState message={tracks.error} onRetry={tracks.refetch} /> : rows.length === 0 ? <EmptyState message="Nenhum registro de ponto para o filtro selecionado." /> : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[1040px] text-left">
              <thead><tr className="text-[11px] font-medium text-slate-500"><th className="pb-3 pr-4">Funcionario</th><th className="pb-3 pr-4">Data</th><th className="pb-3 pr-4">Entrada</th><th className="pb-3 pr-4">Almoco</th><th className="pb-3 pr-4">Saida</th><th className="pb-3 pr-4">Trabalhado</th><th className="pb-3 pr-4">Saldo</th><th className="pb-3 pr-4">Motivo</th><th className="pb-3">Acoes</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 text-xs text-slate-700">
                  <td className="py-3 pr-4 font-medium text-slate-950">{normalizeDisplayName(row.employee?.name ?? '-')}</td>
                  <td className="py-3 pr-4">{formatDate(row.date)}</td>
                  <td className="py-3 pr-4">{displayTime(row.entry)}</td>
                  <td className="py-3 pr-4">{displayTime(row.lunchStart)} - {displayTime(row.lunchReturn)}</td>
                  <td className="py-3 pr-4">{displayTime(row.exit)}</td>
                  <td className="py-3 pr-4">{formatMinutes(row.totalWorked)}</td>
                  <td className={`py-3 pr-4 font-medium ${(row.dailyBalance ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatMinutes(row.dailyBalance)}</td>
                  <td className="max-w-[220px] truncate py-3 pr-4">{row.observation || '-'}</td>
                  <td className="py-3"><div className="flex gap-2"><button onClick={() => setEditing(row)} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"><Edit3 size={12} />Editar</button><button onClick={() => handleDelete(row)} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-rose-600"><Trash2 size={12} />Excluir</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      {(open || editing) && <ManualTimeSheetModal employees={activeEmployees} employeesLoading={employees.loading} employeesError={employees.error} defaultEmployeeId={employeeFilter} track={editing ?? undefined} onClose={() => { setOpen(false); setEditing(null); }} onDone={() => { setOpen(false); setEditing(null); tracks.refetch(); }} />}
    </div>
  );
}

function ManualTimeSheetModal({ employees, employeesLoading, employeesError, defaultEmployeeId, track, onClose, onDone }: { employees: Pick<Employee, 'id' | 'name'>[]; employeesLoading: boolean; employeesError: string | null; defaultEmployeeId: string; track?: TimeTrack; onClose: () => void; onDone: () => void }) {
  const initialDate = track ? toDateKey(track.date) : new Date().toISOString().slice(0, 10);
  const [employeeId, setEmployeeId] = useState(track?.employeeId ?? defaultEmployeeId);
  const [date, setDate] = useState(initialDate);
  const [entry, setEntry] = useState(timeInput(track?.entry) || '08:00');
  const [lunchStart, setLunchStart] = useState(timeInput(track?.lunchStart) || '12:00');
  const [lunchReturn, setLunchReturn] = useState(timeInput(track?.lunchReturn) || '13:00');
  const [exit, setExit] = useState(timeInput(track?.exit) || '17:00');
  const [reason, setReason] = useState<TimeTrackAdjustmentReason>('ajuste_erro_marcacao');
  const [detail, setDetail] = useState('');
  const selectedReason = ADJUSTMENT_REASONS.find((item) => item.value === reason);

  const save = useMutation(async () => {
    if (track) {
      await api.timeTrack.update(track.id, { entry: toIso(date, entry), lunchStart: toIso(date, lunchStart), lunchReturn: toIso(date, lunchReturn), exit: toIso(date, exit), observation: detail.trim() || track.observation || null });
      return;
    }
    await api.timeTrack.manual({ employeeId, date, entry: toIso(date, entry), lunchStart: toIso(date, lunchStart), lunchReturn: toIso(date, lunchReturn), exit: toIso(date, exit), reason, observation: detail });
  }, { onSuccess: onDone });

  const fullDay = Boolean(selectedReason?.fullDay);
  const valid = Boolean(employeeId && date && (fullDay || entry || lunchStart || lunchReturn || exit));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-black text-slate-950">{track ? 'Editar ponto' : 'Lancar ponto manual'}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button></div>
        {(save.error || employeesError) && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{save.error || employeesError}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Funcionario</span><select disabled={Boolean(track)} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"><option value="">{employeesLoading ? 'Carregando equipe...' : 'Selecione...'}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{normalizeDisplayName(employee.name)}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>Data da folha</span><input disabled={Boolean(track)} type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50" /></label>
          {!track && <label className="space-y-1 text-xs font-medium text-slate-600"><span>Motivo do ajuste</span><select value={reason} onChange={(event) => setReason(event.target.value as TimeTrackAdjustmentReason)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{ADJUSTMENT_REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
          {!fullDay && <><TimeField label="Entrada" value={entry} onChange={setEntry} /><TimeField label="Saida almoco" value={lunchStart} onChange={setLunchStart} /><TimeField label="Retorno almoco" value={lunchReturn} onChange={setLunchReturn} /><TimeField label="Saida" value={exit} onChange={setExit} /></>}
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Observacao complementar</span><input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={track ? track.observation ?? '' : selectedReason?.label} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        </div>
        {!employeesLoading && employees.length === 0 && <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Cadastre um funcionario ativo antes de lancar a folha de ponto.</p>}
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button><button onClick={() => valid && save.mutate().catch(() => {})} disabled={!valid || employees.length === 0 || save.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{save.loading ? 'Salvando...' : track ? 'Salvar ponto' : 'Lancar ponto'}</button></div>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-xs font-medium text-slate-600"><span>{label}</span><input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>;
}
