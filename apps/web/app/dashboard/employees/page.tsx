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

function downloadEmployeeSheet(employee: Employee, rows: TimeTrack[], month: string, company: Company | null, managerName: string) {
  const title = `Folha de ponto - ${normalizeDisplayName(employee.name)} - ${month}`;
  const body = rows.length
    ? rows.map((row) => `
      <tr>
        <td>${escapeHtml(formatDate(row.date))}</td>
        <td>${escapeHtml(formatTime(row.entry))}</td>
        <td>${escapeHtml(displayLunch(row))}</td>
        <td>${escapeHtml(formatTime(row.exit))}</td>
        <td>${escapeHtml(formatMinutes(row.totalWorked))}</td>
        <td>${escapeHtml(formatMinutes(row.dailyBalance))}</td>
        <td>${escapeHtml(row.observation || row.manualReason || '-')}</td>
      </tr>`).join('')
    : '<tr><td colspan="7">Nenhum ponto encontrado no mês.</td></tr>';
  const html = printShell('Folha de ponto individual', company, month, `
    ${employeeSummary(employee, managerName)}
    <p class="section-title">Registros de ponto</p>
    <table>
      <thead><tr><th>Data</th><th>Entrada</th><th>Almoço</th><th>Saída</th><th>Trabalhado</th><th>Saldo</th><th>Motivo/observação</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="summary"><strong>Resumo mensal:</strong> registros ${rows.length} | trabalhado ${escapeHtml(formatMinutes(rows.reduce((t, r) => t + (r.totalWorked ?? 0), 0)))} | saldo positivo ${escapeHtml(formatMinutes(rows.reduce((t, r) => t + Math.max(r.dailyBalance ?? 0, 0), 0)))} | saldo negativo ${escapeHtml(formatMinutes(rows.reduce((t, r) => t + Math.abs(Math.min(r.dailyBalance ?? 0, 0)), 0)))}</div>
    <div class="signatures"><div>Assinatura do colaborador</div><div>Assinatura do RH / responsável</div><div>Data de conferência</div></div>`);
  printPdfDocument(html, `folha-ponto-${slugify(employee.name)}-${month}`);
}


