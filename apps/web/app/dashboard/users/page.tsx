'use client';

import { useState } from 'react';
import { Edit3, Trash2, UserPlus, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type AppUser, type CreateUserInput, type UserRole } from '@/app/lib/api';
import { ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

const ALL_ROLES: UserRole[] = ['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONÁRIO', 'CONSULTA'];
const COMPANY_ROLES: UserRole[] = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONÁRIO', 'CONSULTA'];
const RH_ROLES: UserRole[] = ['RH', 'GESTOR', 'FUNCIONÁRIO', 'CONSULTA'];
const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';

type UserForm = CreateUserInput & { isActive?: boolean };

function getAvailableRoles(currentRole?: string, email?: string): UserRole[] {
  if (currentRole === 'DEV' && email?.toLowerCase() === PLATFORM_OWNER_EMAIL) return ALL_ROLES;
  if (currentRole === 'RH') return RH_ROLES;
  return COMPANY_ROLES;
}

function canManageRow(currentRole?: string, targetRole?: UserRole) {
  if (currentRole === 'DEV') return true;
  if (targetRole === 'DEV' || targetRole === 'COMERCIAL') return false;
  return currentRole === 'ADMIN' || currentRole === 'RH';
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const currentRole = currentUser?.profile?.toUpperCase();
  const availableRoles = getAvailableRoles(currentRole, currentUser?.email);
  const users = useQuery(() => api.users.list(), []);
  const usage = useQuery(() => api.users.usage(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);

  const remove = useMutation((id: string) => api.users.delete(id), {
    onSuccess: () => { users.refetch(); usage.refetch(); },
  });

  const rows = users.data ?? [];
  const isFull = usaídata.max : false;

  async function handleDelete(user: AppUser) {
    if (!canManageRow(currentRole, user.role)) return;
    if (!window.confirm(`Remover o acesso de ${user.name}?`)) return;
    await remove.mutate(user.id).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Usuários</p>
          <h2 className="text-2xl font-black text-slate-950">Permissões de acesso</h2>
          {usaídata && (
            <p className="mt-1 text-xs text-slate-500">
              {usaídata.max} usuários
              {isFull && <span className="ml-1 font-bold text-amber-600">- limite atingido</span>}
            </p>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          disabled={isFull}
          title={isFull ? 'Limite atingido - contate o suporte para ampliar' : undefined}
          className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-50"
        >
          <UserPlus size={14} /> Novo usuário
        </button>
      </header>

      {remove.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{remove.error}</p>
      )}

      {users.loading ? (
        <LoadingState label="Carregando usuários..." />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState messaídastrado." />
      ) : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="pb-3 pr-4">E-mail</th>
                  <th className="pb-3 pr-4">Perfil</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => {
                  const allowed = canManageRow(currentRole, user.role);
                  return (
                    <tr key={user.id} className="border-t border-slate-100 text-xs text-slate-700">
                      <td className="py-3 pr-4 font-medium text-slate-950">{normalizeDisplayName(user.name)}</td>
                      <td className="py-3 pr-4">{user.email}</td>
                      <td className="py-3 pr-4">{ROLE_LABEL[user.role] ?? user.role}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${user.isActive === false ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                          {user.isActive === false ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </td>
                      <td className="py-3">
                        {allowed ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setEditing(user)}
                              className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"
                            >
                              <Edit3 size={12} />Editar
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={remove.loading}
                              className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-rose-600 disabled:opacity-50"
                            >
                              <Trash2 size={12} />Remover
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">Restrito</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <UserModal
          availableRoles={availableRoles}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); users.refetch(); usage.refetch(); }}
        />
      )}
      {editing && (
        <UserModal
          user={editing}
          availableRoles={availableRoles}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); users.refetch(); usage.refetch(); }}
        />
      )}
    </div>
  );
}

function UserModal({ user, availableRoles, onClose, onDone }: { user?: AppUser; availableRoles: UserRole[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<UserForm>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? (availableRoles.includes('FUNCIONÁRIO'),
    isActive: user ? user.isActive ?? true : undefined,
  });
  const save = useMutation(() => {
    if (user) {
      const { password, ...rest } = form;
      return api.users.update(user.id, { ...rest, name: normalizeDisplayName(rest.name ?? ''), email: rest.email?.trim().toLowerCase(), ...(password ? { password } : {}) });
    }
    const { isActive, ...createInput } = form;
    return api.users.create({ ...createInput, name: normalizeDisplayName(createInput.name), email: createInput.email.trim().toLowerCase() });
  }, { onSuccess: onDone });
  const valid = form.name && form.email && (user || form.password.length >= 8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">{user ? 'Editar usuário' : 'Novo usuário'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {save.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{save.error}</p>}
        <div className="space-y-3">
          {[
            { label: 'Nome', key: 'name' as const, type: 'text' },
            { label: 'E-mail', key: 'email' as const, type: 'email' },
            { label: user ? 'Nova senha (opcional)' : 'Senha padrão (min. 8)', key: 'password' as const, type: 'password' },
          ].map(({ label, key, type }) => (
            <label key={key} className="block space-y-1 text-xs font-medium text-slate-600">
              <span>{label}</span>
              <input
                type={type}
                value={form[key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
          ))}
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>Perfil</span>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
            >
              {availableRoles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
          {user && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={form.isActive !== false}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Usuário ativo
            </label>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button
            onClick={() => valid && save.mutate().catch(() => {})}
            disabled={!valid || save.loading}
            className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            {save.loading ? 'Salvando...' : user ? 'Salvar usuário' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </div>
  );
}
