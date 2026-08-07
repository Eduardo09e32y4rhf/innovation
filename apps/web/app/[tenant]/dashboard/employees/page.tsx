'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Download, Edit3, FileText, Search, Trash2, UserMinus, UserPlus, Users, XCircle, AlertTriangle, FolderOpen, ShieldCheck, HeartPulse, Clock3, CalendarDays, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { API_URL, api, type Employee, type EmployeeDossier } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { ConfirmDialog, Modal } from '@/app/components/ui';
import { EMPLOYEE_STATUS_LABEL, formatDate, formatMinutes, formatTime } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

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
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; action: () => Promise<void> | void; confirmText?: string; variant?: 'danger'|'primary' }>({ open: false, title: '', description: '', action: () => {} });
  const [promptDialog, setPromptDialog] = useState<{ open: boolean; title: string; description: string; expected: string; action: () => Promise<void> | void }>({ open: false, title: '', description: '', expected: '', action: () => {} });
  const [promptInput, setPromptInput] = useState('');
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

  const terminate = useMutation((id: string) => api.employees.terminate(id), { onSuccess: () => refetch() });
  const remove = useMutation((id: string) => api.employees.delete(id), { onSuccess: () => refetch() });
  const dossierQuery = useQuery(() => api.employees.dossier(selectedEmployeeId ?? ''), [selectedEmployeeId], { enabled: !!selectedEmployeeId });

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
  const onboardingCount = employees.filter(e => e.status === 'ONBOARDING').length;
  const inactiveCount = employees.filter(e => e.status === 'INACTIVE').length + onboardingCount;
  const terminatedCount = employees.filter(e => e.status === 'TERMINATED').length;

  async function handleTerminate(employee: Employee) {
    if (employee.status === 'TERMINATED') return;
    setConfirmDialog({
      open: true,
      title: 'Desligar funcionário',
      description: `Desligar ${normalizeDisplayName(employee.name)}? O cadastro será marcado como desligado.`,
      confirmText: 'Desligar',
      variant: 'danger',
      action: async () => {
        await terminate.mutate(employee.id).catch(() => {});
      }
    });
  }

  async function handleDelete(employee: Employee) {
    const expected = normalizeDisplayName(employee.name);
    setPromptInput('');
    setPromptDialog({
      open: true,
      title: 'Excluir definitivamente',
      description: `Para confirmar a exclusão de ${expected}, digite o nome abaixo:`,
      expected,
      action: async () => {
        await remove.mutate(employee.id).catch(() => {});
      }
    });
  }

  async function handleSafeDelete(employee: Employee) {
    const expected = normalizeDisplayName(employee.name);
    setPromptInput('');
    setPromptDialog({
      open: true,
      title: 'Arquivar ou excluir funcionário',
      description: `Para confirmar a exclusão de ${expected}, digite o nome abaixo:`,
      expected,
      action: async () => {
        const result = await remove.mutate(employee.id).catch(() => null);
        if (result?.archived) {
          setAlertDialog({ open: true, title: 'Funcionário Arquivado', message: 'Funcionário arquivado com segurança. O histórico foi preservado e o acesso foi bloqueado.' });
        } else if (result?.deleted) {
          setAlertDialog({ open: true, title: 'Funcionário Removido', message: 'Funcionário removido definitivamente porque não possuía histórico vinculado.' });
        }
      }
    });
  }

  async function handleDownloadFicha(employee: Employee) {
    setDownloadingId(employee.id);
    try {
      await downloadEmployeePdf(employee, 'record');
    } catch (downloadError) {
      setAlertDialog({ open: true, title: 'Erro de Download', message: downloadError instanceof Error ? downloadError.message : 'Nao foi possivel baixar a ficha do funcionario.' });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDownloadSheet(employee: Employee) {
    const month = currentMonth();
    setDownloadingId(employee.id);
    try {
      await downloadEmployeePdf(employee, 'point-sheet', month);
    } catch {
      setAlertDialog({ open: true, title: 'Erro de Download', message: 'Não foi possível baixar a folha deste funcionário.' });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDownloadOcorrencias(employee: Employee) {
    const month = currentMonth();
    setDownloadingId(employee.id);
    try {
      await downloadEmployeePdf(employee, 'occurrences', month);
    } catch {
      setAlertDialog({ open: true, title: 'Erro de Download', message: 'Não foi possível baixar a ficha de ocorrências deste funcionário.' });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="app-page">
      <div className="app-page-content flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Cadastro da equipe</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie as informações, documentos e acessos dos funcionários.</p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/${tenant}/dashboard/employees/import`} className="btn-outline flex items-center gap-2">
                <Download size={15} /> Importar XLSX
              </Link>
              <Link href={`/${tenant}/dashboard/employees/new`} className="btn-primary flex items-center gap-2">
                <UserPlus size={15} /> Novo funcionário
              </Link>
            </div>
          )}
        </div>

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
                                  <button onClick={() => handleDownloadFicha(employee)} disabled={downloadingId === employee.id} className="btn-action">
                                    <FileText size={12} strokeWidth={2.5} /> Ficha
                                  </button>
                                  <button onClick={() => handleDownloadSheet(employee)} disabled={downloadingId === employee.id} className="btn-action">
                                    <Download size={12} strokeWidth={2.5} /> Folha
                                  </button>
                                  <button onClick={() => handleDownloadOcorrencias(employee)} disabled={downloadingId === employee.id} className="btn-action">
                                    <AlertTriangle size={12} strokeWidth={2.5} /> Ocorrências
                                  </button>
                                </>
                              )}
                              {(canEdit || isGestor) && (
                                <button onClick={() => router.push(`/${tenant}/dashboard/time-track?employeeId=${employee.id}`)} className="btn-action">
                                  Ponto
                                </button>
                              )}
                              <button onClick={() => setSelectedEmployeeId(employee.id)} className="btn-action">
                                <FolderOpen size={12} strokeWidth={2.5} /> Dossie
                              </button>
                              {canEdit && (
                                <>
                                  <Link href={`/${tenant}/dashboard/employees/new?id=${employee.id}`} className="btn-action">
                                    <Edit3 size={12} strokeWidth={2.5} /> Editar
                                  </Link>
                                  <button onClick={() => handleTerminate(employee)} disabled={employee.status === 'TERMINATED' || terminate.loading} className="btn-warn">
                                    <UserMinus size={12} strokeWidth={2.5} /> Desligar
                                  </button>
                                  <button onClick={() => handleSafeDelete(employee)} disabled={remove.loading} className="btn-danger">
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
          
          <EmployeeDossierDrawer
            employeeId={selectedEmployeeId}
            dossier={dossierQuery.data as EmployeeDossier | undefined}
            loading={dossierQuery.loading}
            error={dossierQuery.error}
            onClose={() => setSelectedEmployeeId(null)}
          />

          <ConfirmDialog 
            isOpen={confirmDialog.open} 
            onClose={() => setConfirmDialog(c => ({...c, open: false}))} 
            onConfirm={async () => {
              await confirmDialog.action();
              setConfirmDialog(c => ({...c, open: false}));
            }} 
            title={confirmDialog.title} 
            description={confirmDialog.description} 
            confirmText={confirmDialog.confirmText} 
            variant={confirmDialog.variant} 
          />

          <Modal isOpen={promptDialog.open} onClose={() => setPromptDialog(p => ({...p, open: false}))} title={promptDialog.title} maxWidth="max-w-md">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{promptDialog.description}</p>
              <input 
                type="text" 
                value={promptInput} 
                onChange={e => setPromptInput(e.target.value)} 
                className="form-control" 
                placeholder="Digite o nome..." 
              />
              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setPromptDialog(p => ({...p, open: false}))} className="btn-outline px-4 py-2">Cancelar</button>
                <button 
                  onClick={async () => {
                    await promptDialog.action();
                    setPromptDialog(p => ({...p, open: false}));
                  }} 
                  disabled={promptInput !== promptDialog.expected}
                  className="btn-danger px-4 py-2"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </Modal>

          <Modal isOpen={alertDialog.open} onClose={() => setAlertDialog(a => ({...a, open: false}))} title={alertDialog.title} maxWidth="max-w-md">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{alertDialog.message}</p>
              <div className="flex justify-end pt-4">
                <button onClick={() => setAlertDialog(a => ({...a, open: false}))} className="btn-primary px-4 py-2">Entendi</button>
              </div>
            </div>
          </Modal>
        </>
      )}
      </div>
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
    ONBOARDING: 'badge-warn',
    INACTIVE: 'badge-inactive',
    SUSPENDED: 'badge-warn',
    TERMINATED: 'badge-alert',
  };
  const colorMap: Record<string, string> = {
    ACTIVE: 'bg-emerald-500',
    ONBOARDING: 'bg-amber-500',
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



function EmployeeDossierDrawer({
  employeeId,
  dossier,
  loading,
  error,
  onClose,
}: {
  employeeId: string | null;
  dossier?: EmployeeDossier;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
}) {
  if (!employeeId) return null;

  const employee = dossier?.employee;
  const asoRecords = dossier?.asoRecords ?? [];
  const vacations = dossier?.vacations ?? [];
  const recentTimeTracks = dossier?.recentTimeTracks ?? [];
  const occurrences = dossier?.occurrences ?? [];
  const impact = dossier?.deletionImpact;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/35 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-[720px] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-teal-600">Dossie do colaborador</p>
              <h3 className="text-xl font-black text-slate-950">{employee ? normalizeDisplayName(employee.name) : 'Carregando...'}</h3>
              <p className="text-xs text-slate-500">ASO, historico recente, ferias e impacto de arquivamento em um unico painel.</p>
            </div>
            <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          {loading && <LoadingState label="Carregando dossie do funcionario..." />}
          {!loading && error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

          {!loading && !error && employee && (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DossierStat icon={<ShieldCheck size={16} />} label="Status" value={EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status} />
                <DossierStat icon={<HeartPulse size={16} />} label="ASOs" value={String(asoRecords.length)} />
                <DossierStat icon={<CalendarDays size={16} />} label="Ferias" value={String(vacations.length)} />
                <DossierStat icon={<Clock3 size={16} />} label="Ocorrencias" value={String(occurrences.length)} />
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-950">Resumo 360</h4>
                  <span className="text-[11px] font-semibold text-slate-500">Acesso: {employee.user?.isActive ? 'Liberado' : 'Bloqueado'}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <InfoLine label="CPF" value={maskCpf(employee.cpf)} />
                  <InfoLine label="E-mail" value={maskEmail(employee.email)} />
                  <InfoLine label="Telefone" value={maskPhone(employee.phone)} />
                  <InfoLine label="Matricula" value={employee.registration || '-'} />
                  <InfoLine label="Cargo" value={employee.position || '-'} />
                  <InfoLine label="Departamento" value={employee.department || '-'} />
                  <InfoLine label="Admissao" value={formatDate(employee.admissionDate)} />
                  <InfoLine label="Desligamento" value={formatDate(employee.terminationDate)} />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-sm font-black text-slate-950">Saude ocupacional e ASO</h4>
                {asoRecords.length === 0 ? (
                  <p className="text-xs text-slate-500">Nenhum ASO registrado para este colaborador.</p>
                ) : (
                  <div className="space-y-2">
                    {asoRecords.slice(0, 6).map((record) => {
                      const alert = getAsoAlert(record.status, record.dueDate);
                      return (
                        <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{record.asoType}</p>
                            <p className="text-xs text-slate-500">
                              Exame: {fmtDate(record.examDate)} • Vencimento: {fmtDate(record.dueDate)} • Clinica: {record.clinicName || 'Nao informada'}
                            </p>
                          </div>
                          <span className={`inline-flex rounded-[6px] border px-2 py-1 text-[10px] font-black ${alert.cls}`}>{alert.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-black text-slate-950">Ferias recentes</h4>
                  {vacations.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhuma solicitacao de ferias encontrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {vacations.slice(0, 5).map((vacation: any) => (
                        <div key={vacation.id} className="rounded-xl border border-slate-200 px-3 py-2">
                          <p className="text-sm font-bold text-slate-900">
                            {formatDate(vacation.startDate)} ate {formatDate(vacation.endDate)}
                          </p>
                          <p className="text-xs text-slate-500">Status: {vacation.status} • Dias: {vacation.days ?? '-'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-black text-slate-950">Batidas e ocorrencias recentes</h4>
                  <div className="space-y-2">
                    {recentTimeTracks.slice(0, 5).map((row) => (
                      <div key={row.id} className="rounded-xl border border-slate-200 px-3 py-2">
                        <p className="text-sm font-bold text-slate-900">{formatDate(row.date)}</p>
                        <p className="text-xs text-slate-500">
                          Entrada {formatTime(row.entry)} • Saida {formatTime(row.exit)} • Saldo {formatMinutes(row.dailyBalance ?? 0)}
                        </p>
                      </div>
                    ))}
                    {recentTimeTracks.length === 0 && <p className="text-xs text-slate-500">Sem batidas recentes para exibir.</p>}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h4 className="mb-2 text-sm font-black text-amber-950">Politica de exclusao segura</h4>
                <p className="text-xs text-amber-900">
                  Quando existe historico vinculado, a remocao definitiva e bloqueada e o cadastro e arquivado para preservar rastreabilidade legal e operacional.
                </p>
                {impact && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-amber-950 sm:grid-cols-4">
                    <InfoChip label="Ponto" value={String(impact.timeTracks)} />
                    <InfoChip label="Ferias" value={String(impact.vacations)} />
                    <InfoChip label="ASO" value={String(impact.asoRecords)} />
                    <InfoChip label="Ocorrencias" value={String(impact.timeOccurrences)} />
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DossierStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-slate-500">
        <span className="text-xs font-black uppercase tracking-[0.18em]">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || '-'}</p>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{label}</p>
      <p className="mt-1 text-sm font-black text-amber-950">{value}</p>
    </div>
  );
}

function fmtDate(v?: string | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-BR');
}

function maskCpf(value?: string | null) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '-';
  if (digits.length < 11) return value ?? '-';
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
}

function maskEmail(value?: string | null) {
  if (!value) return '-';
  const [name, domain] = value.split('@');
  if (!domain) return value;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

function maskPhone(value?: string | null) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '-';
  if (digits.length < 4) return value ?? '-';
  return `(**) *****-${digits.slice(-4)}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function downloadEmployeePdf(
  employee: Employee,
  document: 'point-sheet' | 'occurrences' | 'record',
  month?: string,
) {
  const token = readAuthSession().token;
  if (!token) throw new Error('Sessao expirada. Faca login novamente.');

  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const response = await fetch(`${API_URL}/employees/${employee.id}/documents/${document}.pdf${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : 'Nao foi possivel gerar o documento oficial.';
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const disposition = response.headers.get('content-disposition') ?? '';
  const encodedFilename = disposition.match(/filename="([^"]+)"/)?.[1];
  const filename = encodedFilename
    ? decodeURIComponent(encodedFilename)
    : `${document}-${normalizeDisplayName(employee.name)}.pdf`;

  const anchor = window.document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
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

function accessText(employee: Employee) {
  if (!employee.userId || !employee.user) return 'Sem acesso';
  if (!employee.user.isActive) return 'Bloqueado';
  if (employee.user.forcePasswordChange) return 'Trocar senha';
  return 'Acesso ativo';
}
