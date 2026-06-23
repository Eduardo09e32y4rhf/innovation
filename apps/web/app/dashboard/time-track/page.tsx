'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Clock3, Download, Edit3, FileText, Trash2, X, XCircle } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Company, type Employee, type TimeTrack, type RestDayMode, type TimeTrackAdjustmentReason } from '@/app/lib/api';
import { formatDate, formatMinutes } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { buildPdfShell, section, field, grid3, signatures, printPdf, type PdfCompanyInfo } from '@/app/lib/pdf-utils';

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
  statusDia: string;
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

function displayWorked(minutes?: number | null) {
  return minutes === null || minutes === undefined ? '-' : formatMinutes(minutes);
}

function displayBalance(minutes?: number | null) {
  return minutes === null || minutes === undefined ? '-' : formatMinutes(minutes);
}

function displayLunch(start?: string | null, end?: string | null) {
  if (!start && !end) return '--:--';
  return `${displayTime(start)} - ${displayTime(end)}`;
}
function toIso(date: string, time: string) {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#039;' }[char] ?? char));
}

function formatDocument(value?: string | null) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return value || '-';
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

function compareTimeTracks(a: TimeTrack, b: TimeTrack) {
  const nameComparison = collator.compare(normalizeDisplayName(a.employee?.name ?? ''), normalizeDisplayName(b.employee?.name ?? ''));
  if (nameComparison !== 0) return nameComparison;
  const dateComparison = toDateKey(a.date).localeCompare(toDateKey(b.date));
  if (dateComparison !== 0) return dateComparison;
  return displayTime(a.entry).localeCompare(displayTime(b.entry));
}
function buildMirrorRows(rows: TimeTrack[]): MirrorRow[] {
  return rows.map((row) => {
    const worked = row.totalWorked;
    const balance = row.dailyBalance;
    const observation = row.observation || 'Ponto normal';
    const fullDayCertificate = observation.toLowerCase().includes('atestado integral') || observation.toLowerCase().includes('feriado');
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
      horaExtra: balance === null || balance === undefined ? '--:--' : formatMinutes(minutesPositive(balance)),
      ausente: balance === null || balance === undefined ? '--:--' : formatMinutes(minutesNegative(balance)),
      adicionalNoturno: '--:--',
      trabalhado: displayWorked(worked),
      saldo: displayBalance(balance),
      statusDia: dayStatus(row),
      observacao: observation,
    };
  });
}

function dayStatus(row: TimeTrack) {
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

function sumMinutes(rows: TimeTrack[], field: 'totalWorked' | 'dailyBalance') {
  return rows.reduce((total, row) => total + (row[field] ?? 0), 0);
}

function downloadExcel(filename: string, rows: TimeTrack[], company: { name: string; document: string }) {
  const mirrorRows = buildMirrorRows(rows);
  const bodyRows = mirrorRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.funcionario)}</td><td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.dia)}</td>
      <td>${escapeHtml(row.entrada1)}</td><td>${escapeHtml(row.saida1)}</td><td>${escapeHtml(row.entrada2)}</td><td>${escapeHtml(row.saida2)}</td>
      <td>${escapeHtml(row.trabalhado)}</td><td>${escapeHtml(row.saldo)}</td><td>${escapeHtml(row.statusDia)}</td><td>${escapeHtml(row.observacao)}</td>
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

