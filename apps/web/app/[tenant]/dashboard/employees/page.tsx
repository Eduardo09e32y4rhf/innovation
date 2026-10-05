'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CalendarDays, Clock3, Download, FileText, FolderOpen, HeartPulse, Key, Lock, Unlock, RotateCcw, Search, ShieldCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, ConfirmDialog, Drawer, Modal, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { API_URL, api, type Employee, type EmployeeDossier } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { EMPLOYEE_STATUS_LABEL, VACATION_STATUS_LABEL, formatDate, formatMinutes, formatTime } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { summarizeAccessResults, type AccessResult } from './access-result';
import { matchesEmployee } from './employee-filters';
import { EmployeeAccessModal } from './_components/employee-access-modal';
import { RowActionsMenu } from './_components/row-actions-menu';
import { toast } from 'sonner';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const monthNow = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };

export default function EmployeesPage() {
  const tenant = String(useParams()?.tenant ?? '');
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canEdit = ['DEV', 'ADMIN', 'RH'].includes(profile ?? '');
  const canDownloadSheet = profile === 'RH';
  const isGestor = profile === 'GESTOR';
  const base = `/${tenant}/dashboard`;
  const employeesQuery = useQuery(() => api.employees.list(), []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [manager, setManager] = useState('');
  const [unit, setUnit] = useState('');
  const [month, setMonth] = useState(monthNow);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [terminating, setTerminating] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [confirmationName, setConfirmationName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');
  const [accessModalEmployee, setAccessModalEmployee] = useState<string | null>(null);
  const [issuedPassword, setIssuedPassword] = useState<{ name: string; value: string } | null>(null);
  const onAccessResult = (successMessage: string, employeeName?: string) => (results: AccessResult[]) => {
    const outcome = summarizeAccessResults(results, successMessage);
    employeesQuery.refetch();
    if (!outcome.ok) { toast.error(outcome.message); return; }
    toast.success(outcome.message);
    if (outcome.temporaryPassword) setIssuedPassword({ name: employeeName ?? 'colaborador', value: outcome.temporaryPassword });
  };
  const nameOf = (id: string) => normalizeDisplayName(employeesQuery.data?.find(e => e.id === id)?.name ?? '');
  const blockUser = useMutation((id: string) => api.employees.bulkAccess({ employeeIds: [id], action: 'block' }), { onSuccess: onAccessResult('Acesso bloqueado'), onError: (message) => toast.error(message) });
  const unblockUser = useMutation((id: string) => api.employees.bulkAccess({ employeeIds: [id], action: 'unblock' }), { onSuccess: onAccessResult('Acesso desbloqueado'), onError: (message) => toast.error(message) });
  const resetPassword = useMutation((id: string) => api.employees.bulkAccess({ employeeIds: [id], action: 'reset-password' }), { onSuccess: (results, id) => onAccessResult('Senha provisoria emitida', nameOf(id))(results), onError: (message) => toast.error(message) });
  const terminate = useMutation((id: string) => api.employees.terminate(id), { onSuccess: () => employeesQuery.refetch() });
  const remove = useMutation((id: string) => api.employees.delete(id), { onSuccess: () => employeesQuery.refetch() });
  const dossierQuery = useQuery(() => api.employees.dossier(selectedEmployeeId ?? ''), [selectedEmployeeId], { enabled: !!selectedEmployeeId });
  const deletionQuery = useQuery(() => api.employees.dossier(deleting?.id ?? ''), [deleting?.id], { enabled: !!deleting });

  useEffect(() => {
    setSelectedEmployeeId(null); setTerminating(null); setDeleting(null);
    setSearch(''); setStatus(''); setDepartment(''); setManager(''); setUnit('');
    setFeedback(''); setActionError(''); setIssuedPassword(null);
  }, [user?.companyId, user?.id]);

  const employees = employeesQuery.data ?? [];
  const managerById = new Map(employees.map(e => [e.id, normalizeDisplayName(e.name)]));
  const filtered = employees.filter(e =>
    matchesEmployee(e, search, managerById.get(e.managerId ?? '') ?? '')
    && (!status || e.status === status) && (!department || e.department === department)
    && (!manager || (manager === 'none' ? !e.managerId : e.managerId === manager))
    && (!unit || e.unit === unit),
  ).sort((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name)));
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort(collator.compare);
  const units = [...new Set(employees.map(e => e.unit).filter(Boolean))].sort(collator.compare);
  const managers = [...new Set(employees.map(e => e.managerId).filter(Boolean))];
  const hasFilters = !!(search || status || department || manager || unit);
  const clearFilters = () => { setSearch(''); setStatus(''); setDepartment(''); setManager(''); setUnit(''); };

  async function download(employee: Employee, document: 'record' | 'point-sheet' | 'occurrences') {
    if (downloadingId) return;
    setDownloadingId(employee.id); setActionError('');
    try { await downloadEmployeePdf(employee, document, document === 'record' ? undefined : month); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Não foi possível baixar o documento.'); }
    finally { setDownloadingId(null); }
  }

  function employeeActions(employee: Employee) {
    const hasAccess = !!employee.userId && !!employee.user;
    const isAccessActive = hasAccess && employee.user?.isActive;

    return <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={() => setSelectedEmployeeId(employee.id)} aria-label={`Abrir dossiê de ${normalizeDisplayName(employee.name)}`}><FolderOpen size={18} aria-hidden="true" /> Dossiê</Button>
      <RowActionsMenu label={`Ações de ${normalizeDisplayName(employee.name)}`}>
          {canEdit && <>
            <Button type="button" variant="ghost" className="justify-start" onClick={() => setAccessModalEmployee(employee.id)}><Key size={18} aria-hidden="true" /> Criar acesso</Button>
            {hasAccess && <>
              <Button type="button" variant="ghost" className="justify-start" disabled={isAccessActive ? blockUser.loading : unblockUser.loading} onClick={() => (isAccessActive ? blockUser.mutate(employee.id) : unblockUser.mutate(employee.id))}>
                {isAccessActive ? <><Lock size={18} aria-hidden="true" /> Bloquear acesso</> : <><Unlock size={18} aria-hidden="true" /> Desbloquear acesso</>}
              </Button>
              <Button type="button" variant="ghost" className="justify-start" disabled={resetPassword.loading} onClick={() => resetPassword.mutate(employee.id)}><RotateCcw size={18} aria-hidden="true" /> Redefinir senha</Button>
            </>}
          </>}
          {canDownloadSheet && canEdit && <>
            <Button type="button" variant="ghost" className="justify-start" disabled={!!downloadingId} onClick={() => download(employee, 'record')}><FileText size={18} aria-hidden="true" /> Ficha cadastral (PDF)</Button>
            <Button type="button" variant="ghost" className="justify-start" disabled={!!downloadingId} onClick={() => download(employee, 'point-sheet')}><Download size={18} aria-hidden="true" /> Folha de ponto (PDF)</Button>
            <Button type="button" variant="ghost" className="justify-start" disabled={!!downloadingId} onClick={() => download(employee, 'occurrences')}><AlertTriangle size={18} aria-hidden="true" /> Ocorrências (PDF)</Button>
          </>}
          {(canEdit || isGestor) && <Link className="btn btn-ghost btn-md justify-start" href={base + '/escalas?view=ponto&employeeId=' + encodeURIComponent(employee.id) + '&month=' + month}><Clock3 size={18} aria-hidden="true" /> Abrir ponto</Link>}
          {canEdit && <>
            <Link className="btn btn-ghost btn-md justify-start" href={base + '/employees/new?id=' + encodeURIComponent(employee.id)}>Editar cadastro</Link>
            <Button type="button" variant="ghost" className="justify-start" disabled={employee.status === 'TERMINATED' || terminate.loading} onClick={() => { terminate.reset(); setTerminating(employee); }}>Desligar funcionário</Button>
            <Button type="button" variant="ghost" className="justify-start text-rose-700" disabled={remove.loading} onClick={() => { remove.reset(); setConfirmationName(''); setDeleting(employee); }}>Excluir ou arquivar</Button>
          </>}
      </RowActionsMenu>
    </div>;
  }

  return <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
    <PageHeader title="Funcionários" subtitle="Gerencie os dados e acessos da equipe" actions={canEdit && <>
      <Link href={base + '/employees/import'} className="btn btn-outline btn-md"><Download size={18} aria-hidden="true" /> Importar XLSX</Link>
      <Link href={base + '/employees/new'} className="btn btn-primary btn-md"><UserPlus size={18} aria-hidden="true" /> Novo funcionário</Link>
    </>} />
    {canEdit && <Link href={`/${tenant}/dashboard/users`} className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm hover:bg-purple-100 transition-colors">
      <ShieldCheck size={20} className="text-purple-600" />
      <div className="flex-1"><p className="font-medium text-purple-900">Gerenciar usuários e acessos</p><p className="text-xs text-purple-700">Para criar usuários sem vínculo com funcionário ou atualizar perfis e permissões.</p></div>
      <span className="text-purple-600 font-medium">→</span>
    </Link>}
    <section aria-label="Situação dos funcionários no escopo autorizado" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        ['Ativos', employees.filter(e => e.status === 'ACTIVE').length, Users],
        ['Em admissão', employees.filter(e => e.status === 'ONBOARDING').length, UserPlus],
        ['Férias / afastados', employees.filter(e => e.status === 'INACTIVE' || e.status === 'SUSPENDED').length, CalendarDays],
        ['Desligados', employees.filter(e => e.status === 'TERMINATED').length, UserMinus],
      ].map(([label, value, Icon]: [string, number, typeof Users]) => <article className="card-v2 p-4" key={label}><div className="flex items-center justify-between gap-2 text-fg-sub"><p className="text-sm">{label}</p><Icon size={18} aria-hidden="true" /></div><p className="mt-2 text-2xl font-semibold tabular-nums text-fg">{employeesQuery.data ? value : '—'}</p></article>)}
    </section>
    <section aria-label="Filtros de funcionários" className="card-v2 space-y-4 p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="space-y-1 text-sm font-medium text-fg">Buscar funcionário
          <div className="relative mt-1"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-fg-sub" /><input className="input-v2 !pl-10 text-base sm:text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome, CPF, matrícula, gestor ou departamento" /></div>
        </label>
        <label className="space-y-1 text-sm font-medium text-fg">Competência dos documentos<input type="month" required className="input-v2 mt-1 text-base sm:text-sm" value={month} onChange={e => e.target.value && setMonth(e.target.value)} /></label>
      </div>
      <details open={hasFilters || undefined}>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-fg">Filtros da equipe{hasFilters ? ' · ativos' : ''}</summary>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filter label="Status" value={status} onChange={setStatus} options={Object.entries(EMPLOYEE_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
          <Filter label="Departamento" value={department} onChange={setDepartment} options={departments.map(value => ({ value, label: value }))} />
          <Filter label="Gestor" value={manager} onChange={setManager} options={[{ value: 'none', label: 'Sem gestor' }, ...managers.map(value => ({ value, label: managerById.get(value) ?? 'Gestor vinculado' }))]} />
          <Filter label="Unidade" value={unit} onChange={setUnit} options={units.map(value => ({ value, label: value }))} />
        </div>
      </details>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm text-fg-sub">{employeesQuery.data ? `${filtered.length} de ${employees.length} funcionários no escopo autorizado` : 'Carregando equipe…'}</p>
        {hasFilters && <Button type="button" variant="ghost" onClick={clearFilters}>Limpar filtros</Button>}
      </div>
    </section>
    {feedback && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{feedback}</p>}
    {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{actionError}</p>}
    {employeesQuery.error && <ErrorState message={employeesQuery.error} onRetry={employeesQuery.refetch} />}
    {employeesQuery.loading && !employeesQuery.data ? <LoadingState label="Carregando funcionários…" /> : !employeesQuery.data ? null : employees.length === 0 ? <EmptyState message={isGestor ? 'Nenhum funcionário na sua equipe.' : 'Nenhum funcionário cadastrado.'} /> : filtered.length === 0 ? <EmptyState message="Nenhum funcionário corresponde aos filtros. Use Limpar filtros para rever a equipe." /> : <>
      <div className="space-y-3 md:hidden">
        {filtered.map(employee => <article className="card-v2 space-y-4 p-4" key={employee.id}>
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words font-semibold text-fg">{normalizeDisplayName(employee.name)}</h2><p className="mt-1 text-sm text-fg-sub">{employee.position || 'Cargo não informado'} · {employee.department || 'Sem departamento'}</p></div><StatusBadge status={employee.status} /></div>
          <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-fg-sub">Matrícula</dt><dd>{employee.registration || '—'}</dd></div><div><dt className="text-fg-sub">Gestor</dt><dd>{managerById.get(employee.managerId ?? '') || '—'}</dd></div><div className="col-span-2"><dt className="text-fg-sub">Acesso ao painel</dt><dd><AccessBadge employee={employee} /></dd></div></dl>
          {employeeActions(employee)}
        </article>)}
      </div>
      <div className="card-v2 hidden md:block">
        <div role="region" aria-label="Tabela de funcionários" tabIndex={0} className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">Funcionários, vínculo de acesso e ações disponíveis</caption>
            <thead className="border-b border-border bg-bg-sub text-fg-sub"><tr>{['Funcionário', 'Matrícula', 'Gestor', 'Departamento', 'Cargo', 'Status', 'Acesso', 'Ações'].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody>{filtered.map(employee => <tr key={employee.id} className="border-b border-border last:border-0">
              <th scope="row" className="px-4 py-4 font-semibold">{normalizeDisplayName(employee.name)}</th>
              <td className="px-4 py-4">{employee.registration || '—'}</td><td className="px-4 py-4">{managerById.get(employee.managerId ?? '') || '—'}</td><td className="px-4 py-4">{employee.department || '—'}</td><td className="px-4 py-4">{employee.position || '—'}</td><td className="px-4 py-4"><StatusBadge status={employee.status} /></td><td className="px-4 py-4"><AccessBadge employee={employee} /></td><td className="px-4 py-4">{employeeActions(employee)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-sm text-fg-sub">Documentos e ponto usam a competência {month.split('-').reverse().join('/')}.</p>
      </div>
    </>}
    <EmployeeDossierDrawer employeeId={selectedEmployeeId} dossier={dossierQuery.data} loading={dossierQuery.loading} error={dossierQuery.error} onRetry={dossierQuery.refetch} onClose={() => setSelectedEmployeeId(null)} />
    {terminate.error && terminating && <p role="alert" className="text-sm text-rose-700">{terminate.error}</p>}
    <ConfirmDialog isOpen={!!terminating} onClose={() => setTerminating(null)} title="Desligar funcionário" description={`Desligar ${normalizeDisplayName(terminating?.name ?? '')}? O servidor marca o cadastro como desligado e cria um ASO demissional pendente. A data de desligamento pode ser registrada em Editar cadastro.`} confirmText="Desligar funcionário" isLoading={terminate.loading} onConfirm={async () => {
      if (!terminating || terminate.loading) return;
      try { await terminate.mutate(terminating.id); setFeedback('Funcionário desligado.'); setTerminating(null); } catch { /* mantém confirmação e erro */ }
    }} />
    <Modal isOpen={!!issuedPassword} onClose={() => setIssuedPassword(null)} title="Senha provisória emitida" maxWidth="max-w-md">
      <div className="space-y-3">
        <p className="text-sm text-fg-sub">Senha provisória de <strong>{issuedPassword?.name}</strong>. Ela vale por 24 horas, será trocada no primeiro acesso e só é exibida agora. Anote-a e entregue por um canal seguro.</p>
        <p className="select-all break-all rounded-lg border border-border bg-bg-sub p-3 font-mono text-sm" data-testid="issued-password">{issuedPassword?.value}</p>
        <div className="flex justify-end"><Button type="button" onClick={() => setIssuedPassword(null)}>Entendi</Button></div>
      </div>
    </Modal>
    <Modal isOpen={!!deleting} onClose={() => !remove.loading && setDeleting(null)} title="Excluir ou arquivar funcionário" maxWidth="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm text-fg-sub">A operação consulta o histórico novamente no servidor. Com vínculos, arquiva e bloqueia o acesso; sem vínculos, exclui definitivamente.</p>
        {deletionQuery.loading && <LoadingState label="Consultando impacto…" />}
        {deletionQuery.error && <ErrorState message={deletionQuery.error} onRetry={deletionQuery.refetch} />}
        {deletionQuery.data && <DeletionImpact dossier={deletionQuery.data} />}
        <label className="block space-y-1 text-sm font-medium">Digite {normalizeDisplayName(deleting?.name ?? '')} para confirmar<input className="input-v2 text-base" value={confirmationName} onChange={e => setConfirmationName(e.target.value)} autoComplete="off" /></label>
        {remove.error && <p role="alert" className="text-sm text-rose-700">{remove.error}</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={remove.loading} onClick={() => setDeleting(null)}>Cancelar</Button><Button type="button" variant="danger" isLoading={remove.loading} disabled={!deletionQuery.data || !!deletionQuery.error || deletionQuery.loading || confirmationName !== normalizeDisplayName(deleting?.name ?? '')} onClick={async () => {
          if (!deleting || remove.loading) return;
          try { const result = await remove.mutate(deleting.id); setFeedback(result.archived ? 'Funcionário arquivado. Histórico preservado e acesso bloqueado.' : 'Funcionário excluído definitivamente.'); setDeleting(null); } catch { /* mantém os dados */ }
        }}>Confirmar {deletionQuery.data?.deletionImpact.total ? 'arquivamento' : 'exclusão'}</Button></div>
      </div>
    </Modal>
    {accessModalEmployee && <EmployeeAccessModal employeeId={accessModalEmployee} onClose={() => setAccessModalEmployee(null)} onSuccess={() => { setAccessModalEmployee(null); employeesQuery.refetch(); }} />}
  </div>;
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-sm font-medium">{label}<select className="input-v2 mt-1 text-base sm:text-sm" value={value} onChange={e => onChange(e.target.value)}><option value="">Todos</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : status === 'TERMINATED' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900'}`}>{EMPLOYEE_STATUS_LABEL[status] ?? status}</span>;
}
function AccessBadge({ employee }: { employee: Employee }) {
  if (!employee.userId || !employee.user) return <span className="text-sm text-fg-sub">Sem acesso</span>;
  if (!employee.user.isActive) return <span className="text-sm text-rose-700">Bloqueado</span>;
  if (employee.user.forcePasswordChange) return <span className="text-sm text-amber-800">Trocar senha</span>;
  return <span className="text-sm text-emerald-700">Ativo</span>;
}

function EmployeeDossierDrawer({ employeeId, dossier, loading, error, onClose, onRetry }: { employeeId: string | null; dossier?: EmployeeDossier; loading: boolean; error?: string | null; onClose: () => void; onRetry: () => void }) {
  const employee = dossier?.employee;
  return <Drawer isOpen={!!employeeId} onClose={onClose} title={employee ? normalizeDisplayName(employee.name) : 'Dossiê do funcionário'} description="Cadastro, saúde ocupacional, férias e registros recentes." maxWidth="max-w-2xl">
    {loading && <LoadingState label="Carregando dossiê…" />}
    {error && <ErrorState message={error} onRetry={onRetry} />}
    {employee && !loading && !error && <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3" aria-label="Resumo do dossiê">
        {[[ShieldCheck, 'Status', EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status], [HeartPulse, 'ASOs', String(dossier.asoRecords.length)], [CalendarDays, 'Férias', String(dossier.vacations.length)], [Clock3, 'Ocorrências', String(dossier.occurrences.length)]].map(([Icon, label, value]: [typeof Users, string, string]) => <div key={label} className="card-v2 p-3"><p className="flex items-center gap-2 text-sm text-fg-sub"><Icon size={18} aria-hidden="true" />{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}
      </section>
      <section className="card-v2 p-4"><h3 className="mb-3 font-semibold">Cadastro e acesso</h3><dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Info label="CPF" value={maskCpf(employee.cpf)} /><Info label="E-mail" value={maskEmail(employee.email)} /><Info label="Telefone" value={maskPhone(employee.phone)} /><Info label="Matrícula" value={employee.registration} /><Info label="Cargo" value={employee.position} /><Info label="Departamento" value={employee.department} /><Info label="Admissão" value={formatDate(employee.admissionDate)} /><Info label="Desligamento" value={formatDate(employee.terminationDate)} />
      </dl><p className="mt-4 text-sm">Acesso: <AccessBadge employee={employee} /></p></section>
      <section className="card-v2 space-y-3 p-4"><h3 className="font-semibold">Saúde ocupacional e ASO</h3>{dossier.asoRecords.length === 0 ? <p className="text-sm text-fg-sub">Nenhum ASO registrado.</p> : dossier.asoRecords.map(record => <div key={record.id} className="rounded-lg border border-border p-3"><p className="font-medium">{record.asoType} · {record.result ?? record.status}</p><p className="mt-1 text-sm text-fg-sub">Exame: {formatDate(record.examDate)} · Vencimento: {formatDate(record.dueDate)}</p><p className="text-sm text-fg-sub">Clínica: {record.clinicName || 'Não informada'}</p></div>)}</section>
      <section className="card-v2 space-y-3 p-4"><h3 className="font-semibold">Férias recentes</h3>{dossier.vacations.length === 0 ? <p className="text-sm text-fg-sub">Nenhuma solicitação encontrada.</p> : dossier.vacations.map(v => <div key={v.id} className="rounded-lg border border-border p-3"><p className="text-sm font-medium">{formatDate(v.startDate)} até {formatDate(v.endDate)}</p><p className="text-sm text-fg-sub">{VACATION_STATUS_LABEL[v.status] ?? v.status} · {v.daysUsed} dias · {v.acquisitionPeriod}</p></div>)}</section>
      <section className="card-v2 space-y-3 p-4"><h3 className="font-semibold">Batidas e ocorrências recentes</h3>{dossier.recentTimeTracks.map(track => <div key={track.id} className="rounded-lg border border-border p-3"><p className="text-sm font-medium">{formatDate(track.date)}</p><p className="text-sm text-fg-sub">Entrada {formatTime(track.entry)} · Saída {formatTime(track.exit)} · Saldo {formatMinutes(track.dailyBalance ?? 0)}</p></div>)}{dossier.recentTimeTracks.length === 0 && <p className="text-sm text-fg-sub">Sem batidas recentes.</p>}{dossier.occurrences.map((row: any) => <div key={row.id} className="rounded-lg border border-border p-3"><p className="text-sm font-medium">{formatDate(row.date)} · {row.type ?? row.status}</p>{(row.reason || row.observation) && <p className="text-sm text-fg-sub">{row.reason || row.observation}</p>}</div>)}</section>
      <DeletionImpact dossier={dossier} />
    </div>}
  </Drawer>;
}
function Info({ label, value }: { label: string; value?: string | null }) { return <div><dt className="text-sm text-fg-sub">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || '—'}</dd></div>; }
function DeletionImpact({ dossier }: { dossier: EmployeeDossier }) {
  const impact = dossier.deletionImpact;
  return <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"><h3 className="font-semibold">Histórico relacionado: {impact.total} registros</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm">{[[ 'Ponto', impact.timeTracks], ['Férias', impact.vacations], ['ASO', impact.asoRecords], ['Ocorrências', impact.timeOccurrences], ['Fechamentos', impact.timeClosings], ['Escalas', impact.userSchedules], ['Exceções de escala', impact.scheduleExceptions], ['Chamados afetados', impact.supportTicketsAffected]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl></section>;
}
function maskCpf(value?: string | null) { const digits = (value ?? '').replace(/\D/g, ''); return digits.length === 11 ? `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}` : '—'; }
function maskEmail(value?: string | null) { if (!value) return '—'; const [name, domain] = value.split('@'); return domain ? `${name.slice(0, 2)}***@${domain}` : '—'; }
function maskPhone(value?: string | null) { const digits = (value ?? '').replace(/\D/g, ''); return digits.length >= 4 ? `(**) *****-${digits.slice(-4)}` : '—'; }

async function downloadEmployeePdf(employee: Employee, document: 'point-sheet' | 'occurrences' | 'record', month?: string) {
  const token = readAuthSession().token;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  const query = month ? '?month=' + encodeURIComponent(month) : '';
  const response = await fetch(API_URL + '/employees/' + encodeURIComponent(employee.id) + '/documents/' + document + '.pdf' + query, { headers: { Authorization: 'Bearer ' + token } });
  if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.message || 'Não foi possível gerar o documento oficial.'); }
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    const encodedFilename = (response.headers.get('content-disposition') ?? '').match(/filename="([^"]+)"/)?.[1];
    const anchor = window.document.createElement('a'); anchor.href = objectUrl;
    anchor.download = encodedFilename ? decodeURIComponent(encodedFilename) : document + '-' + normalizeDisplayName(employee.name) + '.pdf';
    anchor.click();
  } finally { URL.revokeObjectURL(objectUrl); }
}
