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
  { value: 'ajuste_erro_marcacao', label: 'Ajuste - erro de marcação' },
];

type CompanyPrintInfo = { name: string; document: string };
type MirrorRow = {
  funcionario: string;
  employee?: Employee;
  data: string;
  dia: string;
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
  abono: string;
  horaExtra: string;
  ausente: string;
  adicionalNoturno: string;
  trabalhado: string;
  saldo: string;
  observacao: string;
};

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
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] ?? char));
}

function formatDocument(value?: string | null) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return value || '-';
}

function getCompanyInfo(): CompanyPrintInfo {
  if (typeof window === 'undefined') return { name: 'Empresa', document: '-' };
  try {
    const raw = window.localStorage.getItem('company');
    const company = raw ? JSON.parse(raw) : null;
    return {
      name: normalizeDisplayName(company?.name ?? 'Empresa'),
      document: formatDocument(company?.document ?? company?.cnpj ?? company?.taxId ?? null),
    };
  } catch {
    return { name: 'Empresa', document: '-' };
  }
}

function monthLabel(month: string) {
  if (!month) return 'Todos os períodos';
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  const date = new Date(year, monthNumber - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function periodLabel(month: string) {
  if (!month) return 'Período completo';
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 0);
  return `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`;
}

function dateWeekday(value?: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, (char) => char.toUpperCase());
}

function minutesPositive(minutes?: number | null) {
  return Math.max(minutes ?? 0, 0);
}

function minutesNegative(minutes?: number | null) {
  return Math.abs(Math.min(minutes ?? 0, 0));
}

function buildMirrorRows(rows: TimeTrack[]): MirrorRow[] {
  return rows.map((row) => {
    const worked = row.totalWorked ?? 0;
    const balance = row.dailyBalance ?? 0;
    const observation = row.observation || 'Ponto normal';
    const fullDayCertificate = observation.toLowerCase().includes('atestado integral');
    return {
      funcionario: normalizeDisplayName(row.employee?.name ?? ''),
      employee: row.employee,
      data: formatDate(row.date),
      dia: dateWeekday(row.date),
      entrada1: displayTime(row.entry),
      saida1: displayTime(row.lunchStart),
      entrada2: displayTime(row.lunchReturn),
      saida2: displayTime(row.exit),
      abono: fullDayCertificate ? '08:00' : '--:--',
      horaExtra: formatMinutes(minutesPositive(balance)),
      ausente: formatMinutes(minutesNegative(balance)),
      adicionalNoturno: '--:--',
      trabalhado: formatMinutes(worked),
      saldo: formatMinutes(balance),
      observacao: observation,
    };
  });
}

function sumMinutes(rows: TimeTrack[], field: 'totalWorked' | 'dailyBalance') {
  return rows.reduce((total, row) => total + (row[field] ?? 0), 0);
}

function downloadExcel(filename: string, rows: TimeTrack[]) {
  const company = getCompanyInfo();
  const mirrorRows = buildMirrorRows(rows);
  const bodyRows = mirrorRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.funcionario)}</td><td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.dia)}</td>
      <td>${escapeHtml(row.entrada1)}</td><td>${escapeHtml(row.saida1)}</td><td>${escapeHtml(row.entrada2)}</td><td>${escapeHtml(row.saida2)}</td>
      <td>${escapeHtml(row.trabalhado)}</td><td>${escapeHtml(row.saldo)}</td><td>${escapeHtml(row.observacao)}</td>
    </tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
    <h2>Espelho de ponto</h2>
    <p><strong>Empresa:</strong> ${escapeHtml(company.name)} &nbsp; <strong>CNPJ:</strong> ${escapeHtml(company.document)}</p>
    <table border="1">
      <thead><tr><th>Funcionário</th><th>Data</th><th>Dia</th><th>1ª entrada</th><th>1ª saída</th><th>2ª entrada</th><th>2ª saída</th><th>Trabalhado</th><th>Saldo</th><th>Observação</th></tr></thead>
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

function employeeHeader(employee?: Employee) {
  if (!employee) return '';
  return `
    <section class="employee-grid">
      <div><strong>Matrícula:</strong> ${escapeHtml(employee.id.slice(0, 8).toUpperCase())}</div>
      <div><strong>Nome:</strong> ${escapeHtml(normalizeDisplayName(employee.name))}</div>
      <div><strong>CPF:</strong> ${escapeHtml(formatDocument(employee.cpf))}</div>
      <div><strong>Função:</strong> ${escapeHtml(employee.position || '-')}</div>
      <div><strong>Departamento:</strong> ${escapeHtml(employee.department || '-')}</div>
      <div><strong>Admissão:</strong> ${escapeHtml(formatDate(employee.admissionDate))}</div>
    </section>`;
}

