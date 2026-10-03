'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { API_URL, api, type AppUser, type CreateUserInput } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { UserSummaryCards } from './_components/user-summary-cards';
import { UserFilters, type UserFilterState } from './_components/user-filters';
import { UsersTable } from './_components/users-table';
import { UserDrawer, type UserDrawerTab } from './_components/user-drawer';
import { UserCreateModal } from './_components/user-create-modal';
import { UserPasswordResetModal } from './_components/user-password-reset-modal';
import { AccessConfirmDialog } from './_components/access-confirm-dialog';
import { USER_ROLES, availableUserRoles, userAccessPolicy } from './_components/access-policy';

const emptyFilters: UserFilterState = { search: '', role: '', status: '', link: '', company: '' };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function UsersPage() {
  const { user: currentUser, company, loading: authLoading, refreshUser } = useAuth();
  const currentRole = (currentUser?.role || currentUser?.profile || '').toUpperCase();
  const canRead = ['DEV', 'CEO', 'ADMIN', 'RH'].includes(currentRole);
  const availableRoles = availableUserRoles(currentRole);
  const users = useQuery(() => api.users.list(), [currentRole, company?.id], { enabled: canRead });
  const usage = useQuery(() => api.users.usage(), [company?.id], { enabled: canRead });
  const companies = useQuery(() => api.platform.listCompanies({ limit: 1000 }).then(result => result.data), [], { enabled: currentRole === 'DEV' });
  const [filters, setFilters] = useState<UserFilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<UserDrawerTab>('geral');
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [returnToDrawer, setReturnToDrawer] = useState(false);
  const [confirmation, setConfirmation] = useState<{ type: 'block' | 'delete'; user: AppUser } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const confirmBusy = useRef(false);
  const [confirmError, setConfirmError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const downloadBusy = useRef(false);
  useEffect(() => {
    setFilters(emptyFilters); setPage(1); setSelected(null); setCreateOpen(false);
    setDrawerOpen(false); setResetOpen(false); setConfirmation(null); setReturnToDrawer(false);
  }, [currentUser?.id, company?.id, currentRole]);
  const rows = users.data ?? [];
  const companyOptions = companies.data ?? [];
  const filtered = rows.filter(user => {
    if (filters.search && !normalize(`${user.name} ${user.email}`).includes(normalize(filters.search.trim()))) return false;
    if (filters.role && user.role !== filters.role) return false;
    if (filters.company && user.companyId !== filters.company) return false;
    if (filters.status === 'ativos' && user.isActive === false) return false;
    if (filters.status === 'bloqueados' && user.isActive !== false) return false;
    if (filters.status === 'pendente' && !user.forcePasswordChange) return false;
    if (filters.link === 'com' && !user.employee?.id) return false;
    if (filters.link === 'sem' && user.employee?.id) return false;
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const scope = currentRole === 'DEV' ? 'Lista global de usuários autorizados. Licenças referem-se à empresa atual.' : 'Usuários da empresa atual.';
  function openUser(user: AppUser, tab: UserDrawerTab = 'geral') {
    if (!userAccessPolicy(currentRole, currentUser?.id, user).read) return;
    setSelected(user); setDrawerTab(tab); setDrawerOpen(true);
  }
  function openReset(user: AppUser, fromDrawer = false) {
    if (!userAccessPolicy(currentRole, currentUser?.id, user).reset) return;
    setSelected(user); setReturnToDrawer(fromDrawer); setDrawerOpen(false); setResetOpen(true);
  }
  function closeReset() {
    setResetOpen(false);
    if (returnToDrawer) { setDrawerTab('seguranca'); setDrawerOpen(true); }
    else setSelected(null);
    setReturnToDrawer(false);
  }
  function confirm(type: 'block' | 'delete', user: AppUser, fromDrawer = false) {
    const policy = userAccessPolicy(currentRole, currentUser?.id, user);
    if (!policy[type]) return;
    setReturnToDrawer(fromDrawer); setDrawerOpen(false); setConfirmation({ type, user }); setConfirmError('');
  }
  function closeConfirmation() {
    if (confirmBusy.current) return;
    setConfirmation(null); setConfirmError('');
    if (returnToDrawer) { setDrawerTab('seguranca'); setDrawerOpen(true); }
    setReturnToDrawer(false);
  }
  async function execute() {
    if (!confirmation || confirmBusy.current) return;
    const { user, type } = confirmation;
    if (!userAccessPolicy(currentRole, currentUser?.id, user)[type]) return;
    confirmBusy.current = true; setConfirmLoading(true); setConfirmError('');
    try {
      if (type === 'delete') {
        await api.users.delete(user.id);
        toast.success('Acesso desativado. Os registros foram preservados.');
        if (selected?.id === user.id) { setSelected(null); setReturnToDrawer(false); }
      } else {
        const updated = await api.users.update(user.id, { isActive: user.isActive === false });
        if (selected?.id === user.id) setSelected({ ...user, ...updated });
        toast.success(user.isActive === false ? 'Acesso desbloqueado.' : 'Acesso bloqueado.');
        if (returnToDrawer) { setDrawerTab('seguranca'); setDrawerOpen(true); }
      }
      users.refetch(); usage.refetch(); setConfirmation(null); setReturnToDrawer(false);
    } catch (err) { setConfirmError(err instanceof Error ? err.message : 'Não foi possível atualizar o acesso.'); }
    finally { confirmBusy.current = false; setConfirmLoading(false); }
  }
  async function downloadTerm(user: AppUser) {
    if (downloadBusy.current || !userAccessPolicy(currentRole, currentUser?.id, user).download) return;
    downloadBusy.current = true; setDownloading(true);
    try {
      const response = await fetch(`${API_URL}/legal/terms/download/${encodeURIComponent(user.id)}`, {
        headers: { Authorization: `Bearer ${readAuthSession().token || ''}` }, cache: 'no-store',
      });
      if (!response.ok) throw new Error(response.status === 404 ? 'Termo não disponível para esta conta ou ainda não aceito.' : 'Não foi possível baixar o termo.');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `Termo_De_Uso_${user.id}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Não foi possível baixar o termo.'); }
    finally { downloadBusy.current = false; setDownloading(false); }
  }
  async function create(data: CreateUserInput) {
    if (!canRead) throw new Error('Seu perfil não pode criar usuários.');
    await api.users.create(data); users.refetch(); usage.refetch();
  }
  async function saveGeneral(data: Partial<AppUser>) {
    if (!selected || !userAccessPolicy(currentRole, currentUser?.id, selected).edit) throw new Error('Edição não autorizada.');
    const updated = await api.users.update(selected.id, data);
    setSelected({ ...selected, ...updated }); users.refetch();
    if (selected.id === currentUser?.id) await refreshUser();
  }
  async function savePermissions(customPermissions: string[] | null) {
    if (!selected || !userAccessPolicy(currentRole, currentUser?.id, selected).permissions) throw new Error('Edição de permissões não autorizada.');
    const updated = await api.users.update(selected.id, { customPermissions });
    setSelected({ ...selected, ...updated }); users.refetch();
  }
  const description = confirmation?.type === 'delete'
    ? `O acesso de ${confirmation.user.name} será desativado e a troca de senha ficará pendente. Os registros e o vínculo com funcionário serão preservados.`
    : confirmation?.user.isActive === false ? 'O usuário voltará a poder acessar o sistema, sujeito à política de senha.'
      : 'O acesso às rotas autenticadas será bloqueado até a conta ser desbloqueada.';
  return <div className="app-page"><div className="app-page-content space-y-5">
    <PageHeader title="Usuários" subtitle="Gerencie acessos, perfis e permissões."
      actions={canRead ? <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => { users.refetch(); usage.refetch(); if (currentRole === 'DEV') companies.refetch(); }} disabled={users.loading}>
          <RefreshCw size={18} aria-hidden="true" />Atualizar
        </Button>
        <Button type="button" onClick={() => setCreateOpen(true)} disabled={currentRole === 'DEV' && (!companyOptions.length || companies.loading)}>
          <UserPlus size={18} aria-hidden="true" />Novo usuário
        </Button>
      </div> : undefined} />
    {authLoading ? <LoadingState label="Carregando perfil..." /> : !canRead ? <p role="alert" className="card-v2 p-5 text-sm text-fg-mut">Seu perfil não pode consultar ou administrar usuários.</p> : <>
      <p className="text-sm text-fg-mut">{scope}</p>
      {companies.error && currentRole === 'DEV' && <ErrorState message={`Não foi possível carregar as empresas: ${companies.error}`} onRetry={companies.refetch} />}
      {users.loading && !users.data ? <LoadingState label="Carregando usuários..." /> : users.error ? <ErrorState message={users.error} onRetry={users.refetch} /> : <>
        <UserSummaryCards rows={rows} usage={usage.data ?? null} />
        {usage.error && <p role="status" className="text-sm text-amber-800">Não foi possível consultar as licenças. Atualize para tentar novamente.</p>}
        <div className="card-v2 p-4"><UserFilters filters={filters} onChange={value => { setFilters(value); setPage(1); }}
          companies={companyOptions} showCompanyFilter={currentRole === 'DEV'} availableRoles={USER_ROLES.filter(role => rows.some(user => user.role === role) || availableRoles.includes(role))} /></div>
        {users.loading && <p role="status" className="text-sm text-fg-mut">Atualizando usuários...</p>}
        {downloading && <p role="status" className="text-sm text-fg-mut">Baixando termo...</p>}
        {!filtered.length ? <EmptyState message={rows.length ? 'Nenhum usuário corresponde aos filtros.' : 'Nenhum usuário cadastrado.'} /> :
          <UsersTable rows={visible} currentRole={currentRole} currentUserId={currentUser?.id} showCompanyColumn={currentRole === 'DEV'}
            canManageRow={(role, target) => availableUserRoles(role).includes(target as AppUser['role'])}
            onEdit={user => openUser(user)} onResetPassword={user => openReset(user)} onToggleBlock={user => confirm('block', user)}
            onDownloadTerm={downloadTerm} onHistory={user => openUser(user, 'seguranca')} onDelete={user => confirm('delete', user)} />}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-fg-mut">{filtered.length} usuário(s) encontrado(s){filtered.length > 0 ? ` · Página ${currentPage} de ${pageCount}` : ''}</p>
          {pageCount > 1 && <div className="flex gap-3"><Button type="button" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
            <Button type="button" variant="outline" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Próxima</Button></div>}
        </div>
      </>}
    </>}
    {canRead && <UserCreateModal isOpen={createOpen} onClose={() => setCreateOpen(false)} availableRoles={availableRoles} currentRole={currentRole} companies={companyOptions} onSubmit={create} />}
    <UserPasswordResetModal isOpen={resetOpen} user={selected} onClose={closeReset} onSubmit={async password => {
      if (!selected || !userAccessPolicy(currentRole, currentUser?.id, selected).reset) throw new Error('Reset não autorizado.');
      const updated = await api.users.resetPassword(selected.id, { newPassword: password });
      setSelected({ ...selected, ...updated }); users.refetch(); toast.success('Senha temporária definida.');
    }} />
    <UserDrawer isOpen={drawerOpen} user={selected} currentRole={currentRole} currentUserId={currentUser?.id} contextCompanyId={company?.id ?? currentUser?.companyId}
      initialTab={drawerTab} availableRoles={availableRoles} onClose={() => { setDrawerOpen(false); setSelected(null); }}
      onSaveGeneral={saveGeneral} onSavePermissions={savePermissions}
      onResetPassword={() => { if (selected) openReset(selected, true); }} onToggleBlock={() => { if (selected) confirm('block', selected, true); }} />
    <AccessConfirmDialog isOpen={!!confirmation} isLoading={confirmLoading} onClose={closeConfirmation} onConfirm={execute}
      title={confirmation?.type === 'delete' ? `Excluir acesso de ${confirmation.user.name}?` : `${confirmation?.user.isActive === false ? 'Desbloquear' : 'Bloquear'} acesso de ${confirmation?.user.name ?? ''}?`}
      description={confirmError ? `${description} Erro: ${confirmError}` : description}
      confirmText={confirmation?.type === 'delete' ? 'Excluir acesso' : confirmation?.user.isActive === false ? 'Desbloquear acesso' : 'Bloquear acesso'}
      variant={confirmation?.type === 'block' && confirmation.user.isActive === false ? 'primary' : 'danger'} />
  </div></div>;
}