function downloadEmployeeRecord(employee: Employee, company: Company | null, managerName: string) {
  const html = printShell('Ficha cadastral do colaborador', company, 'Cadastro atualizado', `
    ${employeeSummary(employee, managerName)}
    <section class="doc-block"><h2>Identificação</h2><div class="grid-3">
      ${info('Nome completo', normalizeDisplayName(employee.name))}${info('Matrícula', employee.registration || '-')}${info('CPF', employee.cpf || '-')}
      ${info('RG / CIN', employee.rg || '-')}${info('Órgão emissor', employee.rgIssuer || '-')}${info('UF do RG', employee.rgState || '-')}
      ${info('Nascimento', formatDate(employee.birthDate))}${info('Estado civil', employee.maritalStatus || '-')}${info('Nacionalidade', employee.nationality || '-')}${info('Naturalidade', employee.birthplace || '-')}
    </div></section>
    <section class="doc-block"><h2>Contato e endereço</h2><div class="grid-3">
      ${info('E-mail', employee.email || '-')}${info('Telefone', employee.phone || '-')}${info('Telefone secundário', employee.secondaryPhone || '-')}
      ${info('CEP', employee.cep || '-')}${info('Logradouro', employee.street || '-')}${info('Número', employee.streetNumber || '-')}
      ${info('Complemento', employee.addressComplement || '-')}${info('Bairro', employee.neighborhood || '-')}${info('Cidade/UF', [employee.city, employee.state].filter(Boolean).join(' / ') || '-')}
    </div></section>
    <section class="doc-block"><h2>Contrato, acesso e observações</h2><div class="grid-3">
      ${info('Salário', employee.salary ? `R$ ${Number(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-')}${info('CNPJ PJ/terceiro', employee.cnpj || '-')}${info('Razão social', employee.legalName || '-')}${info('Nome fantasia', employee.tradeName || '-')}${info('Acesso ao painel', accessText(employee))}${info('Perfil de acesso', employee.user?.role || '-')}
    </div><p class="note">${escapeHtml(employee.observations || 'Sem observações cadastrais.')}</p></section>
    <div class="signatures"><div>Assinatura do colaborador</div><div>Responsável pelo RH</div><div>Data de conferência</div></div>`);
  printPdfDocument(html, `ficha-${slugify(employee.name)}`);
}

function printShell(title: string, company: Company | null, period: string, content: string) {
  const emittedAt = new Date().toLocaleString('pt-BR');
  const logo = company?.logoUrl ? `<img class="logo-img" src="${escapeHtml(company.logoUrl)}" alt="Logo da empresa" />` : '<div class="logo-img logo-placeholder">Logo</div>';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
  <style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;background:#fff;font-size:10pt;line-height:1.5}.page{width:100%}.tmpl-header{display:table;width:100%;border-bottom:2px solid #0a5c4a;padding-bottom:12px;margin-bottom:22px}.tmpl-header-left,.tmpl-header-right{display:table-cell;vertical-align:middle;width:50%}.tmpl-header-right{text-align:right}.logo-container{display:table}.logo-img{display:table-cell;vertical-align:middle;width:52px;height:52px;object-fit:contain}.logo-placeholder{border:1px solid #e5e7eb;border-radius:8px;text-align:center;line-height:52px;color:#9ca3af;font-size:8pt}.logo-text{display:table-cell;vertical-align:middle;padding-left:12px}.logo-text h1{font-size:16pt;font-weight:700;color:#111827;line-height:1;letter-spacing:-.5px;text-transform:uppercase}.logo-text p{font-size:8pt;color:#6b7280;margin-top:3px}.tmpl-header-right h2{font-size:12pt;font-weight:700;color:#0a5c4a;text-transform:uppercase;margin-bottom:4px}.tmpl-header-right p{color:#6b7280;font-size:8.5pt}.tmpl-section,.doc-block{margin-bottom:16px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;page-break-inside:avoid}.tmpl-section-title,.doc-block h2{background:#f3f4f6;padding:8px 12px;font-size:9pt;font-weight:700;text-transform:uppercase;color:#4b5563;border-bottom:1px solid #e5e7eb}.grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.item{padding:10px 12px;border-right:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;min-height:50px}.item:nth-child(3n){border-right:0}.item span{display:block;font-size:7.5pt;text-transform:uppercase;color:#9ca3af;font-weight:700;margin-bottom:2px}.item strong{display:block;font-size:9.5pt;font-weight:600;color:#111827}.note{margin:10px 12px 12px;padding:10px;border-radius:6px;background:#f9fafb;color:#374151}.summary{margin:12px 0;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb;padding:10px}.signatures{display:table;width:100%;margin-top:42px;page-break-inside:avoid}.signatures div{display:table-cell;width:33%;text-align:center;padding:0 24px;color:#4b5563}.signatures div:before{content:"";display:block;border-top:1px solid #9ca3af;margin-bottom:6px}.footer{margin-top:26px;border-top:1px solid #e5e7eb;padding-top:8px;display:table;width:100%;color:#9ca3af;font-size:8pt}.footer span{display:table-cell}.footer span:nth-child(2){text-align:center}.footer span:last-child{text-align:right}@media print{.tmpl-section,.doc-block{page-break-inside:avoid}}
  </style></head><body><main class="page"><header class="tmpl-header"><div class="tmpl-header-left"><div class="logo-container">${logo}<div class="logo-text"><h1>${escapeHtml(company?.name || 'Empresa')}</h1><p>CNPJ: ${escapeHtml(company?.document || '-')}</p><p>${escapeHtml(company?.legalName || company?.name || '-')}</p></div></div></div><div class="tmpl-header-right"><h2>${escapeHtml(title)}</h2><p>Status/período: ${escapeHtml(period)}</p><p>Emissão: ${escapeHtml(emittedAt)}</p><p>${escapeHtml(company?.phone || '-')} | ${escapeHtml(company?.email || '-')}</p></div></header>${content}<footer class="footer"><span>Innovation RH Connect</span><span>Documento gerado automaticamente</span><span>${escapeHtml(emittedAt)}</span></footer></main></body></html>`;
}

function employeeSummary(employee: Employee, managerName: string) {
  return `<section class="doc-block"><h2>Dados profissionais</h2><div class="grid-3">
    ${info('Nome', normalizeDisplayName(employee.name))}${info('Matrícula', employee.registration || '-')}${info('CPF', employee.cpf || '-')}
    ${info('Cargo', employee.position || '-')}${info('Departamento', employee.department || '-')}${info('Unidade', employee.unit || '-')}
    ${info('Gestor', managerName || '-')}${info('Status', EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status)}${info('Contrato', employee.contractType || '-')}
    ${info('Admissão', formatDate(employee.admissionDate))}${info('Desligamento', formatDate(employee.terminationDate))}${info('Escala', employee.workScale || employee.customWorkScale || '-')}
    ${info('Jornada diária', employee.dailyWorkload || '-')}${info('Entrada padrão', employee.standardEntry || '-')}${info('Saída almoço', employee.standardLunchStart || '-')}${info('Retorno almoço', employee.standardLunchReturn || '-')}${info('Saída padrão', employee.standardExit || '-')}
  </div></section>`;
}

function info(label: string, value: unknown) {
  return `<div class="item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? '-'))}</strong></div>`;
}

function accessText(employee: Employee) {
  if (!employee.userId || !employee.user) return 'Sem acesso';
  if (!employee.user.isActive) return 'Bloqueado';
  if (employee.user.forcePasswordChange) return 'Trocar senha';
  return 'Acesso ativo';
}

function printPdfDocument(html: string, title: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.title = title;
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    window.alert('Não foi possível gerar o PDF.');
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1000);
  };
}
function slugify(value: string) {
  return normalizeDisplayName(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'funcionario';
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&', '<': '<', '>': '>', '"': '"' })[char] ?? char);
}