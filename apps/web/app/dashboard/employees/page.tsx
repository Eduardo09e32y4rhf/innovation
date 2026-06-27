'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Edit3, FileText, Search, Trash2, UserMinus, UserPlus, Users, Filter, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Company, type Employee, type TimeTrack } from '@/app/lib/api';
import { EMPLOYEE_STATUS_LABEL, formatDate, formatMinutes, formatTime } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { buildPdfShell, section, infoGrid, pdfTable, signatureBlock, printPdf, type PdfCompanyInfo } from '@/app/lib/pdf-utils';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canEdit = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';
  const canDownloadSheet = profile === 'RH';
  const isGestor = profile === 'GESTOR';
  const { data, loading, error, refetch } = useQuery(() => api.employees.list(), []);
  const company = useQuery(() => api.companies.me(), []);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const terminate = useMutation((id: string) => api.employees.terminate(id), { onSuccess: () => refetch() });
  const remove = useMutation((id: string) => api.employees.delete(id), { onSuccess: () => refetch() });

  const employees = data ?? [];
  const managerById = useMemo(() => new Map(employees.map((employee) => [employee.id, normalizeDisplayName(employee.name)])), [employees]);
  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = search.replace(/\D/g, '');
    return employees
      .filter((employee) => {
        if (!term && !digits) return true;
        const managerName = employee.managerId ? managerById.get(employee.managerId) ?? '' : '';
        return normalizeDisplayName(employee.name).toLowerCase().includes(term)
          || String(employee.registration ?? '').toLowerCase().includes(term)
          || String(employee.department ?? '').toLowerCase().includes(term)
          || managerName.toLowerCase().includes(term)
          || employee.cpf.replace(/\D/g, '').includes(digits);
      })
      .toSorted((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name)));
  }, [employees, managerById, search]);

  const activeCount = employees.filter(e => e.status === 'ACTIVE').length;
  const inactiveCount = employees.filter(e => e.status === 'INACTIVE').length;
  const terminatedCount = employees.filter(e => e.status === 'TERMINATED').length;

  async function handleTerminate(employee: Employee) {
    if (employee.status === 'TERMINATED') return;
    const ok = window.confirm(`Desligar ${normalizeDisplayName(employee.name)}? O cadastro será marcado como desligado.`);
    if (!ok) return;
    await terminate.mutate(employee.id).catch(() => {});
  }

  async function handleDelete(employee: Employee) {
    const expected = normalizeDisplayName(employee.name);
    const typed = window.prompt(`Excluir definitivamente ${expected}? Digite o nome do funcionário para confirmar.`);
    if (typed !== expected) return;
    await remove.mutate(employee.id).catch(() => {});
  }

  function handleDownloadFicha(employee: Employee) {
    downloadEmployeeRecord(employee, company.data ?? null, managerById.get(employee.managerId ?? '') ?? '');
  }

  async function handleDownloadSheet(employee: Employee) {
    const month = currentMonth();
    setDownloadingId(employee.id);
    try {
      const rows = await api.timeTrack.listEmployeeMonth(employee.id, month);
      downloadEmployeeSheet(employee, rows, month, company.data ?? null, managerById.get(employee.managerId ?? '') ?? '');
    } catch {
      window.alert('Não foi possível baixar a folha deste funcionário.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Premium Header */}
      <section className="group relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/30 to-teal-50/20 p-6 shadow-[0_20px_70px_-15px_rgba(15,23,42,0.12)] transition-all duration-500 hover:shadow-[0_25px_80px_-15px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-teal-100/40 to-cyan-100/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gradient-to-tr from-blue-100/30 to-teal-100/20 blur-2xl" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-1.5 shadow-sm">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">Funcionários</p>
            </div>
            <h1 className="mt-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-3xl font-black tracking-tight text-transparent lg:text-4xl">
              {isGestor ? 'Minha equipe' : 'Cadastro da equipe'}
            </h1>
          </div>
          {canEdit && (
            <Link href="/dashboard/employees/new" className="crystal-button inline-flex h-11 items-center gap-2 rounded-[10px] bg-gradient-to-r from-teal-500 to-cyan-600 px-5 text-xs font-black text-white shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/30 active:translate-y-0">
              <UserPlus size={15} strokeWidth={2.5} />
              Novo funcionário
            </Link>
          )}
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-[12px] border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Ativos</p>
              <p className="mt-1 text-xl font-black text-slate-950">{activeCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <Users size={18} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-[12px] border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-600">Inativos</p>
              <p className="mt-1 text-xl font-black text-slate-950">{inactiveCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-slate-400 to-slate-500 shadow-lg shadow-slate-500/25">
              <Users size={18} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-[12px] border border-rose-200/60 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">Desligados</p>
              <p className="mt-1 text-xl font-black text-slate-950">{terminatedCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25">
              <XCircle size={18} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="rounded-[12px] border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
          <span>Pesquisar por nome, CPF, matrícula, gestor ou departamento</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} strokeWidth={2.5} />
            <input 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
              placeholder="Digite para filtrar a equipe" 
              className="h-10 w-full rounded-[8px] border border-slate-200 bg-white pl-9 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" 
            />
          </div>
        </label>
      </section>

      {(terminate.error || remove.error) && (
        <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-5 py-3 text-xs text-rose-700">{terminate.error || remove.error}</p>
      )}

      {loading ? (
        <LoadingState label="Carregando funcionários..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : employees.length === 0 ? (
        <EmptyState message={isGestor ? 'Nenhum funcionário na sua equipe.' : 'Nenhum funcionário cadastrado. Clique em Novo para começar.'} />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState message="Nenhum funcionário encontrado para a pesquisa." />
      ) : (
        <>
          <section className="overflow-hidden rounded-[14px] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                    <th className="px-4 py-3">Funcionário</th>
                    <th className="px-4 py-3">Matrícula</th>
                    <th className="px-4 py-3">Gestor</th>
                    <th className="px-4 py-3">Departamento</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-4">Acesso</th>
                    {canEdit && <th className="px-4 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((employee) => {
                    const managerName = employee.managerId ? managerById.get(employee.managerId) : '';
                    return (
                      <tr key={employee.id} className="group transition-all duration-200 hover:bg-slate-50/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white shadow-sm">
                              {employee.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <p className="text-sm font-black text-slate-950">{normalizeDisplayName(employee.name)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{employee.registration || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{managerName || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-[6px] border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            {employee.department}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{employee.position}</td>
                        <td className="px-4 py-3"><StatusBadge status={employee.status} /></td>
                        <td className="px-4 py-3"><AccessBadge employee={employee} /></td>
                        {(canEdit || isGestor) && (
                          <td className="px-4 py-3">
                            <div className="flex justify-end flex-wrap gap-1.5">
                              {canDownloadSheet && canEdit && (
                                <>
                                  <button onClick={() => handleDownloadFicha(employee)} disabled={company.loading} className="btn-outline-premium inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-[11px] font-black disabled:opacity-50 transition-all hover:-translate-y-0.5">
                                    <FileText size={12} strokeWidth={2.5} />
                                    Ficha
                                  </button>
                                  <button onClick={() => handleDownloadSheet(employee)} disabled={downloadingId === employee.id || company.loading} className="btn-outline-premium inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-[11px] font-black disabled:opacity-50 transition-all hover:-translate-y-0.5">
                                    <Download size={12} strokeWidth={2.5} />
                                    Folha
                                  </button>
                                </>
                              )}
                              {(canEdit || isGestor) && (
                                <button onClick={() => router.push(`/dashboard/time-track?employeeId=${employee.id}`)} className="btn-outline inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-[11px] font-black transition-all hover:-translate-y-0.5">
                                  Ponto
                                </button>
                              )}
                              {canEdit && (
                                <>
                                  <Link href={`/dashboard/employees/new?id=${employee.id}`} className="btn-outline-premium inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-[11px] font-black transition-all hover:-translate-y-0.5">
                                    <Edit3 size={12} strokeWidth={2.5} />
                                    Editar
                                  </Link>
                                  <button onClick={() => handleTerminate(employee)} disabled={employee.status === 'TERMINATED' || terminate.loading} className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-gradient-to-r from-amber-500 to-orange-600 px-2.5 text-[11px] font-black text-white shadow-md shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30 active:translate-y-0 disabled:opacity-50">
                                    <UserMinus size={12} strokeWidth={2.5} />
                                    Desligar
                                  </button>
                                  <button onClick={() => handleDelete(employee)} disabled={remove.loading} className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-gradient-to-r from-rose-500 to-pink-600 px-2.5 text-[11px] font-black text-white shadow-md shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/30 active:translate-y-0 disabled:opacity-50">
                                    <Trash2 size={12} strokeWidth={2.5} />
                                    Excluir
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          
          <EmployeeAsoSection employees={filteredEmployees} />
        </>
      )}
    </div>
  );
}

function AccessBadge({ employee }: { employee: Employee }) {
  if (!employee.userId || !employee.user) return <span className="text-[11px] font-semibold text-slate-400">Sem acesso</span>;
  if (!employee.user.isActive) return <span className="inline-flex rounded-[6px] border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700 shadow-sm">Bloqueado</span>;
  if (employee.user.forcePasswordChange) return <span className="inline-flex rounded-[6px] border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 shadow-sm">Trocar senha</span>;
  return <span className="inline-flex rounded-[6px] border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow-sm">Ativo</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    INACTIVE: 'border-slate-200 bg-slate-100 text-slate-600',
    SUSPENDED: 'border-amber-200 bg-amber-50 text-amber-700',
    TERMINATED: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return (
    <span className={`inline-flex items-center rounded-[6px] border px-2.5 py-1 text-[10px] font-black shadow-sm ${map[status] ?? map.INACTIVE}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-500' : status === 'INACTIVE' ? 'bg-slate-400' : status === 'SUSPENDED' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
      {EMPLOYEE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function EmployeeAsoSection({ employees }: { employees: Employee[] }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const employeeIds = useMemo(() => employees.map(e => e.id), [employees]);
  const enabled = !!selectedEmployeeId && employeeIds.includes(selectedEmployeeId);
  const asoQuery = useQuery(() => api.management.aso.listByEmployee(selectedEmployeeId), [], { enabled });

  const selected = employees.find(e => e.id === selectedEmployeeId);

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-black text-slate-950">Saúde Ocupacional / ASO por funcionário</h3>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500"
        >
          <option value="">Selecione um funcionário...</option>
          {employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
        </select>
        {selected && (
          <span className="text-[11px] font-bold text-slate-700">Status atual: <StatusBadge status={selected.status} /></span>
        )}
      </div>

      {asoQuery.loading && <p className="text-xs text-slate-500">Carregando ASO...</p>}
      {asoQuery.error && <p className="text-xs text-rose-600">{asoQuery.error}</p>}
      {!asoQuery.loading && !asoQuery.error && selected && (
        <div className="overflow-hidden rounded-[12px] border border-slate-200">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                <th className="px-3 py-2 border-b border-slate-200">Tipo</th>
                <th className="px-3 py-2 border-b border-slate-200">Exame</th>
                <th className="px-3 py-2 border-b border-slate-200">Vencimento</th>
                <th className="px-3 py-2 border-b border-slate-200">Status</th>
                <th className="px-3 py-2 border-b border-slate-200">Clínica</th>
              </tr>
            </thead>
            <tbody>
              {(asoQuery.data as any[] | undefined)?.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-xs text-slate-500">Nenhum registro de ASO encontrado.</td></tr>
              )}
              {(asoQuery.data as any[] | undefined)?.map((r: any) => {
                const alert = getAsoAlert(r.status, r.expirationDate);
                return (
                  <tr key={r.id} className="border-t border-slate-100 text-[11px] font-semibold">
                    <td className="px-3 py-2 text-slate-700">{r.asoType}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(r.examDate)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(r.expirationDate)}</td>
                    <td className="px-3 py-2"><span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[9px] font-black ${alert.cls}`}>{alert.label}</span></td>
                    <td className="px-3 py-2 text-slate-600">{r.clinicName ?? '---'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmtDate(v?: string | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-BR');
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function displayLunch(row: TimeTrack) {
  if (!row.lunchStart && !row.lunchReturn) return '-';
  return `${formatTime(row.lunchStart)} - ${formatTime(row.lunchReturn)}`;
}

function getAsoAlert(status: string, expirationDate?: string | null): { label: string; cls: string } {
  if (!expirationDate) return { label: 'Sem data definida', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  const today = new Date();
  const exp = new Date(expirationDate);
  if (exp < today) return { label: 'Vencido', cls: 'bg-red-50 text-red-700 border-red-200' };
  const diff = (exp.getTime() - today.getTime()) / 86400000;
  if (diff <= 30) return { label: 'Próximo do vencimento', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Válido', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

// ─── DOWNLOAD FUNCTIONS ──────────────────────────────────────────────────────

function downloadEmployeeSheet(employee: Employee, rows: TimeTrack[], month: string, company: Company | null, managerName: string) {
  const monthLabelText = monthLabelFn(month);
  const totalWorked = rows.reduce((t, r) => t + (r.totalWorked ?? 0), 0);
  const totalBalance = rows.reduce((t, r) => t + (r.dailyBalance ?? 0), 0);
  const positiveBalance = rows.reduce((t, r) => t + Math.max(r.dailyBalance ?? 0, 0), 0);
  const negativeBalance = rows.reduce((t, r) => t + Math.abs(Math.min(r.dailyBalance ?? 0, 0)), 0);

  const employeeInfo = [
    { label: 'Nome', value: normalizeDisplayName(employee.name) },
    { label: 'Matrícula', value: employee.registration || '-' },
    { label: 'CPF', value: employee.cpf || '-' },
    { label: 'Cargo', value: employee.position || '-' },
    { label: 'Departamento', value: employee.department || '-' },
    { label: 'Gestor', value: managerName || '-' },
    { label: 'Admissão', value: formatDate(employee.admissionDate) },
    { label: 'Período', value: monthLabelText },
  ];

  const tableHeaders = ['Data', 'Entrada', 'Almoço', 'Saída', 'Trabalhado', 'Saldo', 'Observação'];
  const tableRows = rows.length > 0 ? rows.map((row) => {
    const balance = row.dailyBalance ?? 0;
    const balanceColor = balance < 0 ? '#e11d48' : balance > 0 ? '#059669' : '#64748b';
    return `<tr>
      <td style="padding:8px 10px;font-size:8px;font-weight:600;color:#0f172a;">${escapeHtml(formatDate(row.date))}</td>
      <td style="padding:8px 10px;font-size:8px;color:#64748b;">${escapeHtml(formatTime(row.entry))}</td>
      <td style="padding:8px 10px;font-size:8px;color:#64748b;">${escapeHtml(displayLunch(row))}</td>
      <td style="padding:8px 10px;font-size:8px;font-weight:600;color:#0f172a;">${escapeHtml(formatTime(row.exit))}</td>
      <td style="padding:8px 10px;font-size:8px;font-weight:700;color:#0f172a;text-align:center;">${escapeHtml(formatMinutes(row.totalWorked))}</td>
      <td style="padding:8px 10px;font-size:8px;font-weight:700;color:${balanceColor};text-align:center;">${escapeHtml(formatMinutes(balance))}</td>
      <td style="padding:8px 10px;font-size:8px;color:#64748b;">${escapeHtml(row.observation || row.manualReason || '-')}</td>
    </tr>`;
  }) : [];

  const html = buildPdfShell({ title: 'Folha Individual de Ponto', subtitle: `${monthLabelText} — ${normalizeDisplayName(employee.name)}`, landscape: false }, companyData, `
    ${section('Dados do Colaborador', infoGrid(employeeInfo))}

    ${tableRows.length > 0 ? section('Registros de Ponto', pdfTable(tableHeaders, tableRows, { compact: true })) : '<p style="text-align:center;padding:24px;color:#94a3b8;font-size:10px;">Nenhum registro de ponto encontrado neste período.</p>'}

    ${tableRows.length > 0 ? section('Resumo do Período', `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#0f766e;letter-spacing:0.05em;">Registros</div>
          <div style="font-size:20px;font-weight:900;color:#0f172a;margin-top:8px;">${rows.length}</div>
        </div>
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#0f766e;letter-spacing:0.05em;">Trabalhado</div>
          <div style="font-size:20px;font-weight:900;color:#0f172a;margin-top:8px;">${escapeHtml(formatMinutes(totalWorked))}</div>
        </div>
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#0f766e;letter-spacing:0.05em;">Saldo Positivo</div>
          <div style="font-size:20px;font-weight:900;color:#059669;margin-top:8px;">${escapeHtml(formatMinutes(positiveBalance))}</div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#e11d48;letter-spacing:0.05em;">Saldo Negativo</div>
          <div style="font-size:20px;font-weight:900;color:#e11d48;margin-top:8px;">${escapeHtml(formatMinutes(negativeBalance))}</div>
        </div>
      </div>
      <div style="margin-top:16px;background:#f8fafc;padding:16px;border-radius:8px;font-size:12px;color:#334155;font-weight:700;text-align:center;">
        SALDO FINAL DO PERÍODO: <span style="font-weight:900;color:${totalBalance < 0 ? '#e11d48' : totalBalance > 0 ? '#059669' : '#64748b'};">
          ${escapeHtml(formatMinutes(totalBalance))}
        </span>
      </div>
    `) : ''}

    ${signatureBlock(['Assinatura do Colaborador', 'Assinatura do RH / Responsável', 'Data de Conferência'])}
  `);

  printPdf(html, `folha-ponto-${slugify(employee.name)}-${month}.pdf`);
}

function downloadEmployeeRecord(employee: Employee, company: Company | null, managerName: string) {
  const title = 'Ficha de Funcionário';
  const employeeInfo = [
    { label: 'Nome', value: normalizeDisplayName(employee.name) },
    { label: 'CPF', value: employee.cpf || '-' },
    { label: 'RG', value: employee.rg || '-' },
    { label: 'Data de Nascimento', value: formatDate(employee.birthDate) },
    { label: 'Telefone', value: employee.phone || '-' },
    { label: 'E-mail', value: employee.email || '-' },
    { label: 'Endereço', value: [employee.street, employee.streetNumber, employee.neighborhood, employee.city, employee.state, employee.cep].filter(Boolean).map(String).join(', ') || '-' },
  ];

  const professionalInfo = [
    { label: 'Cargo', value: employee.position || '-' },
    { label: 'Departamento', value: employee.department || '-' },
    { label: 'Operação', value: '-' },
    { label: 'Unidade', value: employee.unit || '-' },
    { label: 'Gestor', value: managerName || '-' },
    { label: 'Admissão', value: formatDate(employee.admissionDate) },
    { label: 'Status', value: EMPLOYEE_STATUS_LABEL[employee.status] || employee.status },
  ];

  const companyData: PdfCompanyInfo | null = company ? {
    name: company.name,
    legalName: company.legalName,
    document: company.document,
    logoUrl: company.logoUrl,
    phone: company.phone,
    email: company.email,
    address: [company.street, company.streetNumber, company.neighborhood, company.city, company.state, company.cep].filter(Boolean).map(String).join(', ') || undefined
  } : null;

  const html = buildPdfShell({ title, subtitle: normalizeDisplayName(employee.name), landscape: false }, companyData, `
    ${section('Dados Pessoais', infoGrid(employeeInfo, 4))}

    ${section('Dados Profissionais', infoGrid(professionalInfo, 4))}

    ${employee.observations ? section('Observações', `<p style="font-size:10px;color:#475569;">${escapeHtml(employee.observations)}</p>`) : ''}

    ${signatureBlock(['Assinatura do Funcionário', 'Assinatura do RH / Empresa'])}
  `);
  printPdf(html, `ficha-${slugify(employee.name)}.pdf`);
}

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

function slugify(value: string) {
  return normalizeDisplayName(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'funcionario';
}

function accessText(employee: Employee) {
  if (!employee.userId || !employee.user) return 'Sem acesso';
  if (!employee.user.isActive) return 'Bloqueado';
  if (employee.user.forcePasswordChange) return 'Trocar senha';
  return 'Acesso ativo';
}