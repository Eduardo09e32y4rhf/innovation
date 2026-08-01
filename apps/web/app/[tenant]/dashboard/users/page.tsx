'use client';

import { useState } from 'react';
import { AlertTriangle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
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

// ─── Modal de confirmação reutilizável ────────────────────────────────────────
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ isOpen, title, description, confirmLabel, confirmClass = 'bg-rose-600 text-white hover:bg-rose-700', loading, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50">
            <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">{title}</h3>
            <p className="mt-1 text-xs text-slate-600">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading} className="btn-outline px-5">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center rounded-[10px] px-5 py-2 text-xs font-black shadow-sm transition-all disabled:opacity-60 ${confirmClass}`}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const companies = useQuery(() => api.platform.listCompanies(), [], { enabled: currentRole === 'DEV' });

  const remove = useMutation((id: string) => api.users.delete(id), {
    onSuccess: () => { users.refetch(); usage.refetch(); },
  });

  const toggleStatus = useMutation(({ id, isActive }: { id: string; isActive: boolean }) => 
    api.users.update(id, { isActive }), {
    onSuccess: () => { users.refetch(); },
  });

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

  // Confirm modal state
  type ConfirmAction = { type: 'block' | 'delete'; user: AppUser } | null;
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Data
  const rows = users.data ?? [];
  const companyOptions = currentRole === 'DEV' ? (companies.data ?? []) : [];
  const showCompanyFilter = currentRole === 'DEV' && companyOptions.length > 1;
  const showCompanyColumn = currentRole === 'DEV' && companyOptions.length > 1;

  const filteredRows = rows.filter(u => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (filters.role && u.role !== filters.role) return false;
    if (filters.company && u.companyId !== filters.company) return false;
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

  const handleToggleBlock = (user: AppUser) => {
    setConfirmAction({ type: 'block', user });
  };

  const executeToggleBlock = async (user: AppUser) => {
    setConfirmLoading(true);
    try {
      await toggleStatus.mutate({ id: user.id, isActive: user.isActive === false });
      toast.success(user.isActive === false ? 'Acesso desbloqueado.' : 'Acesso bloqueado.');
      setConfirmAction(null);
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível atualizar o acesso.');
    } finally {
      setConfirmLoading(false);
    }
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
      toast.error('Erro ao baixar o PDF. Pode nao ter sido assinado ainda.');
    }
  };

  const handleHistory = (user: AppUser) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const handleDelete = (user: AppUser) => {
    setConfirmAction({ type: 'delete', user });
  };

  const executeDelete = async (user: AppUser) => {
    setConfirmLoading(true);
    try {
      await remove.mutate(user.id);
      toast.success('Acesso excluído.');
      setConfirmAction(null);
      if (drawerOpen && selectedUser?.id === user.id) {
        setDrawerOpen(false);
        setSelectedUser(null);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível excluir o acesso.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCreateSubmit = async (data: any) => {
    try {
      const { password, ...rest } = data;
      await api.users.create({ ...rest, password });
      users.refetch();
      usage.refetch();
    } catch (e: any) {
      // Re-lança o erro para o modal tratar inline (ex: e-mail duplicado)
      throw e;
    }
  };

  const handleResetSubmit = async (newPassword: string) => {
    if (!selectedUser) return;
    try {
      const updatedUser = await api.users.resetPassword(selectedUser.id, { newPassword });
      setSelectedUser(updatedUser);
      setResetModalOpen(false);
      toast.success('Senha temporaria definida com sucesso!');
      await users.refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Nao foi possivel redefinir a senha.');
      throw error;
    }
  };

  const handleSaveGeneral = async (data: Partial<AppUser>) => {
    if (!selectedUser) return;
    const updated = await api.users.update(selectedUser.id, data);
    setSelectedUser(updated);
    users.refetch();
  };

  const handleSavePermissions = async (customPermissions: string[] | null) => {
    if (!selectedUser) return;
    const updated = await api.users.update(selectedUser.id, { customPermissions });
    setSelectedUser(updated);
    users.refetch();
  };

  return (
    <div className="mx-auto w-full space-y-5 overflow-x-hidden">
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
              companies={companyOptions}
              showCompanyFilter={showCompanyFilter}
              availableRoles={availableRoles}
            />
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState message="Nenhum usuário encontrado." />
          ) : (
            <UsersTable
              rows={filteredRows}
              currentRole={currentRole}
              showCompanyColumn={showCompanyColumn}
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
          companies={companyOptions}
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

      {/* Modal de confirmação (bloquear/excluir) */}
      <ConfirmModal
        isOpen={!!confirmAction}
        loading={confirmLoading}
        title={
          confirmAction?.type === 'delete'
            ? `Excluir acesso de ${confirmAction.user.name}?`
            : confirmAction?.user.isActive === false
              ? `Desbloquear ${confirmAction?.user.name}?`
              : `Bloquear ${confirmAction?.user.name}?`
        }
        description={
          confirmAction?.type === 'delete'
            ? 'Esta ação é irreversível. O usuário perderá acesso imediatamente e todos os dados de acesso serão removidos.'
            : confirmAction?.user.isActive === false
              ? 'O usuário voltará a conseguir fazer login normalmente.'
              : 'O usuário será impedido de fazer login até ser desbloqueado.'
        }
        confirmLabel={
          confirmAction?.type === 'delete'
            ? 'Excluir definitivamente'
            : confirmAction?.user.isActive === false
              ? 'Desbloquear'
              : 'Bloquear'
        }
        confirmClass={
          confirmAction?.type === 'delete'
            ? 'bg-rose-600 text-white hover:bg-rose-700'
            : confirmAction?.user.isActive === false
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-rose-600 text-white hover:bg-rose-700'
        }
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === 'block') executeToggleBlock(confirmAction.user);
          else executeDelete(confirmAction.user);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