function openPrintableReport(rows: TimeTrack[], month: string, company: { name: string; document: string; logoUrl?: string | null }, employee?: Employee) {
  const title = employee ? `Espelho individual - ${normalizeDisplayName(employee.name)} - ${monthLabel(month)}` : `Espelho da empresa - ${monthLabel(month)}`;
  const companyInfo: PdfCompanyInfo = {
    name: company.name,
    document: company.document,
    logoUrl: company.logoUrl,
  };

  const body = employee ? buildIndividualBody(rows, employee, month) : buildCompanyBody(rows, month);
  const html = buildPdfShell({ title, landscape: true }, companyInfo, body);
  printPdf(html, `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

function buildIndividualBody(rows: TimeTrack[], employee: Employee, month: string): string {
  const mirrorRows = buildMirrorRows(rows);
  const totalWorked = formatMinutes(sumMinutes(rows, 'totalWorked'));
  const totalBalance = formatMinutes(sumMinutes(rows, 'dailyBalance'));
  const bodyRows = mirrorRows.map((row) => `
    <tr>
      <td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.dia)}</td><td>${escapeHtml(row.entrada1)}</td><td>${escapeHtml(row.saida1)}</td>
      <td>${escapeHtml(row.entrada2)}</td><td>${escapeHtml(row.saida2)}</td><td>${escapeHtml(row.abono)}</td><td>${escapeHtml(row.horaExtra)}</td>
      <td>${escapeHtml(row.ausente)}</td><td>${escapeHtml(row.adicionalNoturno)}</td><td>${escapeHtml(row.statusDia)}</td><td>${escapeHtml(row.observacao)}</td>
    </tr>`).join('');

  return `
    ${section('Informações do Colaborador', grid3([
      field('Matrícula', employee.id.slice(0, 8).toUpperCase()),
      field('Nome', normalizeDisplayName(employee.name)),
      field('CPF', formatDocument(employee.cpf)),
      field('Função', employee.position || '-'),
      field('Departamento', employee.department || '-'),
      field('Admissão', formatDate(employee.admissionDate)),
    ]))}
    ${section(`Registros de Ponto - ${monthLabel(month)}`, `
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0f172a;color:#fff;">
          <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Data</th>
          <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Dia</th>
          <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">1ª E.</th>
          <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">1ª S.</th>
          <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">2ª E.</th>
          <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">2ª S.</th>
          <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">Abono</th>
          <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">H.E.</th>
          <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">Ausente</th>
          <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">Ad. Not.</th>
          <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">Status</th>
          <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Observação</th>
        </tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    `)}
    ${section('Resumo do Período', `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#0f766e;">Registros</div>
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${rows.length}</div>
        </div>
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#0f766e;">Total Trabalhado</div>
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${escapeHtml(totalWorked)}</div>
        </div>
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#0f766e;">Saldo Final</div>
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${escapeHtml(totalBalance)}</div>
        </div>
      </div>
    `)}
    ${signatures(['Assinatura do Colaborador', 'Responsável pelo RH', 'Data de Conferência'])}
  `;
}

function buildCompanyBody(rows: TimeTrack[], month: string): string {
  const grouped = rows.reduce<Record<string, TimeTrack[]>>((acc, row) => {
    const key = row.employeeId;
    acc[key] = acc[key] ?? [];
    acc[key].push(row);
    return acc;
  }, {});
  const sections = Object.values(grouped).map((employeeRows) => {
    const first = employeeRows[0]?.employee;
    const bodyRows = buildMirrorRows(employeeRows).map((row) => `
      <tr><td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.dia)}</td><td>${escapeHtml(row.entrada1)}</td><td>${escapeHtml(row.saida1)}</td><td>${escapeHtml(row.entrada2)}</td><td>${escapeHtml(row.saida2)}</td><td>${escapeHtml(row.trabalhado)}</td><td>${escapeHtml(row.saldo)}</td><td>${escapeHtml(row.statusDia)}</td><td>${escapeHtml(row.observacao)}</td></tr>`).join('');
    return `
      ${first ? section(`Colaborador: ${normalizeDisplayName(first.name)}`, grid3([
        field('Matrícula', first.id.slice(0, 8).toUpperCase()),
        field('Nome', normalizeDisplayName(first.name)),
        field('CPF', formatDocument(first.cpf)),
        field('Função', first.position || '-'),
        field('Departamento', first.department || '-'),
        field('Admissão', formatDate(first.admissionDate)),
      ])) : ''}
      ${section('Registros de Ponto', `
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#0f172a;color:#fff;">
            <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Data</th>
            <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Dia</th>
            <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">1ª entrada</th>
            <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">1ª saída</th>
            <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">2ª entrada</th>
            <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">2ª saída</th>
            <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">Trabalhado</th>
            <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">Saldo</th>
            <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">Status</th>
            <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Observação</th>
          </tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      `)}
    `;
  }).join('');
  return `
    ${section('Resumo Geral', `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#64748b;">Funcionários</div>
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${Object.keys(grouped).length}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#64748b;">Registros</div>
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${rows.length}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#64748b;">Período</div>
          <div style="font-size:12px;font-weight:900;color:#0f172a;margin-top:4px;">${monthLabel(month)}</div>
        </div>
      </div>
    `)}
    ${sections}
  `;
}

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

  const activeEmployees = useMemo(() => (employees.data ?? []).filter((employee) => employee.status === 'ACTIVE').toSorted((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name))), [employees.data]);
  const departments = useMemo(() => [...new Set((employees.data ?? []).map((e) => e.department).filter(Boolean))].sort(), [employees.data]);
  const managers = useMemo(() => (employees.data ?? []).filter((e) => (employees.data ?? []).some((sub) => sub.managerId === e.id)).toSorted((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name))), [employees.data]);
  const units = useMemo(() => [...new Set((employees.data ?? []).map((e) => e.unit).filter(Boolean))].sort() as string[], [employees.data]);

  const rows = useMemo(() => {
    return (tracks.data ?? [])
      .filter((row) => {
        if (employeeFilter && row.employeeId !== employeeFilter) return false;
        if (monthFilter && !toDateKey(row.date).startsWith(monthFilter)) return false;
        if (departmentFilter && row.employee?.department !== departmentFilter) return false;
        if (managerFilter && row.employee?.managerId !== managerFilter) return false;
        if (unitFilter && row.employee?.unit !== unitFilter) return false;
        return true;
      })
      .toSorted(compareTimeTracks);
  }, [tracks.data, employeeFilter, monthFilter, departmentFilter, managerFilter, unitFilter]);

  const selectedEmployee = activeEmployees.find((employee) => employee.id === employeeFilter) ?? rows[0]?.employee;
  const rowsByEmployee = useMemo(() => rows.reduce<Record<string, TimeTrack[]>>((acc, row) => {
    acc[row.employeeId] = acc[row.employeeId] ?? [];
    acc[row.employeeId].push(row);
    return acc;
  }, {}), [rows]);
  const visibleEmployees = useMemo(() => activeEmployees.filter((employee) => {
    if (employeeFilter && employee.id !== employeeFilter) return false;
    if (departmentFilter && employee.department !== departmentFilter) return false;
    if (managerFilter && employee.managerId !== managerFilter) return false;
    if (unitFilter && employee.unit !== unitFilter) return false;
    return true;
  }), [activeEmployees, employeeFilter, departmentFilter, managerFilter, unitFilter]);
  const editingEmployeeId = editing?.employeeId ?? null;
  const reportCompany = useMemo(() => {
    const c = company.data;
    return {
      name: normalizeDisplayName(c?.name ?? 'Empresa'),
      document: formatDocument(c?.document ?? null),
      logoUrl: c?.logoUrl ?? null,
    };
  }, [company.data]);
  const remove = useMutation((id: string) => api.timeTrack.delete(id), { onSuccess: () => tracks.refetch() });

  const canClockIn = Boolean(profile && !['DEV', 'COMERCIAL', 'CONSULTA'].includes(profile));
  const canApprove = canManage || isGestor;
  const canDownloadOwnOrTeam = canManage || isGestor || isFuncionario;
  const pendingTracks = useQuery(() => api.timeTrack.listPending(), [], { enabled: canApprove });
  const approveMutation = useMutation(
    (params: { id: string; approved: boolean }) => api.timeTrack.approve(params.id, params.approved),
    { onSuccess: () => { pendingTracks.refetch(); tracks.refetch(); } },
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      tracks.refetch();
      if (canApprove) pendingTracks.refetch();
    }, 30000);
    return () => window.clearInterval(id);
  }, [tracks, pendingTracks, canApprove]);

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
          {canClockIn && (
            <Link href="/dashboard/time-track/clock-in" className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
              <Clock3 size={14} /> Bater ponto
            </Link>
          )}
          {canManage && (
            <>
              <button onClick={() => downloadExcel(`folha-ponto-${selectedEmployee?.name ?? 'empresa'}-${monthFilter || 'todos'}.xls`, rows, reportCompany)} disabled={rows.length === 0 || company.loading || isRefreshingTracks} className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black disabled:opacity-50">
                <Download size={14} /> Exportar Excel
              </button>
              <button onClick={() => openPrintableReport(rows, monthFilter, reportCompany, employeeFilter ? selectedEmployee : undefined)} disabled={rows.length === 0 || company.loading || isRefreshingTracks} className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black disabled:opacity-50">
                <FileText size={14} /> {employeeFilter ? 'PDF individual' : 'PDF empresa'}
              </button>
              <button onClick={() => setBulkOpen(true)} disabled={isRefreshingTracks} className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black">
                <Clock3 size={14} /> Lançar em lote
              </button>
              <button onClick={() => setOpen(true)} disabled={isRefreshingTracks} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
                <Clock3 size={14} /> Lançar ponto
              </button>
            </>
          )}
        </div>
      </header>

      {canApprove && (pendingTracks.data ?? []).length > 0 && (
        <section className="ops-card rounded-[8px] border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-3 text-sm font-black text-amber-900">Pontos manuais pendentes de aprovacao ({(pendingTracks.data ?? []).length})</h3>
          {approveMutation.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{approveMutation.error}</p>}
          <div className="space-y-2">
            {(pendingTracks.data ?? []).map((track) => (
              <div key={track.id} className="flex items-center justify-between rounded-[8px] border border-amber-200 bg-white px-4 py-3">
                <div className="text-xs">
                  <p className="font-bold text-slate-950">{normalizeDisplayName(track.employee?.name ?? '-')}</p>
                  <p className="text-slate-500">{formatDate(track.date)} - {track.manualReason ?? 'Lancamento manual'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveMutation.mutate({ id: track.id, approved: true }).catch(() => {})} disabled={approveMutation.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-60"><Check size={12} />Aprovar</button>
                  <button onClick={() => approveMutation.mutate({ id: track.id, approved: false }).catch(() => {})} disabled={approveMutation.loading} className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-rose-600 px-3 text-[11px] font-bold text-white disabled:opacity-60"><XCircle size={12} />Recusar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isFuncionario && (
        <section className="grid gap-3 rounded-[14px] border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Funcionário</span>
            <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">
              <option value="">Todos</option>
              {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{normalizeDisplayName(employee.name)}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Mês</span>
            <input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Departamento</span>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">
              <option value="">Todos</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Gestor</span>
            <select value={managerFilter} onChange={(event) => setManagerFilter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">
              <option value="">Todos</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{normalizeDisplayName(m.name)}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Unidade</span>
            <select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">
              <option value="">Todas</option>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </section>
      )}

      {isFuncionario && (
        <section className="grid gap-3 rounded-[14px] border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Mês da folha</span>
            <input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="h-10 w-full max-w-[220px] rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
          </label>
        </section>
      )}


      {remove.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{remove.error}</p>}
      {isRefreshingTracks && <p className="rounded-[8px] border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700">Atualizando a folha de ponto...</p>}
      {tracks.error && tracks.data && <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">Nao foi possivel atualizar agora. Os ultimos dados carregados continuam visiveis.</p>}

      {isInitialTracksLoading ? <LoadingState label="Carregando folha de ponto..." /> : tracks.error && !tracks.data ? <ErrorState message={tracks.error} onRetry={tracks.refetch} /> : isFuncionario ? (
        rows.length === 0 ? <EmptyState message="Nenhum registro de ponto encontrado." /> : <TimeRowsTable rows={rows} canManage={false} isRefreshing={isRefreshingTracks} removeLoading={remove.loading} onEdit={setEditing} onDelete={handleDelete} />
      ) : visibleEmployees.length === 0 ? <EmptyState message="Nenhum colaborador encontrado para o filtro selecionado." /> : (
        <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
            <h3 className="text-sm font-black text-slate-950">Colaboradores da folha</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Selecione um colaborador para editar ajustes ou baixar a folha individual.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleEmployees.map((employee) => {
              const employeeRows = rowsByEmployee[employee.id] ?? [];
              return (
                <div key={employee.id} className="bg-white px-6 py-5 transition-all duration-200 hover:bg-slate-50/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white">
                        {normalizeDisplayName(employee.name).charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-black text-slate-950">{normalizeDisplayName(employee.name)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canDownloadOwnOrTeam && (
                        <button onClick={() => openPrintableReport(employeeRows, monthFilter, reportCompany, employee)} disabled={employeeRows.length === 0 || company.loading || isRefreshingTracks} className="btn-outline-premium inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-[11px] font-black disabled:opacity-50"><FileText size={13} /> Folha</button>
                      )}
                      <button onClick={() => { setEditing({ ...employeeRows[0], employee } as unknown as TimeTrack); setOpen(true); }} disabled={employeeRows.length === 0 || isRefreshingTracks} className="btn-outline inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-[11px] font-black"><Edit3 size={13} /> Editar</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {canManage && (open || bulkOpen || Boolean(editing)) && <ManualTimeSheetModal employees={activeEmployees} employeesLoading={employees.loading} employeesError={employees.error} defaultEmployeeId={editingEmployeeId ?? employeeFilter} track={editing ?? undefined} bulk={bulkOpen} onClose={() => { setOpen(false); setBulkOpen(false); setEditing(null); }} onDone={() => { setOpen(false); setBulkOpen(false); setEditing(null); tracks.refetch(); }} />}
    </div>
  );
}


function TimeRowsTable({ rows, canManage, isRefreshing, removeLoading, onEdit, onDelete, compact = false }: { rows: TimeTrack[]; canManage: boolean; isRefreshing: boolean; removeLoading: boolean; onEdit: (row: TimeTrack) => void; onDelete: (row: TimeTrack) => void; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${compact ? 'min-w-[860px]' : 'min-w-[960px]'} text-left`}>
        <thead>
          <tr className="bg-gradient-to-r from-slate-100 to-slate-50 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Entrada</th>
            <th className="px-4 py-3">Almoço</th>
            <th className="px-4 py-3">Saída</th>
            <th className="px-4 py-3">Trabalhado</th>
            <th className="px-4 py-3">Saldo</th>
            <th className="px-4 py-3">Status</th>
            {canManage && <th className="px-4 py-3 text-right">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id} className={`border-t border-slate-100 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50/70 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
              <td className="px-4 py-3 text-slate-900">{formatDate(row.date)}</td>
              <td className="px-4 py-4 font-black text-slate-950">{displayTime(row.entry)}</td>
              <td className="px-4 py-4 text-slate-600">{displayLunch(row.lunchStart, row.lunchReturn)}</td>
              <td className="px-4 py-4 font-black text-slate-950">{displayTime(row.exit)}</td>
              <td className="px-4 py-4 text-slate-600">{displayWorked(row.totalWorked)}</td>
              <td className={`px-4 py-4 font-black ${(row.dailyBalance ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{displayBalance(row.dailyBalance)}</td>
              <td className="px-4 py-4">
                <StatusBadge status={dayStatus(row)} />
              </td>
              {canManage && <td className="px-4 py-4"><div className="flex justify-end gap-2"><button onClick={() => onEdit(row)} disabled={isRefreshing || removeLoading} className="btn-outline-premium inline-flex h-8 items-center gap-2 px-3 text-[11px]"><Edit3 size={12} />Editar</button><button onClick={() => onDelete(row)} disabled={isRefreshing || removeLoading} className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-gradient-to-r from-rose-500 to-pink-600 px-3 text-[11px] font-black text-white shadow-md shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-40"><Trash2 size={12} />Excluir</button></div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Normal': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    'Pendente': 'bg-amber-50 text-amber-700 border-amber-200/60',
    'Rejeitado': 'bg-rose-50 text-rose-700 border-rose-200/60',
    'Feriado': 'bg-teal-50 text-teal-700 border-teal-200/60',
    'Atestado integral': 'bg-violet-50 text-violet-700 border-violet-200/60',
    'Folga': 'bg-sky-50 text-sky-700 border-sky-200/60',
    'Ajuste manual': 'bg-orange-50 text-orange-700 border-orange-200/60',
    'Falta': 'bg-rose-50 text-rose-700 border-rose-200/60',
  };
  return <span className={`inline-flex items-center rounded-[6px] border px-2.5 py-1 text-[10px] font-black ${colors[status] || 'bg-slate-100 text-slate-600 border-slate-200/60'}`}>{status}</span>;
}

function ManualTimeSheetModal({ employees, employeesLoading, employeesError, defaultEmployeeId, track, bulk, onClose, onDone }: { employees: Employee[]; employeesLoading: boolean; employeesError: string | null; defaultEmployeeId: string; track?: TimeTrack; bulk?: boolean; onClose: () => void; onDone: () => void }) {
  const initialDate = track ? toDateKey(track.date) : new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<'single' | 'bulk'>(bulk ? 'bulk' : 'single');
  const [bulkMode, setBulkMode] = useState<'day' | 'period'>('day');
  const [employeeId, setEmployeeId] = useState(track?.employeeId ?? defaultEmployeeId);
  const initialEmployeeScale = employees.find((employee) => employee.id === (track?.employeeId ?? defaultEmployeeId))?.workScale;
  const [date, setDate] = useState(initialDate);
  const [startDate, setStartDate] = useState(initialDate.slice(0, 8) + '01');
  const [endDate, setEndDate] = useState(initialDate);
  const [bulkSearch, setBulkSearch] = useState('');
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
  const selectedReason = ADJUSTMENT_REASONS.find((item) => item.value === reason);
  const selectedEmployee = employees.find((employee) => employee.id === employeeId);
  const fullDay = Boolean(selectedReason?.fullDay);

  function applyEmployeeScaleDefaults(nextEmployeeId: string) {
    const employee = employees.find((item) => item.id === nextEmployeeId);
    setDaysOff(defaultDaysOff(employee?.workScale));
    const cycle = defaultCycle(employee?.workScale);
    setCycleWorkDays(cycle.workDays);
    setCycleOffDays(cycle.offDays);
  }

  function toggleDayOff(day: number) {
    setDaysOff((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b));
  }
  const matchedEmployees = useMemo(() => matchEmployees(employees, bulkSearch), [employees, bulkSearch]);

  const save = useMutation(async () => {
    const payload = { entry: toIso(date, entry), lunchStart: toIso(date, lunchStart), lunchReturn: toIso(date, lunchReturn), exit: toIso(date, exit), reason, observation: detail };
    if (track) {
      await api.timeTrack.update(track.id, { entry: payload.entry, lunchStart: payload.lunchStart, lunchReturn: payload.lunchReturn, exit: payload.exit, observation: detail.trim() || track.observation || null });
      return;
    }
    if (mode === 'bulk') {
      const employeeIds = bulkMode === 'period' ? [employeeId] : matchedEmployees.map((employee) => employee.id);
      const base = { employeeIds, entry: payload.entry, lunchStart: payload.lunchStart, lunchReturn: payload.lunchReturn, exit: payload.exit, reason, observation: detail, restDayMode, daysOff, cycleStartDate, cycleWorkDays, cycleOffDays };
      await api.timeTrack.manualBulk(bulkMode === 'period' ? { ...base, startDate, endDate } : { ...base, date });
      return;
    }
    await api.timeTrack.manual({ employeeId, date, ...payload });
  }, { onSuccess: onDone });

  const hasTime = fullDay || entry || lunchStart || lunchReturn || exit;
  const bulkValid = bulkMode === 'period' ? Boolean(employeeId && startDate && endDate && hasTime) : Boolean(matchedEmployees.length && date && hasTime);
  const valid = mode === 'bulk' ? bulkValid : Boolean(employeeId && date && hasTime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-black text-slate-950">{track ? 'Editar ponto' : mode === 'bulk' ? 'Lançar ponto em lote' : 'Lançar ponto manual'}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button></div>
        {(save.error || employeesError) && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{save.error || employeesError}</p>}
        {!track && <div className="mb-4 grid grid-cols-2 gap-2 rounded-[8px] bg-slate-100 p-1 text-xs font-black"><button type="button" onClick={() => setMode('single')} className={`h-9 rounded-[7px] ${mode === 'single' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Individual</button><button type="button" onClick={() => setMode('bulk')} className={`h-9 rounded-[7px] ${mode === 'bulk' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Lote</button></div>}

        <div className="grid gap-3 sm:grid-cols-2">
          {mode === 'bulk' && !track ? (
            <>
              <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Tipo de lote</span><select value={bulkMode} onChange={(event) => setBulkMode(event.target.value as 'day' | 'period')} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"><option value="day">Um dia para vários colaboradores</option><option value="period">Período inteiro para um colaborador</option></select></label>
              {bulkMode === 'day' ? <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Matrícula, nome ou CPF</span><textarea value={bulkSearch} onChange={(event) => setBulkSearch(event.target.value)} placeholder="Digite um por linha ou separado por vírgula" className="min-h-24 w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" /><span className="block text-[11px] text-slate-400">Encontrados: {matchedEmployees.length}</span></label> : <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Funcionário</span><select value={employeeId} onChange={(event) => { setEmployeeId(event.target.value); applyEmployeeScaleDefaults(event.target.value); }} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"><option value="">Selecione...</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{normalizeDisplayName(employee.name)}</option>)}</select></label>}
              {bulkMode === 'period' ? <><label className="space-y-1 text-xs font-medium text-slate-600"><span>Data inicial</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label><label className="space-y-1 text-xs font-medium text-slate-600"><span>Data final</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label></> : <label className="space-y-1 text-xs font-medium text-slate-600"><span>Data da folha</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>}
            </>
          ) : (
            <>
              <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Funcionário</span><select disabled={Boolean(track)} value={employeeId} onChange={(event) => { setEmployeeId(event.target.value); applyEmployeeScaleDefaults(event.target.value); }} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"><option value="">{employeesLoading ? 'Carregando equipe...' : 'Selecione...'}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{normalizeDisplayName(employee.name)}</option>)}</select></label>
              <label className="space-y-1 text-xs font-medium text-slate-600"><span>Data da folha</span><input disabled={Boolean(track)} type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50" /></label>
            </>
          )}
          {mode === 'bulk' && !track && (
            <section className="sm:col-span-2 rounded-[10px] border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-700">Folgas da escala serão respeitadas automaticamente.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Como calcular as folgas{selectedEmployee?.workScale ? ` (${selectedEmployee.workScale})` : ''}</span><select value={restDayMode} onChange={(event) => setRestDayMode(event.target.value as RestDayMode)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"><option value="employee_scale">Usar padrão da escala cadastrada</option><option value="fixed_weekly">Folga fixa na semana</option><option value="cycle">Escala alternada / ciclo</option></select></label>
                {(restDayMode === 'fixed_weekly' || restDayMode === 'employee_scale') && <div className="space-y-2 sm:col-span-2"><p className="text-xs font-medium text-slate-600">Dias de folga</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{WEEKDAYS.map((day) => <label key={day.value} className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={daysOff.includes(day.value)} onChange={() => toggleDayOff(day.value)} /> {day.label}</label>)}</div></div>}
                {restDayMode === 'cycle' && <><label className="space-y-1 text-xs font-medium text-slate-600"><span>Início do ciclo</span><input type="date" value={cycleStartDate} onChange={(event) => setCycleStartDate(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500" /></label><label className="space-y-1 text-xs font-medium text-slate-600"><span>Dias trabalhados</span><input type="number" min={1} max={31} value={cycleWorkDays} onChange={(event) => setCycleWorkDays(Number(event.target.value))} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500" /></label><label className="space-y-1 text-xs font-medium text-slate-600"><span>Dias de folga</span><input type="number" min={1} max={31} value={cycleOffDays} onChange={(event) => setCycleOffDays(Number(event.target.value))} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500" /></label></>}
              </div>
            </section>
          )}
          {!track && <label className="space-y-1 text-xs font-medium text-slate-600"><span>Motivo do ajuste</span><select value={reason} onChange={(event) => setReason(event.target.value as TimeTrackAdjustmentReason)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{ADJUSTMENT_REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
          {!fullDay && <><TimeField label="Entrada" value={entry} onChange={setEntry} /><TimeField label="Saída almoço" value={lunchStart} onChange={setLunchStart} /><TimeField label="Retorno almoço" value={lunchReturn} onChange={setLunchReturn} /><TimeField label="Saída" value={exit} onChange={setExit} /></>}
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2"><span>Observação complementar</span><input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={track ? track.observation ?? '' : selectedReason?.label} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        </div>
        {!employeesLoading && employees.length === 0 && <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Cadastre um funcionário ativo antes de lançar a folha de ponto.</p>}
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button><button onClick={() => valid && save.mutate().catch(() => {})} disabled={!valid || employees.length === 0 || save.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{save.loading ? 'Salvando...' : track ? 'Salvar ponto' : mode === 'bulk' ? 'Lançar lote' : 'Lançar ponto'}</button></div>
      </div>
    </div>
  );
}

function matchEmployees(employees: Employee[], query: string) {
  const terms = query.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
  if (!terms.length) return [];
  return employees.filter((employee) => terms.some((term) => {
    const cleanTerm = term.toLowerCase();
    const digits = term.replace(/\D/g, '');
    return employee.name.toLowerCase().includes(cleanTerm)
      || employee.cpf.replace(/\D/g, '').includes(digits)
      || (employee.registration ?? '').toLowerCase().includes(cleanTerm);
  }));
}
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-xs font-medium text-slate-600"><span>{label}</span><input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>;
}