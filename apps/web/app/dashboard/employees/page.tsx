'use client';

import Link from 'next/link';
import { Download, Edit3, FileText, Search, Trash2, UserMinus, UserPlus, Users, Filter, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Company, type Employee, type TimeTrack } from '@/app/lib/api';
import { EMPLOYEE_STATUS_LABEL, formatDate, formatMinutes, formatTime } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { buildPdfShell, section, grid2, grid3, field, tableBlock, signatures, printPdf, type PdfCompanyInfo } from '@/app/lib/pdf-utils';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

export default function EmployeesPage() {
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
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-[16px] border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Ativos</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{activeCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <Users size={20} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-[16px] border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-600">Inativos</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{inactiveCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-slate-400 to-slate-500 shadow-lg shadow-slate-500/25">
              <Users size={20} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-[16px] border border-rose-200/60 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-rose-700">Desligados</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{terminatedCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25">
              <XCircle size={20} strokeWidth={2.5} className="text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="rounded-[16px] border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
        <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
          <span>Pesquisar por nome, CPF, matrícula, gestor ou departamento</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={2.5} />
            <input 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
              placeholder="Digite para filtrar a equipe" 
              className="h-12 w-full rounded-[10px] border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" 
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
        <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 to-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Matrícula</th>
                  <th className="px-6 py-4">Gestor</th>
                  <th className="px-6 py-4">Departamento</th>
                  <th className="px-6 py-4">Cargo</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Acesso</th>
                  {canEdit && <th className="px-6 py-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((employee) => {
                  const managerName = employee.managerId ? managerById.get(employee.managerId) : '';
                  return (
                    <tr key={employee.id} className="group transition-all duration-200 hover:bg-slate-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white shadow-sm">
                            {employee.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <p className="text-sm font-black text-slate-950">{normalizeDisplayName(employee.name)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{employee.registration || '-'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{managerName || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-[6px] border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          {employee.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{employee.position}</td>
                      <td className="px-6 py-4"><StatusBadge status={employee.status} /></td>
                      <td className="px-6 py-4"><AccessBadge employee={employee} /></td>
                      {canEdit && (
                        <td className="px-6 py-4">
                          <div className="flex justify-end flex-wrap gap-2">
                            <Link href={`/dashboard/employees/new?id=${employee.id}`} className="btn-outline-premium inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[11px] font-black transition-all hover:-translate-y-0.5">
                              <Edit3 size={12} strokeWidth={2.5} />
                              Editar
                            </Link>
                            {canDownloadSheet && (
                              <>
                                <button onClick={() => handleDownloadFicha(employee)} disabled={company.loading} className="btn-outline-premium inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[11px] font-black disabled:opacity-50 transition-all hover:-translate-y-0.5">
                                  <FileText size={12} strokeWidth={2.5} />
                                  Ficha
                                </button>
                                <button onClick={() => handleDownloadSheet(employee)} disabled={downloadingId === employee.id || company.loading} className="btn-outline-premium inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[11px] font-black disabled:opacity-50 transition-all hover:-translate-y-0.5">
                                  <Download size={12} strokeWidth={2.5} />
                                  Folha
                                </button>
                              </>
                            )}
                            <button onClick={() => handleTerminate(employee)} disabled={employee.status === 'TERMINATED' || terminate.loading} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-amber-500 to-orange-600 px-3 text-[11px] font-black text-white shadow-md shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30 active:translate-y-0 disabled:opacity-50">
                              <UserMinus size={12} strokeWidth={2.5} />
                              Desligar
                            </button>
                            <button onClick={() => handleDelete(employee)} disabled={remove.loading} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-rose-500 to-pink-600 px-3 text-[11px] font-black text-white shadow-md shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/30 active:translate-y-0 disabled:opacity-50">
                              <Trash2 size={12} strokeWidth={2.5} />
                              Excluir
                            </button>
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
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function displayLunch(row: TimeTrack) {
  if (!row.lunchStart && !row.lunchReturn) return '-';
  return `${formatTime(row.lunchStart)} - ${formatTime(row.lunchReturn)}`;
}

// ─── PROFESSIONAL PDF TEMPLATE ───────────────────────────────────────────────


// ─── DOWNLOAD FUNCTIONS ──────────────────────────────────────────────────────

function downloadEmployeeSheet(employee: Employee, rows: TimeTrack[], month: string, company: Company | null, managerName: string) {
  const title = `Folha de Ponto Individual`;
  const monthLabel = monthLabelFn(month);
  const totalWorked = rows.reduce((t, r) => t + (r.totalWorked ?? 0), 0);
  const totalBalance = rows.reduce((t, r) => t + (r.dailyBalance ?? 0), 0);
  const positiveBalance = rows.reduce((t, r) => t + Math.max(r.dailyBalance ?? 0, 0), 0);
  const negativeBalance = rows.reduce((t, r) => t + Math.abs(Math.min(r.dailyBalance ?? 0, 0)), 0);

  const bodyRows = rows.length > 0 ? rows.map((row) => {
    const balance = row.dailyBalance ?? 0;
    const balanceColor = balance < 0 ? '#e11d48' : balance > 0 ? '#059669' : '#64748b';
    return `<td style="padding:10px 14px;font-size:9px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${escapeHtml(formatDate(row.date))}</td>
      <td style="padding:10px 14px;font-size:9px;color:#64748b;border-bottom:1px solid #f1f5f9;">${escapeHtml(formatTime(row.entry))}</td>
      <td style="padding:10px 14px;font-size:9px;color:#64748b;border-bottom:1px solid #f1f5f9;">${escapeHtml(displayLunch(row))}</td>
      <td style="padding:10px 14px;font-size:9px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${escapeHtml(formatTime(row.exit))}</td>
      <td style="padding:10px 14px;font-size:9px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;text-align:center;">${escapeHtml(formatMinutes(row.totalWorked))}</td>
      <td style="padding:10px 14px;font-size:9px;font-weight:700;color:${balanceColor};border-bottom:1px solid #f1f5f9;text-align:center;">${escapeHtml(formatMinutes(balance))}</td>
      <td style="padding:10px 14px;font-size:8px;color:#64748b;border-bottom:1px solid #f1f5f9;">${escapeHtml(row.observation || row.manualReason || '-')}</td>`;
  }) : [];

  const html = buildPdfHtml({ title, company, subtitle: `${monthLabel} — ${normalizeDisplayName(employee.name)}`, landscape: false }, `
    ${section('Dados do Colaborador', grid3([
      field('Nome', normalizeDisplayName(employee.name)),
      field('Matrícula', employee.registration || '-'),
      field('CPF', employee.cpf || '-'),
      field('Cargo', employee.position || '-'),
      field('Departamento', employee.department || '-'),
      field('Gestor', managerName || '-'),
      field('Admissão', formatDate(employee.admissionDate)),
      field('Período', monthLabel),
      field('Status', 'Ativo'),
    ]))}

    ${bodyRows.length > 0 ? section('Registros de Ponto', `
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0f172a;color:#fff;">
          <th style="padding:10px 14px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Data</th>
          <th style="padding:10px 14px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Entrada</th>
          <th style="padding:10px 14px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Almoço</th>
          <th style="padding:10px 14px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Saída</th>
          <th style="padding:10px 14px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">Trabalhado</th>
          <th style="padding:10px 14px;text-align:center;font-size:8px;font-weight:900;text-transform:uppercase;">Saldo</th>
          <th style="padding:10px 14px;text-align:left;font-size:8px;font-weight:900;text-transform:uppercase;">Observação</th>
        </tr></thead>
        <tbody>${bodyRows.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">${r}</tr>`).join('')}</tbody>
      </table>
    `) : '<p style="text-align:center;padding:24px;color:#94a3b8;font-size:10px;">Nenhum registro de ponto encontrado neste período.</p>'}

    ${bodyRows.length > 0 ? section('Resumo do Período', `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#0f766e;">Registros</div>
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${rows.length}</div>
        </div>
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#0f766e;">Total Trabalhado</div>
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${escapeHtml(formatMinutes(totalWorked))}</div>
        </div>
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#0f766e;">Saldo Positivo</div>
          <div style="font-size:16px;font-weight:900;color:#059669;margin-top:4px;">${escapeHtml(formatMinutes(positiveBalance))}</div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;text-align:center;">
          <div style="font-size:7px;font-weight:900;text-transform:uppercase;color:#e11d48;">Saldo Negativo</div>
          <div style="font-size:16px;font-weight:900;color:#e11d48;margin-top:4px;">${escapeHtml(formatMinutes(negativeBalance))}</div>
        </div>
      </div>
      <div style="margin-top:16px;background:#f8fafc;padding:12px;border-radius:8px;font-size:10px;color:#0f172a;font-weight:600;text-align:center;">
        Saldo final do período: <span style="color:${totalBalance < 0 ? '#e11d48' : totalBalance > 0 ? '#059669' : '#64748b'};">
          ${escapeHtml(formatMinutes(totalBalance))}
        </span>
      </div>
    `) : ''}

    ${signatures(['Assinatura do Colaborador', 'Assinatura do RH / Responsável', 'Data de Conferência'])}
  `);

  printPdfDocument(html, `folha-ponto-${slugify(employee.name)}-${month}`);
}

function downloadEmployeeRecord(employee: Employee, company: Company | null, managerName: string) {
  const title = `Ficha Cadastral do Colaborador`;
  const html = buildPdfHtml({ title, company, subtitle: normalizeDisplayName(employee.name), landscape: false }, `
    ${section('Identificação', grid3([
      field('Nome', normalizeDisplayName(employee.name)),
      field('Matrícula', employee.registration || '-'),
      field('CPF', employee.cpf || '-'),
      field('Admissão', formatDate(employee.admissionDate)),
    ]))}

    ${section('Profissional', grid2([
      field('Cargo', employee.position || '-'),
      field('Departamento', employee.department || '-'),
      field('Gestor', managerName || '-'),
      field('Escala', employee.workScale || employee.customWorkScale || '-'),
    ]))}

    ${section('Contato', grid2([
      field('E-mail', employee.email || '-'),
      field('Telefone', employee.phone || '-'),
      field('CEP', employee.cep || '-'),
      field('Cidade/UF', [employee.city, employee.state].filter(Boolean).join(' / ') || '-'),
    ]))}

    ${signatures(['Assinatura do Colaborador', 'Responsável pelo RH', 'Data de Conferência'])}
  `);
  printPdfDocument(html, `ficha-${slugify(employee.name)}`);
}

function buildPdfHtml(options: { title: string; company: Company | null; subtitle?: string; landscape?: boolean }, content: string) {
  const title = options.title;
  const company = options.company;
  const subtitle = options.subtitle ?? '';
  const landscape = options.landscape ?? false;
  const emittedAt = new Date().toLocaleString('pt-BR');
  const emittedDate = new Date().toLocaleDateString('pt-BR');

  const header = `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #0f172a;padding-bottom:6px;margin-bottom:10px;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${company?.logoUrl
          ? `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;"><img src="${escapeHtml(company.logoUrl)}" alt="Logo" style="max-width:36px;max-height:36px;object-fit:contain;" /></div>`
          : `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:2px solid #0f766e;border-radius:6px;color:#0f766e;font-weight:900;font-size:10px;">RH</div>`
        }
        <div>
          <div style="font-size:12px;font-weight:900;color:#0f172a;letter-spacing:-.2px;text-transform:uppercase;">${escapeHtml(company?.name || 'Empresa')}</div>
          <div style="font-size:7px;color:#64748b;margin-top:1px;">
            ${escapeHtml(company?.document || '-')}${company?.legalName ? ` | ${escapeHtml(company.legalName)}` : ''}
          </div>
          <div style="font-size:7px;color:#64748b;">${[company?.phone, company?.email].filter(Boolean).map(v => escapeHtml(v as string)).join(' | ') || ''}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;">${escapeHtml(title)}</div>
        <div style="font-size:7px;color:#64748b;margin-top:2px;">${escapeHtml(subtitle)}</div>
        <div style="font-size:7px;color:#94a3b8;margin-top:1px;">Emitido em ${escapeHtml(emittedDate)} às ${escapeHtml(emittedAt.split(', ')[1] || emittedAt)}</div>
      </div>
    </div>
  `;

  const footer = `
    <div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:space-between;color:#94a3b8;font-size:7px;font-weight:600;">
      <span>Innovation RH Connect</span>
      <span>Documento gerado automaticamente</span>
      <span>Página 1 de 1</span>
    </div>
  `;

  const pageStyle = landscape ? '@page { size: A4 landscape; margin: 5mm 6mm; }' : '@page { size: A4; margin: 6mm 8mm; }';

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${pageStyle}
    @media print {
      .no-print { display: none !important; }
      .page { width: 100%; max-width: 100%; page-break-after: avoid; }
      .print-section { break-inside: avoid; page-break-inside: avoid; }
      table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; break-inside: avoid; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #0f172a; background: #fff; font-size: 9pt; line-height: 1.4; }
    .page { width: 100%; }
  </style>
</head>
<body>
  <main class="page">${header}${content}${footer}</main>
</body>
</html>`;
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

function printPdfDocument(html: string, title: string) {
  const win = window.open('', '_blank');
  if (!win) {
    window.alert('Não foi possível gerar o PDF. Verifique se o navegador bloqueou pop-ups.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
    window.setTimeout(() => win.close(), 1000);
  };
}
