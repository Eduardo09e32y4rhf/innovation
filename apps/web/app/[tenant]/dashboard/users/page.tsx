'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type AppUser, type UserRole } from '@/app/lib/api';

import { UserSummaryCards } from './_components/user-summary-cards';
import { UserFilters, type UserFilterState } from './_components/user-filters';
import { UsersTable } from './_components/users-table';
import { UserDrawer } from './_components/user-drawer';
import { UserCreateModal } from './_components/user-create-modal';
import { UserPasswordResetModal } from './_components/user-password-reset-modal';

const ALL_ROLES: UserRole[] = ['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const COMPANY_ROLES: UserRole[] = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const RH_ROLES: UserRole[] = ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const ROLE_MANAGEMENT: Record<UserRole, UserRole[]> = {
  DEV: ['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  COMERCIAL: [],
  ADMIN: ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  RH: ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  GESTOR: [],
  FUNCIONARIO: [],
  CONSULTA: [],
};

// SEGURANÇA: e-mail do DEV proprietário — lido de variável de ambiente pública
const PLATFORM_OWNER_EMAIL = (process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL ?? '').toLowerCase();

function getAvailableRoles(currentRole?: string, email?: string): UserRole[] {
  if (currentRole === 'DEV' && email?.toLowerCase() === PLATFORM_OWNER_EMAIL) return ALL_ROLES;
  if (currentRole === 'RH') return RH_ROLES;
  return COMPANY_ROLES;
}

function canManageRow(currentRole?: string, targetRole?: string) {
  if (!currentRole || !targetRole) return false;
  return ROLE_MANAGEMENT[currentRole as UserRole]?.includes(targetRole as UserRole) ?? false;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const currentRole = currentUser?.profile?.toUpperCase();
  const availableRoles = getAvailableRoles(currentRole, currentUser?.email);
  
  const users = useQuery(() => api.users.list(), []);
  const usage = useQuery(() => api.users.usage(), []);

  const remove = useMutation((id: string) => api.users.delete(id), {
    onSuccess: () => { users.refetch(); usage.refetch(); },
  });

  const toggleStatus = useMutation(({ id, isActive }: { id: string; isActive: boolean }) => 
    api.users.update(id, { isActive }), {
    onSuccess: () => { users.refetch(); },
  });

  const resetPassword = useMutation(({ id, newPassword }: { id: string; newPassword: string }) =>
    api.auth.resetEmployeePassword(id, newPassword), { // wait, I should use api.users.resetPassword
  }); // I will fix the API call later, using fetch directly if needed, or api.users.update

  // States
  const [filters, setFilters] = useState<UserFilterState>({
    search: '',
    role: '',
    status: '',
    link: '',
    company: '',
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Data
  const rows = users.data ?? [];
  const uniqueCompanies = currentRole === 'DEV' 
    ? Array.from(new Set(rows.map(u => u.company?.name).filter(Boolean) as string[])).sort()
    : [];

  const filteredRows = rows.filter(u => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (filters.role && u.role !== filters.role) return false;
    if (filters.company && u.company?.name !== filters.company) return false;
    if (filters.status) {
      if (filters.status === 'ativos' && u.isActive === false) return false;
      if (filters.status === 'bloqueados' && u.isActive !== false) return false;
      if (filters.status === 'pendente' && !u.forcePasswordChange) return false;
    }
    if (filters.link) {
      const hasLink = !!u.employee?.id;
      if (filters.link === 'com' && !hasLink) return false;
      if (filters.link === 'sem' && hasLink) return false;
    }
    return true;
  });

  // Actions
  const handleEdit = (user: AppUser) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const handleResetPassword = (user: AppUser) => {
    setSelectedUser(user);
    setResetModalOpen(true);
  };

  const handleToggleBlock = async (user: AppUser) => {
    if (!window.confirm(`Tem certeza que deseja ${user.isActive === false ? 'desbloquear' : 'bloquear'} o acesso de ${user.name}?`)) return;
    await toggleStatus.mutate({ id: user.id, isActive: user.isActive === false }).catch((e) => alert(e.message));
  };

  const handleDownloadTerm = async (user: AppUser) => {
    try {
      const { readAuthSession } = require('@/app/lib/auth-session');
      const token = readAuthSession().token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/legal/terms/download/${user.id}?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Não foi possível baixar o termo');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Termo_De_Uso_${user.id}.pdf`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      alert('Erro ao baixar o PDF. Pode não ter sido assinado ainda.');
    }
  };

  const handleHistory = (user: AppUser) => {
    alert('Histórico será implementado na próxima fase.');
  };

  const handleDelete = async (user: AppUser) => {
    if (!window.confirm(`Tem certeza que deseja excluir DEFINITIVAMENTE o acesso de ${user.name}?`)) return;
    await remove.mutate(user.id).catch((e) => alert(e.message));
  };

  const handleCreateSubmit = async (data: any) => {
    const { password, ...rest } = data;
    await api.users.create({ ...rest, password });
    users.refetch();
    usage.refetch();
  };

  const handleResetSubmit = async (newPassword: string) => {
    if (!selectedUser) return;
    const { readAuthSession } = require('@/app/lib/auth-session');
    const token = readAuthSession().token;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/users/${selectedUser.id}/reset-password`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Erro ao redefinir a senha');
    }
    alert('Senha temporária definida com sucesso!');
    users.refetch();
  };

  const handleSaveGeneral = async (data: Partial<AppUser>) => {
    if (!selectedUser) return;
    await api.users.update(selectedUser.id, data);
    users.refetch();
  };

  const handleSavePermissions = async (customPermissions: string[] | null) => {
    if (!selectedUser) return;
    await api.users.update(selectedUser.id, { customPermissions: customPermissions ?? undefined });
    users.refetch();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="page-header items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">
            Usuários
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            Usuários e acessos
          </h2>
          <p className="text-sm font-medium text-slate-500">
            Gerencie acessos, perfis e segurança da sua equipe.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="crystal-button"
        >
          <UserPlus size={14} /> Novo usuário
        </button>
      </header>

      {users.loading ? (
        <LoadingState label="Carregando usuários..." />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.refetch} />
      ) : (
        <>
          <UserSummaryCards rows={rows} usage={usage.data} />

          <div className="ops-card rounded-[14px] border border-slate-200 bg-white p-5">
            <UserFilters
              filters={filters}
              onChange={setFilters}
              uniqueCompanies={uniqueCompanies}
              showCompanyFilter={currentRole === 'DEV'}
              availableRoles={availableRoles}
            />
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState message="Nenhum usuário encontrado." />
          ) : (
            <UsersTable
              rows={filteredRows}
              currentRole={currentRole}
              canManageRow={canManageRow}
              onEdit={handleEdit}
              onResetPassword={handleResetPassword}
              onToggleBlock={handleToggleBlock}
              onDownloadTerm={handleDownloadTerm}
              onHistory={handleHistory}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      <UserCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        availableRoles={availableRoles}
        currentRole={currentRole}
        uniqueCompanies={uniqueCompanies}
        onSubmit={handleCreateSubmit}
      />

      <UserPasswordResetModal
        isOpen={resetModalOpen}
        user={selectedUser}
        onClose={() => {
          setResetModalOpen(false);
          if (!drawerOpen) setSelectedUser(null);
        }}
        onSubmit={handleResetSubmit}
      />

      <UserDrawer
        isOpen={drawerOpen}
        user={selectedUser}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedUser(null);
        }}
        availableRoles={availableRoles}
        currentRole={currentRole}
        isDevOwner={currentRole === 'DEV' && currentUser?.email?.toLowerCase() === PLATFORM_OWNER_EMAIL}
        onSaveGeneral={handleSaveGeneral}
        onSavePermissions={handleSavePermissions}
        onResetPassword={() => setResetModalOpen(true)}
        onToggleBlock={() => handleToggleBlock(selectedUser!)}
      />
    </div>
  );
}
