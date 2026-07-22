'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Download, Edit3, FileText, Search, Trash2, UserMinus, UserPlus, Users, Filter, XCircle, AlertTriangle } from 'lucide-react';
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
  const params = useParams();
  const tenant = params?.tenant as string;

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
          || (employee.cpf || '').replace(/\D/g, '').includes(digits);
      })
      .slice().sort((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name)));
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

  async function handleDownloadOcorrencias(employee: Employee) {
    const month = currentMonth();
    setDownloadingId(employee.id);
    try {
      const rows = await api.timeTrack.listEmployeeMonth(employee.id, month);
      downloadEmployeeOcorrenciasSheet(employee, rows, month, company.data ?? null, managerById.get(employee.managerId ?? '') ?? '');
    } catch {
      window.alert('Não foi possível baixar a ficha de ocorrências deste funcionário.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="page-header">
        <div>
          <p className="page-label">Funcionários</p>
          <h1 className="page-title">Cadastro da equipe</h1>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/${tenant}/dashboard/employees/import`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700">
              <Download size={15} /> Importar XLSX
            </Link>
            <Link href={`/${tenant}/dashboard/employees/new`} className="btn-nubank">
              <UserPlus size={15} strokeWidth={2.5} />
              Novo funcionário
            </Link>
          </div>
        )}
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="card-stat-label">Ativos</span>
            <Users size={16} className="text-zinc-400" strokeWidth={2.5} />
          </div>
          <span className="card-stat-value">{activeCount}</span>
        </div>
        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="card-stat-label">Inativos</span>
            <UserMinus size={16} className="text-zinc-400" strokeWidth={2.5} />
          </div>
          <span className="card-stat-value">{inactiveCount}</span>
        </div>
        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="card-stat-label">Desligados</span>
            <XCircle size={16} className="text-zinc-400" strokeWidth={2.5} />
          </div>
          <span className="card-stat-value">{terminatedCount}</span>
        </div>
      </section>

      {/* Search */}
      <section className="card-flat p-4">
        <label className="space-y-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
          <span>Pesquisar por nome, CPF, matrícula, gestor ou departamento</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} strokeWidth={2.5} />
            <input 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
              placeholder="Digite para filtrar a equipe" 
              className="form-control pl-9" 
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
          <section className="data-table-wrap">
            <div className="overflow-x-auto">
              <table className="data-table min-w-[800px]">
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th>Matrícula</th>
                    <th>Gestor</th>
                    <th>Departamento</th>
                    <th>Cargo</th>
                    <th>Status</th>
                    <th>Acesso</th>
                    {canEdit && <th className="text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    const managerName = employee.managerId ? managerById.get(employee.managerId) : '';
                    return (
                      <tr key={employee.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar-initial">
                              {employee.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <p className="font-bold">{normalizeDisplayName(employee.name)}</p>
                          </div>
                        </td>
                        <td>{employee.registration || '-'}</td>
                        <td>{managerName || '-'}</td>
                        <td>
                          <span className="badge-inactive">{employee.department}</span>
                        </td>
                        <td>{employee.position}</td>
                        <td><StatusBadge status={employee.status} /></td>
                        <td><AccessBadge employee={employee} /></td>
                        {(canEdit || isGestor) && (
                          <td>
                            <div className="flex justify-end flex-wrap gap-1.5">
                              {canDownloadSheet && canEdit && (
                                <>
                                  <button onClick={() => handleDownloadFicha(employee)} disabled={company.loading} className="btn-action">
                                    <FileText size={12} strokeWidth={2.5} /> Ficha
                                  </button>
                                  <button onClick={() => handleDownloadSheet(employee)} disabled={downloadingId === employee.id || company.loading} className="btn-action">
                                    <Download size={12} strokeWidth={2.5} /> Folha
                                  </button>
                                  <button onClick={() => handleDownloadOcorrencias(employee)} disabled={downloadingId === employee.id || company.loading} className="btn-action">
                                    <AlertTriangle size={12} strokeWidth={2.5} /> Ocorrências
                                  </button>
                                </>
                              )}
                              {(canEdit || isGestor) && (
                                <button onClick={() => router.push(`/${tenant}/dashboard/time-track?employeeId=${employee.id}`)} className="btn-action">
                                  Ponto
                                </button>
                              )}
                              {canEdit && (
                                <>
                                  <Link href={`/${tenant}/dashboard/employees/new?id=${employee.id}`} className="btn-action">
                                    <Edit3 size={12} strokeWidth={2.5} /> Editar
                                  </Link>
                                  <button onClick={() => handleTerminate(employee)} disabled={employee.status === 'TERMINATED' || terminate.loading} className="btn-warn">
                                    <UserMinus size={12} strokeWidth={2.5} /> Desligar
                                  </button>
                                  <button onClick={() => handleDelete(employee)} disabled={remove.loading} className="btn-danger">
                                    <Trash2 size={12} strokeWidth={2.5} /> Excluir
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
  if (!employee.user.isActive) return <span className="badge-alert">Bloqueado</span>;
  if (employee.user.forcePasswordChange) return <span className="badge-warn">Trocar senha</span>;
  return <span className="badge-active">Ativo</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'badge-active',
    INACTIVE: 'badge-inactive',
    SUSPENDED: 'badge-warn',
    TERMINATED: 'badge-alert',
  };
  const colorMap: Record<string, string> = {
    ACTIVE: 'bg-emerald-500',
    INACTIVE: 'bg-zinc-400',
    SUSPENDED: 'bg-amber-500',
    TERMINATED: 'bg-red-500',
  };
  return (
    <span className={map[status] ?? map.INACTIVE}>
      <span className={`badge-dot ${colorMap[status] ?? colorMap.INACTIVE}`}></span>
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

function daysInMonth(y: number, m: number) { return new Date(Date.UTC(y,m+1,0)).getUTCDate(); }
function isCycle(date: Date, emp: Employee, work: number, off: number) {
  const adm = emp.admissionDate ? new Date(emp.admissionDate) : new Date('2020-01-01');
  const a = Date.UTC(adm.getUTCFullYear(), adm.getUTCMonth(), adm.getUTCDate());
  const b = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diff = Math.floor((b-a)/864e5);
  if (diff<0) return false;
  return (diff%(work+off)) >= work;
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
function isAntesAdmissao(key: string, emp: Employee): boolean {
  if (!emp.admissionDate) return false;
  return key < emp.admissionDate.slice(0,10);
}
function toDateKey(v?: string | null) { return v ? v.slice(0,10) : ''; }

function buildGrid(month: string, emp: Employee, tracks: TimeTrack[]) {
  const [y,m] = month.split('-').map(Number); if (!y||!m) return [];
  const total = daysInMonth(y,m-1);
  const today = new Date().toISOString().slice(0,10);
  const map = new Map<string, TimeTrack>();
  for (const t of tracks) map.set(toDateKey(t.date), t);
  const g: any[] = [];
  for (let d=1; d<=total; d++) {
    const date = new Date(Date.UTC(y,m-1,d));
    const key = date.toISOString().slice(0,10);
    g.push({date,key,day:d,wd:date.getUTCDay(),isRest: isRestDay(date,emp),isFuture: key>today,antesAdmissao: isAntesAdmissao(key,emp), track: map.get(key)});
  }
  return g;
}

function isFalta(row: TimeTrack) {
  if (row.entry || row.exit) return false;
  const o = (row.observation ?? '').toLowerCase();
  return !o.includes('atestado') && !o.includes('feriado') && !o.includes('folga') && !o.includes('suspensao') && !o.includes('suspensão');
}

function dayStatus(row: TimeTrack) {
  if (row.manualStatus==='revoked') return 'REVOGADO';
  const o = (row.observation ?? '').toLowerCase();
  if (o.includes('atestado integral')) return 'ATESTADO';
  if (o.includes('atestado') && o.includes('horas')) return 'ATESTADO (HORAS)';
  if (o.includes('suspensao') || o.includes('suspensão')) return 'SUSPENSÃO';
  if (o.includes('feriado')) return 'FERIADO';
  if (o.includes('folga extra')) return 'FOLGA EXTRA';
  if (o.includes('folga banco')) return 'FOLGA BANCO';
  if (o.includes('folga')) return 'FOLGA';
  const r = (row.manualReason ?? '').toLowerCase();
  if (r.includes('atestado integral')) return 'ATESTADO';
  if (r.includes('feriado')) return 'FERIADO';
  if (r.includes('folga dsr')) return 'FOLGA';
  if (row.manualStatus==='pending') return 'PENDENTE';
  if (row.manualStatus==='rejected') return 'REJEITADO';
  if (row.manualReason || o.includes('ajuste')) return 'AJUSTE MANUAL';
  if (!row.entry && !row.exit) return 'FALTA';
  return 'NORMAL';
}

function downloadEmployeeSheet(employee: Employee, rows: TimeTrack[], month: string, company: Company | null, managerName: string) {
  const monthLabelText = monthLabelFn(month);
  const grid = buildGrid(month, employee, rows);
  
  const validTracks = grid.map(g => g.track).filter(Boolean) as TimeTrack[];
  const totalWorked = validTracks.reduce((t, r) => t + (r.totalWorked ?? 0), 0);
  const totalBalance = validTracks.reduce((t, r) => t + (r.dailyBalance ?? 0), 0);
  const positiveBalance = validTracks.reduce((t, r) => t + Math.max(r.dailyBalance ?? 0, 0), 0);
  const negativeBalance = validTracks.reduce((t, r) => t + Math.abs(Math.min(r.dailyBalance ?? 0, 0)), 0);
  const faltasCount = grid.filter(g => g.track && isFalta(g.track)).length;

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

  const tableHeaders = ['Data', 'Dia', '1a E.', '1a S.', '2a E.', '2a S.', 'Abono', 'H.E.', 'Absent.', 'Jornada', 'Ad. Not.', 'Observacao'];
  const tableRows = grid.map((g) => {
    const WEEKDAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
    const wd = WEEKDAYS[g.wd];
    const dateStr = String(g.day).padStart(2,'0') + '/' + month.split('-')[1] + '/' + month.split('-')[0];

    if (g.isFuture) {
      return `<tr><td style="padding:2px 4px;font-size:7px;color:#cbd5e1;">${dateStr}</td><td style="padding:2px 4px;font-size:7px;color:#cbd5e1;">${wd}</td><td colspan="10" style="padding:2px 4px;font-size:7px;color:#cbd5e1;text-align:center;">-</td></tr>`;
    }
    if (g.antesAdmissao) {
      return `<tr><td style="padding:2px 4px;font-size:7px;color:#94a3b8;">${dateStr}</td><td style="padding:2px 4px;font-size:7px;color:#94a3b8;">${wd}</td><td colspan="10" style="padding:2px 4px;font-size:7px;color:#94a3b8;text-align:center;">ANTES DA ADMISSÃO</td></tr>`;
    }

    const t = g.track;
    if (!t) {
      if (g.isRest) return `<tr><td style="padding:2px 4px;font-size:7px;color:#64748b;">${dateStr}</td><td style="padding:2px 4px;font-size:7px;color:#64748b;">${wd}</td><td colspan="10" style="padding:2px 4px;font-size:7px;color:#64748b;text-align:center;font-weight:700;">DSR / FOLGA</td></tr>`;
      return `<tr><td style="padding:2px 4px;font-size:7px;color:#e11d48;font-weight:600;">${dateStr}</td><td style="padding:2px 4px;font-size:7px;color:#e11d48;font-weight:600;">${wd}</td><td colspan="10" style="padding:2px 4px;font-size:7px;color:#e11d48;text-align:center;font-weight:700;">FALTA NÃO JUSTIFICADA</td></tr>`;
    }

    const balance = t.dailyBalance ?? 0;
    const balanceColor = balance < 0 ? '#e11d48' : balance > 0 ? '#059669' : '#64748b';
    const hasMissing = !t.entry || !t.exit;
    let ocorrencia = dayStatus(t);
    if (ocorrencia === 'NORMAL') ocorrencia = hasMissing ? 'PONTO INCOMPLETO' : '';

    const he = balance > 0 ? formatMinutes(balance) : '';
    const absent = balance < 0 ? formatMinutes(Math.abs(balance)) : '';
    const jornada = formatMinutes(t.totalWorked ?? 0);
    
    return `<tr>
      <td style="padding:2px 4px;font-size:7px;font-weight:600;color:#0f172a;">${dateStr}</td>
      <td style="padding:2px 4px;font-size:7px;color:#334155;">${wd}</td>
      <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;">${escapeHtml(formatTime(t.entry))}</td>
      <td style="padding:2px 4px;font-size:7px;color:#94a3b8;text-align:center;">--:--</td>
      <td style="padding:2px 4px;font-size:7px;color:#94a3b8;text-align:center;">--:--</td>
      <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;">${escapeHtml(formatTime(t.exit))}</td>
      <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;"></td>
      <td style="padding:2px 4px;font-size:7px;color:#059669;text-align:center;font-weight:600;">${escapeHtml(he)}</td>
      <td style="padding:2px 4px;font-size:7px;color:#e11d48;text-align:center;font-weight:600;">${escapeHtml(absent)}</td>
      <td style="padding:2px 4px;font-size:7px;font-weight:700;color:#0f172a;text-align:center;">${escapeHtml(jornada)}</td>
      <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;"></td>
      <td style="padding:2px 4px;font-size:6px;color:#64748b;">${escapeHtml(ocorrencia)}</td>
    </tr>`;
  });

  const companyData: PdfCompanyInfo | null = company ? {
    name: company.name,
    legalName: company.legalName,
    document: company.cnpj,
    logoUrl: company.logoUrl,
    phone: company.phone,
    email: company.email,
    address: [company.street, company.streetNumber, company.neighborhood, company.city, company.state, company.cep].filter(Boolean).map(String).join(', ') || undefined
  } : null;

  const html = buildPdfShell({ title: 'Espelho de Ponto Oficial', subtitle: `${monthLabelText} — ${normalizeDisplayName(employee.name)}`, landscape: false }, companyData, `
    ${section('Dados do Colaborador', infoGrid(employeeInfo, 4))}

    ${section('Registros de Ponto Diário', pdfTable(tableHeaders, tableRows, { compact: true, border: true }), { avoidBreak: false, noBg: true })}

    ${section('Resumo do Período', `
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:8px;font-weight:800;text-transform:uppercase;color:#0f766e;letter-spacing:0.05em;">Dias Trabalhados</div>
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${validTracks.length}</div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:8px;font-weight:800;text-transform:uppercase;color:#e11d48;letter-spacing:0.05em;">Faltas Integrais</div>
          <div style="font-size:16px;font-weight:900;color:#e11d48;margin-top:4px;">${faltasCount}</div>
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
        SALDO DO BANCO DE HORAS NESTE MÊS: <span style="font-weight:900;color:${totalBalance < 0 ? '#e11d48' : totalBalance > 0 ? '#059669' : '#64748b'};">
          ${escapeHtml(formatMinutes(totalBalance))}
        </span>
      </div>
    `)}

    ${section('Horários', pdfTable(
      ['Data Base', 'Entrada', 'Saída Almoço', 'Retorno Almoço', 'Saída', 'Turno / Carga Horária'],
      [
        `<tr>
          <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;">01/${month.split('-')[1]}/${month.split('-')[0]}</td>
          <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;">--:--</td>
          <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;">--:--</td>
          <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;">--:--</td>
          <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;">--:--</td>
          <td style="padding:2px 4px;font-size:7px;color:#0f172a;text-align:center;">${escapeHtml(employee.workScale || 'Não definida')} - ${escapeHtml(employee.dailyWorkload || '')}</td>
        </tr>`
      ],
      { compact: true, border: true }
    ), { avoidBreak: true })}

    ${signatureBlock(['Assinatura do Colaborador', 'Assinatura do RH / Responsável'])}
  `);

  printPdf(html, `folha-ponto-${slugify(employee.name)}-${month}.pdf`);
}

function downloadEmployeeOcorrenciasSheet(employee: Employee, rows: TimeTrack[], month: string, company: Company | null, managerName: string) {
  const monthLabelText = monthLabelFn(month);
  const grid = buildGrid(month, employee, rows);
  
  const occurrenceGrid = grid.filter(g => {
    if (g.isFuture || g.antesAdmissao) return false;
    if (!g.track) {
      return !g.isRest; // Falta Não Justificada is an occurrence
    }
    const t = g.track;
    const hasMissing = !t.entry || !t.exit;
    const status = dayStatus(t);
    const balance = t.dailyBalance ?? 0;
    return status !== 'NORMAL' || hasMissing || balance !== 0;
  });
  
  const fullMonthGrid = grid;
  const fullValidTracks = fullMonthGrid.map(g => g.track).filter(Boolean) as TimeTrack[];
  const totalWorked = fullValidTracks.reduce((t, r) => t + (r.totalWorked ?? 0), 0);
  const totalBalance = fullValidTracks.reduce((t, r) => t + (r.dailyBalance ?? 0), 0);
  const positiveBalance = fullValidTracks.reduce((t, r) => t + Math.max(r.dailyBalance ?? 0, 0), 0);
  const negativeBalance = fullValidTracks.reduce((t, r) => t + Math.abs(Math.min(r.dailyBalance ?? 0, 0)), 0);
  const faltasCount = fullMonthGrid.filter(g => g.track && isFalta(g.track)).length;
  
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

  const tableHeaders = ['Data', 'Dia', '1a E.', '1a S.', '2a E.', '2a S.', 'Abono', 'H.E.', 'Absent.', 'Jornada', 'Ad. Not.', 'Observacao'];
  
  let tableRows: string[];
  const WEEKDAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
  if (occurrenceGrid.length === 0) {
    tableRows = [`<tr><td colspan="12" style="padding:12px;text-align:center;font-size:9px;color:#64748b;font-weight:600;">Nenhuma ocorrência registrada neste período.</td></tr>`];
  } else {
    tableRows = occurrenceGrid.map((g) => {
      const wd = WEEKDAYS[g.wd];
      const dateStr = `${String(g.day).padStart(2,'0')}/${month.split('-')[1]}/${month.split('-')[0]}`;
      const t = g.track;
      if (!t) return `<tr><td style="padding:2px 4px;font-size:7px;color:#e11d48;font-weight:600;">${dateStr}</td><td style="padding:2px 4px;font-size:7px;color:#e11d48;">${wd}</td><td colspan="10" style="padding:2px 4px;font-size:7px;color:#e11d48;text-align:center;font-weight:700;">FALTA NÃO JUSTIFICADA</td></tr>`;
      const balance = t.dailyBalance ?? 0;
      const hasMissing = !t.entry || !t.exit;
      let ocorrencia = dayStatus(t);
      if (ocorrencia === 'NORMAL') ocorrencia = hasMissing ? 'PONTO INCOMPLETO' : '';
      const he = balance > 0 ? formatMinutes(balance) : '';
      const absent = balance < 0 ? formatMinutes(Math.abs(balance)) : '';
      const jornada = formatMinutes(t.totalWorked ?? 0);
      return `<tr>
        <td style="padding:2px 4px;font-size:7px;font-weight:600;color:#0f172a;">${dateStr}</td>
        <td style="padding:2px 4px;font-size:7px;color:#334155;">${wd}</td>
        <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;">${escapeHtml(formatTime(t.entry))}</td>
        <td style="padding:2px 4px;font-size:7px;color:#94a3b8;text-align:center;">--:--</td>
        <td style="padding:2px 4px;font-size:7px;color:#94a3b8;text-align:center;">--:--</td>
        <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;">${escapeHtml(formatTime(t.exit))}</td>
        <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;"></td>
        <td style="padding:2px 4px;font-size:7px;color:#059669;text-align:center;font-weight:600;">${escapeHtml(he)}</td>
        <td style="padding:2px 4px;font-size:7px;color:#e11d48;text-align:center;font-weight:600;">${escapeHtml(absent)}</td>
        <td style="padding:2px 4px;font-size:7px;font-weight:700;color:#0f172a;text-align:center;">${escapeHtml(jornada)}</td>
        <td style="padding:2px 4px;font-size:7px;color:#334155;text-align:center;"></td>
        <td style="padding:2px 4px;font-size:6px;color:#64748b;">${escapeHtml(ocorrencia)}</td>
      </tr>`;
    });
  }

  const companyData: PdfCompanyInfo | null = company ? {
    name: company.name,
    legalName: company.legalName,
    document: company.cnpj,
    logoUrl: company.logoUrl,
    phone: company.phone,
    email: company.email,
    address: [company.street, company.streetNumber, company.neighborhood, company.city, company.state, company.cep].filter(Boolean).map(String).join(', ') || undefined
  } : null;

  const html = buildPdfShell({ title: 'Ficha de Ocorrências de Ponto', subtitle: `${monthLabelText} — ${normalizeDisplayName(employee.name)}`, landscape: false }, companyData, `
    ${section('Dados do Colaborador', infoGrid(employeeInfo, 4))}

    ${section('Divergências e Ocorrências no Período', pdfTable(tableHeaders, tableRows, { compact: true, border: true }), { avoidBreak: false, noBg: true })}

    ${section('Resumo do Período', `
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:8px;font-weight:800;text-transform:uppercase;color:#0f766e;letter-spacing:0.05em;">Dias Trabalhados</div>
          <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:4px;">${fullValidTracks.length}</div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:8px;font-weight:800;text-transform:uppercase;color:#e11d48;letter-spacing:0.05em;">Faltas Integrais</div>
          <div style="font-size:16px;font-weight:900;color:#e11d48;margin-top:4px;">${faltasCount}</div>
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
        SALDO DO BANCO DE HORAS NESTE MÊS: <span style="font-weight:900;color:${totalBalance < 0 ? '#e11d48' : totalBalance > 0 ? '#059669' : '#64748b'};">
          ${escapeHtml(formatMinutes(totalBalance))}
        </span>
      </div>
    `)}

    ${signatureBlock(['Assinatura do Colaborador', 'Assinatura do RH / Responsável'])}
  `);

  printPdf(html, `ficha-ocorrencias-${slugify(employee.name)}-${month}.pdf`);
}

function downloadEmployeeRecord(employee: Employee, company: Company | null, managerName: string) {
  const title = 'Ficha de Registro de Empregado';

  const personalInfo = [
    { label: 'Nome Completo', value: normalizeDisplayName(employee.name) },
    { label: 'Data de Nascimento', value: formatDate(employee.birthDate) },
    { label: 'CPF', value: employee.cpf || '-' },
    { label: 'Gênero', value: employee.gender || '-' },
    { label: 'Estado Civil', value: employee.maritalStatus || '-' },
    { label: 'E-mail', value: employee.email || '-' },
    { label: 'Telefone', value: employee.phone || '-' },
    { label: 'Telefone 2', value: employee.secondaryPhone || '-' },
    { label: 'Naturalidade', value: employee.birthplace || '-' },
    { label: 'Nacionalidade', value: employee.nationality || '-' },
    { label: 'Escolaridade', value: employee.education || '-' },
    { label: 'Nome da Mãe', value: employee.motherName || '-' },
    { label: 'Nome do Pai', value: employee.fatherName || '-' },
    { label: 'RG', value: employee.rg || '-' },
    { label: 'RG Emissor/UF', value: employee.rgIssuer ? `${employee.rgIssuer}/${employee.rgState || '-'}` : '-' },
    { label: 'Data Emissão RG', value: formatDate(employee.rgIssueDate) || '-' },
  ];

  const docsInfo = [
    { label: 'PIS / PASEP / NIT', value: employee.pis || '-' },
    { label: 'Tít. Eleitor Nº', value: employee.voterTitle || '-' },
    { label: 'Zona', value: employee.voterZone || '-' },
    { label: 'Seção', value: employee.voterSection || '-' },
    { label: 'UF Eleitor', value: employee.voterState || '-' },
    { label: 'Reservista', value: employee.reservista || '-' },
  ];

  const addressInfo = [
    { label: 'CEP', value: employee.cep || '-' },
    { label: 'Logradouro', value: employee.street || '-' },
    { label: 'Número', value: employee.streetNumber || '-' },
    { label: 'Complemento', value: employee.addressComplement || '-' },
    { label: 'Bairro', value: employee.neighborhood || '-' },
    { label: 'Cidade', value: employee.city || '-' },
    { label: 'Estado', value: employee.state || '-' },
  ];

  const contractInfo = [
    { label: 'Matrícula', value: employee.registration || '-' },
    { label: 'Cargo', value: employee.position || '-' },
    { label: 'Departamento', value: employee.department || '-' },
    { label: 'Unidade', value: employee.unit || '-' },
    { label: 'Gestor', value: managerName || '-' },
    { label: 'Admissão', value: formatDate(employee.admissionDate) },
    { label: 'Tipo Contrato', value: employee.contractType || '-' },
    { label: 'Salário (R$)', value: employee.salary ? Number(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-' },
    { label: 'Status', value: EMPLOYEE_STATUS_LABEL[employee.status] || employee.status },
    { label: 'Demissão', value: formatDate(employee.terminationDate) || '-' },
  ];

  const timeInfo = [
    { label: 'Escala', value: employee.customWorkScale || employee.workScale || '-' },
    { label: 'Jornada Diária', value: employee.dailyWorkload || '-' },
    { label: 'Entrada', value: employee.standardEntry || '-' },
    { label: 'Saída Almoço', value: employee.standardLunchStart || '-' },
    { label: 'Retorno Almoço', value: employee.standardLunchReturn || '-' },
    { label: 'Saída', value: employee.standardExit || '-' },
  ];

  const bankInfo = [
    { label: 'Banco', value: employee.bankName || '-' },
    { label: 'Agência', value: employee.bankAgency || '-' },
    { label: 'Conta', value: employee.bankAccount || '-' },
    { label: 'Tipo de Conta', value: employee.bankAccountType || '-' },
  ];

  let dependentsSection = '';
  if (employee.dependents) {
    try {
      const deps: Array<{ nome: string; cpf: string; dataNascimento: string; parentesco: string }> = JSON.parse(employee.dependents);
      if (Array.isArray(deps) && deps.length > 0) {
        const depRows = deps.map((d) => `
          <tr>
            <td style="padding:4px 8px;font-size:9px;color:#0f172a;">${escapeHtml(d.nome || '-')}</td>
            <td style="padding:4px 8px;font-size:9px;color:#334155;">${escapeHtml(d.cpf || '-')}</td>
            <td style="padding:4px 8px;font-size:9px;color:#334155;">${escapeHtml(d.dataNascimento ? new Date(d.dataNascimento).toLocaleDateString('pt-BR') : '-')}</td>
            <td style="padding:4px 8px;font-size:9px;color:#334155;">${escapeHtml(d.parentesco || '-')}</td>
          </tr>`);
        dependentsSection = section('Dependentes', pdfTable(
          ['Nome', 'CPF', 'Nascimento', 'Parentesco'],
          depRows,
          { compact: true }
        ));
      }
    } catch { /* ignore */ }
  }

  const companyData: PdfCompanyInfo | null = company ? {
    name: company.name,
    legalName: company.legalName,
    document: company.cnpj,
    logoUrl: company.logoUrl,
    phone: company.phone,
    email: company.email,
    address: [company.street, company.streetNumber, company.neighborhood, company.city, company.state, company.cep].filter(Boolean).map(String).join(', ') || undefined
  } : null;

  const html = buildPdfShell({ title, subtitle: normalizeDisplayName(employee.name), landscape: false }, companyData, `
    ${section('Dados Pessoais', infoGrid(personalInfo, 5))}
    ${section('Documentação', infoGrid(docsInfo, 5))}
    ${section('Endereço', infoGrid(addressInfo, 5))}
    ${section('Dados Profissionais', infoGrid(contractInfo, 5))}
    ${section('Jornada e Escala de Trabalho', infoGrid(timeInfo, 5))}
    ${section('Dados Bancários', infoGrid(bankInfo, 5))}
    ${dependentsSection}
    ${employee.observations ? section('Observações', `<p style="font-size:9px;color:#475569;">${escapeHtml(employee.observations)}</p>`) : ''}
    ${signatureBlock(['Assinatura do Funcionário', 'Assinatura do RH / Empregador'])}
  `);
  printPdf(html, `ficha-registro-${slugify(employee.name)}.pdf`);
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