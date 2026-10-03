'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  AlertTriangle, CalendarDays, Clock3, Download, Edit3, FileText,
  FolderOpen, HeartPulse, Search, ShieldCheck, Trash2, UserMinus,
  UserPlus, Users, XCircle, X,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { API_URL, api, type Employee, type EmployeeDossier } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { ConfirmDialog, Modal } from '@/app/components/ui';
import { EMPLOYEE_STATUS_LABEL, formatDate, formatMinutes, formatTime } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { cn } from '@/app/lib/cn';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PAGE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; action: () => Promise<void> | void; confirmText?: string; variant?: 'danger' | 'primary' }>({ open: false, title: '', description: '', action: () => {} });
  const [promptDialog, setPromptDialog] = useState<{ open: boolean; title: string; description: string; expected: string; action: () => Promise<void> | void }>({ open: false, title: '', description: '', expected: '', action: () => {} });
  const [promptInput, setPromptInput] = useState('');
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

  const terminate = useMutation((id: string) => api.employees.terminate(id), { onSuccess: () => refetch() });
  const remove = useMutation((id: string) => api.employees.delete(id), { onSuccess: () => refetch() });
  const dossierQuery = useQuery(() => api.employees.dossier(selectedEmployeeId ?? ''), [selectedEmployeeId], { enabled: !!selectedEmployeeId });

  const employees = data ?? [];
  const managerById = useMemo(() => new Map(employees.map((e) => [e.id, normalizeDisplayName(e.name)])), [employees]);
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

  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const onboardingCount = employees.filter((e) => e.status === 'ONBOARDING').length;
  const inactiveCount = employees.filter((e) => e.status === 'INACTIVE').length + onboardingCount;
  const terminatedCount = employees.filter((e) => e.status === 'TERMINATED').length;

  async function handleTerminate(employee: Employee) {
    if (employee.status === 'TERMINATED') return;
    setConfirmDialog({
      open: true,
      title: 'Desligar funcionÃ¡rio',
      description: `Desligar ${normalizeDisplayName(employee.name)}? O cadastro serÃ¡ marcado como desligado.`,
      confirmText: 'Desligar',
      variant: 'danger',
      action: async () => { await terminate.mutate(employee.id).catch(() => {}); },
    });
  }

  async function handleSafeDelete(employee: Employee) {
    const expected = normalizeDisplayName(employee.name);
    setPromptInput('');
    setPromptDialog({
      open: true,
      title: 'Arquivar ou excluir funcionÃ¡rio',
      description: `Para confirmar a exclusÃ£o de ${expected}, digite o nome abaixo:`,
      expected,
      action: async () => {
        const result = await remove.mutate(employee.id).catch(() => null);
        if (result?.archived) {
          setAlertDialog({ open: true, title: 'FuncionÃ¡rio Arquivado', message: 'FuncionÃ¡rio arquivado com seguranÃ§a. O histÃ³rico foi preservado e o acesso foi bloqueado.' });
        } else if (result?.deleted) {
          setAlertDialog({ open: true, title: 'FuncionÃ¡rio Removido', message: 'FuncionÃ¡rio removido definitivamente porque nÃ£o possuÃ­a histÃ³rico vinculado.' });
        }
      },
    });
  }

  async function handleDownloadFicha(employee: Employee) {
    setDownloadingId(employee.id);
    try { await downloadEmployeePdf(employee, 'record'); }
    catch (e) { setAlertDialog({ open: true, title: 'Erro de Download', message: e instanceof Error ? e.message : 'NÃ£o foi possÃ­vel baixar a ficha.' }); }
    finally { setDownloadingId(null); }
  }

  async function handleDownloadSheet(employee: Employee) {
    setDownloadingId(employee.id);
    try { await downloadEmployeePdf(employee, 'point-sheet', currentMonth()); }
    catch { setAlertDialog({ open: true, title: 'Erro de Download', message: 'NÃ£o foi possÃ­vel baixar a folha deste funcionÃ¡rio.' }); }
    finally { setDownloadingId(null); }
  }

  async function handleDownloadOcorrencias(employee: Employee) {
    setDownloadingId(employee.id);
    try { await downloadEmployeePdf(employee, 'occurrences', currentMonth()); }
    catch { setAlertDialog({ open: true, title: 'Erro de Download', message: 'NÃ£o foi possÃ­vel baixar a ficha de ocorrÃªncias.' }); }
    finally { setDownloadingId(null); }
  }

  return (
    <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-600">
            Equipe
          </p>
          <h1 className="text-[clamp(1.75rem,1.5rem+1.4vw,2.25rem)] font-black tracking-tight text-fg">
            Cadastro da equipe
          </h1>
          <p className="mt-2 max-w-3xl text-[clamp(0.875rem,0.85rem+0.25vw,1rem)] font-medium text-fg-mut">
            Gerencie informaÃ§Ãµes, documentos e acessos dos funcionÃ¡rios.
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href={`/${tenant}/dashboard/employees/import`}
              className="btn-v2-outline"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Importar XLSX</span>
            </Link>
            <Link
              href={`/${tenant}/dashboard/employees/new`}
              className="btn-v2-primary"
            >
              <UserPlus size={15} />
              Novo funcionÃ¡rio
            </Link>
          </div>
        )}
      </header>

      {/* â”€â”€ KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiTile title="Ativos"      value={activeCount}      icon={Users}       accent="success" />
        <KpiTile title="Inativos"    value={inactiveCount}    icon={UserMinus}   accent="warning" />
        <KpiTile title="Desligados"  value={terminatedCount}  icon={XCircle}     accent="danger" />
      </section>

      {/* â”€â”€ Busca â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="card-v2 mt-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-fg-sub">
            Pesquisar por nome, CPF, matrÃ­cula, gestor ou departamento
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-sub" size={14} strokeWidth={2.5} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite para filtrar a equipe"
              className="input-v2 !pl-9"
            />
          </div>
        </label>
      </section>

      {(terminate.error || remove.error) && (
        <div className="mt-4 rounded-v2-md border border-danger/30 bg-danger/8 px-5 py-3 text-xs font-semibold text-danger">
          {terminate.error || remove.error}
        </div>
      )}

      {/* â”€â”€ ConteÃºdo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="mt-5">
        {loading ? (
          <LoadingState label="Carregando funcionÃ¡rios..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : employees.length === 0 ? (
          <EmptyState message={isGestor ? 'Nenhum funcionÃ¡rio na sua equipe.' : 'Nenhum funcionÃ¡rio cadastrado. Clique em Novo para comeÃ§ar.'} />
        ) : filteredEmployees.length === 0 ? (
          <EmptyState message="Nenhum funcionÃ¡rio encontrado para a pesquisa." />
        ) : (
          <div className="card-v2 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-border/60 bg-bg-sub/50">
                    {['FuncionÃ¡rio', 'MatrÃ­cula', 'Gestor', 'Departamento', 'Cargo', 'Status', 'Acesso', canEdit ? 'AÃ§Ãµes' : '']
                      .filter(Boolean)
                      .map((h) => (
                        <th key={h} className={cn(
                          'px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-fg-sub',
                          h === 'AÃ§Ãµes' && 'text-right',
                        )}>
                          {h}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    const managerName = employee.managerId ? managerById.get(employee.managerId) : '';
                    return (
                      <tr key={employee.id} className="border-b border-border/40 transition-colors last:border-0 hover:bg-bg-sub/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-v2-sm bg-brand-600 text-[11px] font-black text-white">
                              {employee.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <p className="text-sm font-bold text-fg">{normalizeDisplayName(employee.name)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-fg-mut">{employee.registration || 'â€”'}</td>
                        <td className="px-4 py-3 text-xs font-medium text-fg-mut">{managerName || 'â€”'}</td>
                        <td className="px-4 py-3">
                          {employee.department ? (
                            <span className="chip">{employee.department}</span>
                          ) : <span className="text-xs text-fg-sub">â€”</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-fg-mut">{employee.position || 'â€”'}</td>
                        <td className="px-4 py-3"><StatusBadge status={employee.status} /></td>
                        <td className="px-4 py-3"><AccessBadge employee={employee} /></td>
                        {(canEdit || isGestor) && (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {canDownloadSheet && canEdit && (
                                <>
                                  <IconBtn onClick={() => handleDownloadFicha(employee)} disabled={downloadingId === employee.id} icon={FileText} label="Ficha" />
                                  <IconBtn onClick={() => handleDownloadSheet(employee)} disabled={downloadingId === employee.id} icon={Download} label="Folha" />
                                  <IconBtn onClick={() => handleDownloadOcorrencias(employee)} disabled={downloadingId === employee.id} icon={AlertTriangle} label="Ocorr." />
                                </>
                              )}
                              {(canEdit || isGestor) && (
                                <IconBtn
                                  onClick={() => router.push(`/${tenant}/dashboard/time-track?employeeId=${employee.id}`)}
                                  icon={Clock3} label="Ponto" />
                              )}
                              <IconBtn onClick={() => setSelectedEmployeeId(employee.id)} icon={FolderOpen} label="DossiÃª" />
                              {canEdit && (
                                <>
                                  <Link
                                    href={`/${tenant}/dashboard/employees/new?id=${employee.id}`}
                                    className="inline-flex h-7 items-center gap-1 rounded-v2-sm border border-border bg-bg-elev px-2.5 text-[10px] font-bold text-fg-mut transition-colors hover:border-brand-300 hover:text-brand-600"
                                  >
                                    <Edit3 size={12} strokeWidth={2.5} /> Editar
                                  </Link>
                                  <button
                                    onClick={() => handleTerminate(employee)}
                                    disabled={employee.status === 'TERMINATED' || terminate.loading}
                                    className="inline-flex h-7 items-center gap-1 rounded-v2-sm border border-amber-300 bg-amber-500/10 px-2.5 text-[10px] font-bold text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                                  >
                                    <UserMinus size={12} strokeWidth={2.5} /> Desligar
                                  </button>
                                  <button
                                    onClick={() => handleSafeDelete(employee)}
                                    disabled={remove.loading}
                                    className="inline-flex h-7 items-center gap-1 rounded-v2-sm border border-danger/30 bg-danger/10 px-2.5 text-[10px] font-bold text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
                                  >
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
          </div>
        )}
      </section>

      {/* â”€â”€ Drawer dossiÃª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <EmployeeDossierDrawer
        employeeId={selectedEmployeeId}
        dossier={dossierQuery.data as EmployeeDossier | undefined}
        loading={dossierQuery.loading}
        error={dossierQuery.error}
        onClose={() => setSelectedEmployeeId(null)}
      />

      {/* â”€â”€ DiÃ¡logos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog((c) => ({ ...c, open: false }))}
        onConfirm={async () => {
          await confirmDialog.action();
          setConfirmDialog((c) => ({ ...c, open: false }));
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
      />

      <Modal
        isOpen={promptDialog.open}
        onClose={() => setPromptDialog((p) => ({ ...p, open: false }))}
        title={promptDialog.title}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-fg-mut">{promptDialog.description}</p>
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="input-v2"
            placeholder="Digite o nome..."
          />
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setPromptDialog((p) => ({ ...p, open: false }))} className="btn-v2-outline">
              Cancelar
            </button>
            <button
              onClick={async () => {
                await promptDialog.action();
                setPromptDialog((p) => ({ ...p, open: false }));
              }}
              disabled={promptInput !== promptDialog.expected}
              className="btn-v2 rounded-v2-md bg-danger px-4 text-white hover:opacity-90 disabled:opacity-50"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={alertDialog.open}
        onClose={() => setAlertDialog((a) => ({ ...a, open: false }))}
        title={alertDialog.title}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-fg-mut">{alertDialog.message}</p>
          <div className="flex justify-end pt-4">
            <button onClick={() => setAlertDialog((a) => ({ ...a, open: false }))} className="btn-v2-primary">
              Entendi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   COMPONENTES INTERNOS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function KpiTile({
  title, value, icon: Icon, accent = 'brand',
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  accent?: 'brand' | 'success' | 'warning' | 'danger';
}) {
  const accentMap = {
    brand:   'text-brand-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger:  'text-rose-600',
  } as const;

  return (
    <div className="card-v2 flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-fg-sub">{title}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-fg tabular-nums">{value}</p>
      </div>
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-v2-md bg-bg-sub', accentMap[accent])}>
        <Icon size={18} strokeWidth={2.4} />
      </div>
    </div>
  );
}

function IconBtn({
  onClick, disabled, icon: Icon, label,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 items-center gap-1 rounded-v2-sm border border-border bg-bg-elev px-2.5 text-[10px] font-bold text-fg-mut transition-colors hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
    >
      <Icon size={12} strokeWidth={2.5} /> {label}
    </button>
  );
}

function AccessBadge({ employee }: { employee: Employee }) {
  if (!employee.userId || !employee.user) {
    return <span className="text-[11px] font-semibold text-fg-sub">Sem acesso</span>;
  }
  if (!employee.user.isActive) {
    return <span className="chip chip-danger">Bloqueado</span>;
  }
  if (employee.user.forcePasswordChange) {
    return <span className="chip chip-warning">Trocar senha</span>;
  }
  return <span className="chip chip-success">Ativo</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    ACTIVE:     { cls: 'chip chip-success',  dot: 'bg-emerald-500', label: 'Ativo' },
    ONBOARDING: { cls: 'chip chip-warning',  dot: 'bg-amber-500',   label: 'Em admissÃ£o' },
    INACTIVE:   { cls: 'chip',               dot: 'bg-slate-400',   label: 'FÃ©rias' },
    SUSPENDED:  { cls: 'chip chip-warning',  dot: 'bg-amber-500',   label: 'Afastado' },
    TERMINATED: { cls: 'chip chip-danger',   dot: 'bg-rose-500',    label: 'Desligado' },
  };
  const entry = map[status] ?? map.INACTIVE;
  return (
    <span className={entry.cls}>
      <span className={cn('h-1.5 w-1.5 rounded-full', entry.dot)} />
      {EMPLOYEE_STATUS_LABEL[status] ?? entry.label}
    </span>
  );
}

/* â”€â”€ Drawer DossiÃª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function EmployeeDossierDrawer({
  employeeId, dossier, loading, error, onClose,
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
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-[720px] overflow-y-auto border-l border-border bg-bg-elev shadow-v2-xl">
        <div className="sticky top-0 z-10 border-b border-border/60 bg-bg-elev/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-brand-600">
                DossiÃª do colaborador
              </p>
              <h3 className="truncate text-xl font-black text-fg">
                {employee ? normalizeDisplayName(employee.name) : 'Carregando...'}
              </h3>
              <p className="mt-1 text-xs text-fg-mut">
                ASO, histÃ³rico recente, fÃ©rias e impacto de arquivamento em um Ãºnico painel.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-v2-md border border-border p-2 text-fg-mut transition hover:bg-bg-sub hover:text-fg"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          {loading && <LoadingState label="Carregando dossiÃª do funcionÃ¡rio..." />}
          {!loading && error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

          {!loading && !error && employee && (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DossierStat icon={<ShieldCheck size={16} />} label="Status"      value={EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status} />
                <DossierStat icon={<HeartPulse size={16} />}  label="ASOs"        value={String(asoRecords.length)} />
                <DossierStat icon={<CalendarDays size={16} />} label="FÃ©rias"     value={String(vacations.length)} />
                <DossierStat icon={<Clock3 size={16} />}      label="OcorrÃªncias" value={String(occurrences.length)} />
              </section>

              <section className="card-v2 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-black text-fg">Resumo 360</h4>
                  <span className="text-[11px] font-semibold text-fg-mut">
                    Acesso: {employee.user?.isActive ? 'Liberado' : 'Bloqueado'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoLine label="CPF"          value={maskCpf(employee.cpf)} />
                  <InfoLine label="E-mail"       value={maskEmail(employee.email)} />
                  <InfoLine label="Telefone"     value={maskPhone(employee.phone)} />
                  <InfoLine label="MatrÃ­cula"    value={employee.registration || 'â€”'} />
                  <InfoLine label="Cargo"        value={employee.position || 'â€”'} />
                  <InfoLine label="Departamento" value={employee.department || 'â€”'} />
                  <InfoLine label="AdmissÃ£o"     value={formatDate(employee.admissionDate)} />
                  <InfoLine label="Desligamento" value={formatDate(employee.terminationDate)} />
                </div>
              </section>

              <section className="card-v2 p-4">
                <h4 className="mb-3 text-sm font-black text-fg">SaÃºde ocupacional e ASO</h4>
                {asoRecords.length === 0 ? (
                  <p className="text-xs text-fg-sub">Nenhum ASO registrado para este colaborador.</p>
                ) : (
                  <div className="space-y-2">
                    {asoRecords.slice(0, 6).map((record) => {
                      const alert = getAsoAlert(record.status, record.dueDate);
                      return (
                        <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-v2-md border border-border/60 px-3 py-2">
                          <div>
                            <p className="text-sm font-bold text-fg">{record.asoType}</p>
                            <p className="text-xs text-fg-mut">
                              Exame: {fmtDate(record.examDate)} â€¢ Vencimento: {fmtDate(record.dueDate)} â€¢ ClÃ­nica: {record.clinicName || 'NÃ£o informada'}
                            </p>
                          </div>
                          <span className={cn('inline-flex rounded-v2-sm border px-2 py-1 text-[10px] font-black', alert.cls)}>
                            {alert.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="card-v2 p-4">
                  <h4 className="mb-3 text-sm font-black text-fg">FÃ©rias recentes</h4>
                  {vacations.length === 0 ? (
                    <p className="text-xs text-fg-sub">Nenhuma solicitaÃ§Ã£o de fÃ©rias encontrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {vacations.slice(0, 5).map((vacation: any) => (
                        <div key={vacation.id} className="rounded-v2-md border border-border/60 px-3 py-2">
                          <p className="text-sm font-bold text-fg">
                            {formatDate(vacation.startDate)} atÃ© {formatDate(vacation.endDate)}
                          </p>
                          <p className="text-xs text-fg-mut">
                            Status: {vacation.status} â€¢ Dias: {vacation.days ?? 'â€”'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card-v2 p-4">
                  <h4 className="mb-3 text-sm font-black text-fg">Batidas e ocorrÃªncias recentes</h4>
                  <div className="space-y-2">
                    {recentTimeTracks.slice(0, 5).map((row) => (
                      <div key={row.id} className="rounded-v2-md border border-border/60 px-3 py-2">
                        <p className="text-sm font-bold text-fg">{formatDate(row.date)}</p>
                        <p className="text-xs text-fg-mut">
                          Entrada {formatTime(row.entry)} â€¢ SaÃ­da {formatTime(row.exit)} â€¢ Saldo {formatMinutes(row.dailyBalance ?? 0)}
                        </p>
                      </div>
                    ))}
                    {recentTimeTracks.length === 0 && (
                      <p className="text-xs text-fg-sub">Sem batidas recentes para exibir.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-v2-lg border border-amber-300/60 bg-amber-500/8 p-4">
                <h4 className="mb-2 text-sm font-black text-amber-900 dark:text-amber-200">
                  PolÃ­tica de exclusÃ£o segura
                </h4>
                <p className="text-xs text-amber-900/90 dark:text-amber-100/80">
                  Quando existe histÃ³rico vinculado, a remoÃ§Ã£o definitiva Ã© bloqueada e o cadastro Ã© arquivado para preservar rastreabilidade legal e operacional.
                </p>
                {impact && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <InfoChip label="Ponto"       value={String(impact.timeTracks)} />
                    <InfoChip label="FÃ©rias"      value={String(impact.vacations)} />
                    <InfoChip label="ASO"         value={String(impact.asoRecords)} />
                    <InfoChip label="OcorrÃªncias" value={String(impact.timeOccurrences)} />
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
    <div className="card-v2 p-4">
      <div className="mb-2 flex items-center justify-between text-fg-sub">
        <span className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-black text-fg">{value}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-v2-md border border-border/60 bg-bg-sub/40 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fg-sub">{label}</p>
      <p className="mt-1 text-sm font-semibold text-fg">{value || 'â€”'}</p>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-v2-md border border-amber-300/60 bg-white/60 px-3 py-2 dark:bg-white/5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-amber-950 dark:text-amber-100">{value}</p>
    </div>
  );
}

/* â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function fmtDate(v?: string | null) {
  if (!v) return 'â€”';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 'â€”' : d.toLocaleDateString('pt-BR');
}

function maskCpf(value?: string | null) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return 'â€”';
  if (digits.length < 11) return value ?? 'â€”';
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
}

function maskEmail(value?: string | null) {
  if (!value) return 'â€”';
  const [name, domain] = value.split('@');
  if (!domain) return value;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

function maskPhone(value?: string | null) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return 'â€”';
  if (digits.length < 4) return value ?? 'â€”';
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
  if (!token) throw new Error('SessÃ£o expirada. FaÃ§a login novamente.');

  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const response = await fetch(`${API_URL}/employees/${employee.id}/documents/${document}.pdf${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : 'NÃ£o foi possÃ­vel gerar o documento oficial.';
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

function getAsoAlert(_status: string, expirationDate?: string | null): { label: string; cls: string } {
  if (!expirationDate) {
    return { label: 'Sem data definida', cls: 'border-border bg-bg-sub text-fg-mut' };
  }
  const today = new Date();
  const exp = new Date(expirationDate);
  if (exp < today) {
    return { label: 'Vencido', cls: 'border-danger/30 bg-danger/10 text-danger' };
  }
  const diff = (exp.getTime() - today.getTime()) / 86400000;
  if (diff <= 30) {
    return { label: 'PrÃ³ximo do vencimento', cls: 'border-amber-300 bg-amber-500/10 text-amber-700' };
  }
  return { label: 'VÃ¡lido', cls: 'border-emerald-300 bg-emerald-500/10 text-emerald-700' };
}