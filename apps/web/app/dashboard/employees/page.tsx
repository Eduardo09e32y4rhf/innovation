'use client';

import Link from 'next/link';
import { Download, Edit3, FileText, Search, Trash2, UserMinus, UserPlus } from 'lucide-react';
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
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Funcionários</p>
          <h2 className="text-2xl font-black text-slate-950">{isGestor ? 'Minha equipe' : 'Cadastro da equipe'}</h2>
        </div>
        {canEdit && (
          <Link href="/dashboard/employees/new" className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
            <UserPlus size={14} />
            Novo
          </Link>
        )}
      </header>

      <section className="ops-card rounded-[8px] border border-slate-200 bg-white p-4">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Pesquisar por nome, CPF, matrícula, gestor ou departamento</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite para filtrar a equipe" className="h-10 w-full rounded-[8px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500" />
          </div>
        </label>
      </section>

      {(terminate.error || remove.error) && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{terminate.error || remove.error}</p>
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
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="pb-3 pr-4">Matrícula</th>
                  <th className="pb-3 pr-4">Gestor</th>
                  <th className="pb-3 pr-4">Departamento</th>
                  <th className="pb-3 pr-4">Cargo</th>
                  <th className="pb-3 pr-4">Status</th>
                  {canEdit && <th className="pb-3">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => {
                  const managerName = employee.managerId ? managerById.get(employee.managerId) : '';
                  return (
                    <tr key={employee.id} className="border-t border-slate-100 text-xs text-slate-700">
                      <td className="py-3 pr-4 font-medium text-slate-950">{normalizeDisplayName(employee.name)}</td>
                      <td className="py-3 pr-4">{employee.registration || '-'}</td>
                      <td className="py-3 pr-4">{managerName || ''}</td>
                      <td className="py-3 pr-4">{employee.department}</td>
                      <td className="py-3 pr-4">{employee.position}</td>
                      <td className="py-3 pr-4"><StatusBadge status={employee.status} /></td>
                      <td className="py-3 pr-4"><AccessBadge employee={employee} /></td>
                      {canEdit && (
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/dashboard/employees/new?id=${employee.id}`} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]">
                              <Edit3 size={12} />Editar
                            </Link>
                            {canDownloadSheet && (
                              <>
                                <button onClick={() => handleDownloadFicha(employee)} disabled={company.loading} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] disabled:opacity-50">
                                  <FileText size={12} />Ficha
                                </button>
                                <button onClick={() => handleDownloadSheet(employee)} disabled={downloadingId === employee.id || company.loading} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] disabled:opacity-50">
                                  <Download size={12} />Folha
                                </button>
                              </>
                            )}
                            <button onClick={() => handleTerminate(employee)} disabled={employee.status === 'TERMINATED' || terminate.loading} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] disabled:opacity-50">
                              <UserMinus size={12} />Desligar
                            </button>
                            <button onClick={() => handleDelete(employee)} disabled={remove.loading} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-rose-600 disabled:opacity-50">
                              <Trash2 size={12} />Excluir
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
  if (!employee.user.isActive) return <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Bloqueado</span>;
  if (employee.user.forcePasswordChange) return <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Trocar senha</span>;
  return <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Ativo</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
    SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
    TERMINATED: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${map[status] ?? map.INACTIVE}`}>
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
      <thead><tr><th>Data</th><th>Entrada</th><th>Almoco</th><th>Saida</th><th>Trabalhado</th><th>Saldo</th><th>Motivo/observacao</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="summary"><strong>Resumo mensal:</strong> registros ${rows.length} | trabalhado ${escapeHtml(formatMinutes(rows.reduce((t, r) => t + (r.totalWorked ?? 0), 0)))} | saldo positivo ${escapeHtml(formatMinutes(rows.reduce((t, r) => t + Math.max(r.dailyBalance ?? 0, 0), 0)))} | saldo negativo ${escapeHtml(formatMinutes(rows.reduce((t, r) => t + Math.abs(Math.min(r.dailyBalance ?? 0, 0)), 0)))}</div>
    <div class="signatures"><div>Assinatura do colaborador</div><div>Assinatura do RH / responsavel</div><div>Data de conferencia</div></div>`);
  printPdfDocument(html, `folha-ponto-${slugify(employee.name)}-${month}`);
}


function downloadEmployeeRecord(employee: Employee, company: Company | null, managerName: string) {
  const html = printShell('Ficha cadastral do colaborador', company, 'Cadastro atualizado', `
    ${employeeSummary(employee, managerName)}
    <section class="doc-block"><h2>Identificacao</h2><div class="grid-3">
      ${info('Nome completo', normalizeDisplayName(employee.name))}${info('Matricula', employee.registration || '-')}${info('CPF', employee.cpf || '-')}
      ${info('RG / CIN', employee.rg || '-')}${info('Orgao emissor', employee.rgIssuer || '-')}${info('UF do RG', employee.rgState || '-')}
      ${info('Nascimento', formatDate(employee.birthDate))}${info('Estado civil', employee.maritalStatus || '-')}${info('Nacionalidade', employee.nationality || '-')}${info('Naturalidade', employee.birthplace || '-')}
    </div></section>
    <section class="doc-block"><h2>Contato e endereco</h2><div class="grid-3">
      ${info('E-mail', employee.email || '-')}${info('Telefone', employee.phone || '-')}${info('Telefone secundario', employee.secondaryPhone || '-')}
      ${info('CEP', employee.cep || '-')}${info('Logradouro', employee.street || '-')}${info('Numero', employee.streetNumber || '-')}
      ${info('Complemento', employee.addressComplement || '-')}${info('Bairro', employee.neighborhood || '-')}${info('Cidade/UF', [employee.city, employee.state].filter(Boolean).join(' / ') || '-')}
    </div></section>
    <section class="doc-block"><h2>Contrato, acesso e observacoes</h2><div class="grid-3">
      ${info('Salario', employee.salary ? `R$ ${Number(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-')}${info('CNPJ PJ/terceiro', employee.cnpj || '-')}${info('Razao social', employee.legalName || '-')}${info('Nome fantasia', employee.tradeName || '-')}${info('Acesso ao painel', accessText(employee))}${info('Perfil de acesso', employee.user?.role || '-')}
    </div><p class="note">${escapeHtml(employee.observations || 'Sem observacoes cadastrais.')}</p></section>
    <div class="signatures"><div>Assinatura do colaborador</div><div>Responsavel pelo RH</div><div>Data de conferencia</div></div>`);
  printPdfDocument(html, `ficha-${slugify(employee.name)}`);
}

function printShell(title: string, company: Company | null, period: string, content: string) {
  const emittedAt = new Date().toLocaleString('pt-BR');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
  <style>
    @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,Helvetica,sans-serif;font-size:11px}.page{background:white;margin:0 auto;padding:18px;max-width:1180px}.header{display:grid;grid-template-columns:96px 1fr 250px;gap:16px;align-items:center;border-bottom:3px solid #0f766e;padding-bottom:12px}.logo{height:72px;width:88px;object-fit:contain;border:1px solid #dbe3ef;border-radius:8px;padding:6px}.logo-box{display:flex;height:72px;width:88px;align-items:center;justify-content:center;border:1px solid #dbe3ef;border-radius:8px;color:#64748b}.brand h1{margin:0 0 6px;font-size:18px;text-transform:uppercase;letter-spacing:.08em}.brand p,.meta p{margin:2px 0}.meta{text-align:right}.doc-title{margin:16px 0 10px;border-radius:8px;background:#ecfeff;padding:10px 12px;font-size:14px;font-weight:800;text-transform:uppercase;color:#0f766e}.doc-block{break-inside:avoid;margin-top:12px;border:1px solid #dbe3ef;border-radius:8px;padding:12px}.doc-block h2{margin:0 0 10px;font-size:13px;text-transform:uppercase}.grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 14px}.item span{display:block;color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase}.item strong{display:block;margin-top:2px}.note{min-height:40px;border-radius:6px;background:#f8fafc;padding:8px}table{width:100%;border-collapse:collapse;margin-top:10px;table-layout:fixed}th,td{border:1px solid #94a3b8;padding:5px;vertical-align:top;word-break:break-word}th{background:#e2e8f0;text-align:center;font-weight:800}td{text-align:center}td:last-child{text-align:left}.section-title{margin:14px 0 6px;font-size:13px;font-weight:800}.summary{margin-top:12px;border-radius:8px;background:#f1f5f9;padding:10px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:34px}.signatures div{border-top:1px solid #111827;text-align:center;padding-top:8px}.footer{margin-top:18px;border-top:1px solid #cbd5e1;padding-top:8px;color:#64748b;display:flex;justify-content:space-between}@media print{body{background:white}.page{max-width:none;padding:0}.doc-block{break-inside:avoid}.footer{position:fixed;bottom:0;left:0;right:0}}
  </style></head><body><main class="page"><header class="header"><div>${company?.logoUrl ? `<img class="logo" src="${escapeHtml(company.logoUrl)}" />` : '<div class="logo-box">Logo</div>'}</div><div class="brand"><h1>${escapeHtml(company?.name || 'Empresa')}</h1><p><strong>Razao social:</strong> ${escapeHtml(company?.legalName || company?.name || '-')}</p><p><strong>CNPJ:</strong> ${escapeHtml(company?.document || '-')}</p><p><strong>Endereco:</strong> ${escapeHtml(company?.address || '-')}</p></div><div class="meta"><p><strong>Telefone:</strong> ${escapeHtml(company?.phone || '-')}</p><p><strong>E-mail:</strong> ${escapeHtml(company?.email || '-')}</p><p><strong>Periodo:</strong> ${escapeHtml(period)}</p><p><strong>Emissao:</strong> ${escapeHtml(emittedAt)}</p></div></header><div class="doc-title">${escapeHtml(title)}</div>${content}<footer class="footer"><span>Innovation RH Connect</span><span>Documento gerado automaticamente em ${escapeHtml(emittedAt)}</span><span>Pagina 1</span></footer></main></body></html>`;
}

function employeeSummary(employee: Employee, managerName: string) {
  return `<section class="doc-block"><h2>Dados profissionais</h2><div class="grid-3">
    ${info('Nome', normalizeDisplayName(employee.name))}${info('Matricula', employee.registration || '-')}${info('CPF', employee.cpf || '-')}
    ${info('Cargo', employee.position || '-')}${info('Departamento', employee.department || '-')}${info('Unidade', employee.unit || '-')}
    ${info('Gestor', managerName || '-')}${info('Status', EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status)}${info('Contrato', employee.contractType || '-')}
    ${info('Admissao', formatDate(employee.admissionDate))}${info('Desligamento', formatDate(employee.terminationDate))}${info('Escala', employee.workScale || employee.customWorkScale || '-')}
    ${info('Jornada diaria', employee.dailyWorkload || '-')}${info('Entrada padrao', employee.standardEntry || '-')}${info('Saida almoco', employee.standardLunchStart || '-')}${info('Retorno almoco', employee.standardLunchReturn || '-')}${info('Saida padrao', employee.standardExit || '-')}
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
    window.alert('Nao foi possivel gerar o PDF.');
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
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
}