function renderIndividualReport(rows: TimeTrack[], employee: Employee | undefined, company: CompanyPrintInfo, month: string) {
  const mirrorRows = buildMirrorRows(rows);
  const totalWorked = formatMinutes(sumMinutes(rows, 'totalWorked'));
  const totalBalance = formatMinutes(sumMinutes(rows, 'dailyBalance'));
  const bodyRows = mirrorRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.dia)}</td><td>${escapeHtml(row.entrada1)}</td><td>${escapeHtml(row.saida1)}</td>
      <td>${escapeHtml(row.entrada2)}</td><td>${escapeHtml(row.saida2)}</td><td>${escapeHtml(row.abono)}</td><td>${escapeHtml(row.horaExtra)}</td>
      <td>${escapeHtml(row.ausente)}</td><td>${escapeHtml(row.adicionalNoturno)}</td><td>${escapeHtml(row.observacao)}</td>
    </tr>`).join('');
  return `
    <h1>Espelho de ponto individual</h1>
    <section class="meta"><span><strong>Período:</strong> ${escapeHtml(periodLabel(month))}</span><span><strong>Emissão:</strong> ${escapeHtml(new Date().toLocaleString('pt-BR'))}</span></section>
    <section class="company"><span><strong>Empresa:</strong> ${escapeHtml(company.name)}</span><span><strong>CNPJ:</strong> ${escapeHtml(company.document)}</span></section>
    ${employeeHeader(employee)}
    <table><thead><tr><th>Data</th><th>Dia</th><th>1ª E.</th><th>1ª S.</th><th>2ª E.</th><th>2ª S.</th><th>Abono</th><th>H.E.</th><th>Ausente</th><th>Ad. Not.</th><th>Observação</th></tr></thead><tbody>${bodyRows}</tbody></table>
    <section class="summary"><strong>Resumo do período:</strong> Horas trabalhadas: ${escapeHtml(totalWorked)} | Saldo final: ${escapeHtml(totalBalance)}</section>
    <section class="signatures"><div>Assinatura do colaborador</div><div>Responsável pelo RH</div></section>`;
}

function renderCompanyReport(rows: TimeTrack[], company: CompanyPrintInfo, month: string) {
  const grouped = rows.reduce<Record<string, TimeTrack[]>>((acc, row) => {
    const key = row.employeeId;
    acc[key] = acc[key] ?? [];
    acc[key].push(row);
    return acc;
  }, {});
  const sections = Object.values(grouped).map((employeeRows) => {
    const first = employeeRows[0]?.employee;
    const bodyRows = buildMirrorRows(employeeRows).map((row) => `
      <tr><td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.dia)}</td><td>${escapeHtml(row.entrada1)}</td><td>${escapeHtml(row.saida1)}</td><td>${escapeHtml(row.entrada2)}</td><td>${escapeHtml(row.saida2)}</td><td>${escapeHtml(row.trabalhado)}</td><td>${escapeHtml(row.saldo)}</td><td>${escapeHtml(row.observacao)}</td></tr>`).join('');
    return `<section class="employee-block">
      <h2>${escapeHtml(normalizeDisplayName(first?.name ?? 'Funcionário'))}</h2>
      ${employeeHeader(first)}
      <table><thead><tr><th>Data</th><th>Dia</th><th>1ª entrada</th><th>1ª saída</th><th>2ª entrada</th><th>2ª saída</th><th>Trabalhado</th><th>Saldo</th><th>Observação</th></tr></thead><tbody>${bodyRows}</tbody></table>
    </section>`;
  }).join('');
  return `
    <h1>Espelho de ponto da empresa</h1>
    <section class="meta"><span><strong>Período:</strong> ${escapeHtml(periodLabel(month))}</span><span><strong>Emissão:</strong> ${escapeHtml(new Date().toLocaleString('pt-BR'))}</span></section>
    <section class="company"><span><strong>Empresa:</strong> ${escapeHtml(company.name)}</span><span><strong>CNPJ:</strong> ${escapeHtml(company.document)}</span></section>
    <section class="summary"><strong>Total de funcionários no relatório:</strong> ${Object.keys(grouped).length} | <strong>Registros:</strong> ${rows.length}</section>
    ${sections}`;
}

function openPrintableReport(rows: TimeTrack[], month: string, employee?: Employee) {
  const company = getCompanyInfo();
  const title = employee ? `Espelho individual - ${normalizeDisplayName(employee.name)} - ${monthLabel(month)}` : `Espelho da empresa - ${monthLabel(month)}`;
  const content = employee ? renderIndividualReport(rows, employee, company, month) : renderCompanyReport(rows, company, month);
  const win = window.open('', '_blank');
  if (!win) {
    window.alert('Não foi possível abrir o relatório. Verifique se o navegador bloqueou pop-ups.');
    return;
  }
  win.document.open();
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
    <style>
      @page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;background:#f8fafc;font-size:11px}.toolbar{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 18px;background:#0f172a;color:white}.toolbar button{border:0;border-radius:6px;background:#0f766e;color:white;padding:8px 12px;font-weight:700;cursor:pointer}.page{background:white;margin:14px auto;padding:18px;max-width:1180px;box-shadow:0 10px 30px rgba(15,23,42,.12)}h1{margin:0 0 10px;text-align:center;font-size:16px;text-transform:uppercase;letter-spacing:.04em}h2{margin:18px 0 8px;font-size:13px}.meta,.company,.employee-grid,.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px;border-top:1px solid #94a3b8;padding:8px 0}.employee-grid{grid-template-columns:repeat(3,minmax(0,1fr))}table{width:100%;border-collapse:collapse;margin-top:10px;table-layout:fixed}th,td{border:1px solid #475569;padding:4px 5px;vertical-align:top;word-break:break-word}th{background:#e5e7eb;text-align:center;font-weight:700}td{text-align:center}td:last-child{text-align:left}.employee-block{break-inside:avoid;margin-top:14px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:38px}.signatures div{border-top:1px solid #111827;text-align:center;padding-top:8px}@media print{body{background:white}.toolbar{display:none}.page{margin:0;padding:0;box-shadow:none;max-width:none}.employee-block{page-break-inside:avoid}}
    </style></head><body><div class="toolbar"><strong>${escapeHtml(title)}</strong><button onclick="window.print()">Imprimir ou salvar em PDF</button></div><main class="page">${content}</main></body></html>`);
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

  const selectedEmployee = activeEmployees.find((employee) => employee.id === employeeFilter) ?? rows[0]?.employee;
  const remove = useMutation((id: string) => api.timeTrack.delete(id), { onSuccess: () => tracks.refetch() });

  async function handleDelete(row: TimeTrack) {
    const employeeName = normalizeDisplayName(row.employee?.name ?? 'funcionário');
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
            <Download size={14} /> Exportar Excel
          </button>
          <button onClick={() => openPrintableReport(rows, monthFilter, employeeFilter ? selectedEmployee : undefined)} disabled={rows.length === 0} className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black disabled:opacity-50">
            <FileText size={14} /> {employeeFilter ? 'PDF individual' : 'PDF empresa'}
          </button>
          <button onClick={() => setOpen(true)} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
            <Clock3 size={14} /> Lançar ponto
          </button>
        </div>
      </header>

      <section className="ops-card grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px]">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Filtrar por funcionário</span>
          <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
            <option value="">Todos os funcionários</option>
            {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{normalizeDisplayName(employee.name)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Mês da folha</span>
          <input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
        </label>
      </section>

      {remove.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{remove.error}</p>}

      {tracks.loading ? <LoadingState label="Carregando folha de ponto..." /> : tracks.error ? <ErrorState message={tracks.error} onRetry={tracks.refetch} /> : rows.length === 0 ? <EmptyState message="Nenhum registro de ponto para o filtro selecionado." /> : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[1040px] text-left">
              <thead><tr className="text-[11px] font-medium text-slate-500"><th className="pb-3 pr-4">Funcionário</th><th className="pb-3 pr-4">Data</th><th className="pb-3 pr-4">Entrada</th><th className="pb-3 pr-4">Almoço</th><th className="pb-3 pr-4">Saída</th><th className="pb-3 pr-4">Trabalhado</th><th className="pb-3 pr-4">Saldo</th><th className="pb-3 pr-4">Motivo</th><th className="pb-3">Ações</th></tr></thead>
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
        <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-black text-slate-950">{track ? 'Editar ponto' : 'Lançar ponto manual'}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button></div>
        {(save.error || employeesError) && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{save.error || employeesError}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Funcionário</span><select disabled={Boolean(track)} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"><option value="">{employeesLoading ? 'Carregando equipe...' : 'Selecione...'}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{normalizeDisplayName(employee.name)}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>Data da folha</span><input disabled={Boolean(track)} type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50" /></label>
          {!track && <label className="space-y-1 text-xs font-medium text-slate-600"><span>Motivo do ajuste</span><select value={reason} onChange={(event) => setReason(event.target.value as TimeTrackAdjustmentReason)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{ADJUSTMENT_REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
          {!fullDay && <><TimeField label="Entrada" value={entry} onChange={setEntry} /><TimeField label="Saída almoço" value={lunchStart} onChange={setLunchStart} /><TimeField label="Retorno almoço" value={lunchReturn} onChange={setLunchReturn} /><TimeField label="Saída" value={exit} onChange={setExit} /></>}
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Observação complementar</span><input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={track ? track.observation ?? '' : selectedReason?.label} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        </div>
        {!employeesLoading && employees.length === 0 && <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Cadastre um funcionário ativo antes de lançar a folha de ponto.</p>}
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button><button onClick={() => valid && save.mutate().catch(() => {})} disabled={!valid || employees.length === 0 || save.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{save.loading ? 'Salvando...' : track ? 'Salvar ponto' : 'Lançar ponto'}</button></div>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-xs font-medium text-slate-600"><span>{label}</span><input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>;
}
