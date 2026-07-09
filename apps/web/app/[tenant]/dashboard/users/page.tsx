'use client';

import { useState } from 'react';
import { Edit3, Trash2, UserPlus, X, Search, Building2, Download } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type AppUser, type CreateUserInput, type UserRole } from '@/app/lib/api';
import { ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { PERMISSIONS_LABELS, type Permission, getDefaultPermissions } from '@/app/lib/permissions';

const ALL_ROLES: UserRole[] = ['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const COMPANY_ROLES: UserRole[] = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const RH_ROLES: UserRole[] = ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';

type UserForm = CreateUserInput & { isActive?: boolean; customPermissions?: string[] };

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
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const remove = useMutation((id: string) => api.users.delete(id), {
    onSuccess: () => { users.refetch(); usage.refetch(); },
  });

  const rows = users.data ?? [];
  const filteredRows = rows.filter(u => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (currentRole === 'DEV' && companyFilter) {
      if (u.company?.name !== companyFilter) return false;
    }
    return true;
  });
  const uniqueCompanies = currentRole === 'DEV' 
    ? Array.from(new Set(rows.map(u => u.company?.name).filter(Boolean) as string[])).sort()
    : [];

  const isFull = usage.data ? usage.data.used >= usage.data.max : false;

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
          {usage.data && typeof usage.data.used === 'number' && (
            <p className="mt-1 text-xs text-slate-500">
              {usage.data.used} de {usage.data.max} usuários
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-[8px] border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-teal-500"
          />
        </div>
        {currentRole === 'DEV' && uniqueCompanies.length > 0 && (
          <div className="relative sm:w-64">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-10 w-full appearance-none rounded-[8px] border border-slate-200 bg-white pl-10 pr-8 text-sm text-slate-800 outline-none focus:border-teal-500"
            >
              <option value="">Todas as empresas</option>
              {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {remove.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{remove.error}</p>
      )}

      {users.loading ? (
        <LoadingState label="Carregando usuários..." />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhum usuário cadastrado." />
      ) : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Nome</th>
                  {currentRole === 'DEV' && <th className="pb-3 pr-4">Empresa</th>}
                  <th className="pb-3 pr-4">E-mail</th>
                  <th className="pb-3 pr-4">Perfil</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((user) => {
                  const allowed = canManageRow(currentRole, user.role);
                  return (
                    <tr key={user.id} className="border-t border-slate-100 text-xs text-slate-700">
                      <td className="py-3 pr-4 font-medium text-slate-950">{normalizeDisplayName(user.name)}</td>
                      {currentRole === 'DEV' && (
                        <td className="py-3 pr-4">{user.company?.name ?? '-'}</td>
                      )}
                      <td className="py-3 pr-4">{user.email || '-'}</td>
                      <td className="py-3 pr-4">{user.role ? (ROLE_LABEL[user.role] ?? user.role) : '-'}</td>
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
                            {currentRole === 'DEV' && (
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`Resetar a senha de ${user.name}? O usuário precisará criar uma nova senha no próximo login.`)) return;
                                  await api.users.resetPassword(user.id).catch(() => {});
                                  alert('Senha resetada com sucesso.');
                                }}
                                className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-amber-600"
                              >
                                Resetar
                              </button>
                            )}
                            {(currentRole === 'DEV' || currentRole === 'ADMIN' || currentRole === 'RH') && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/legal/terms/download/${user.id}?t=${Date.now()}`, {
                                      headers: { Authorization: `Bearer ${window.sessionStorage.getItem('auth.token')}` },
                                      cache: 'no-store'
                                    });
                                    if (!res.ok) throw new Error('Não foi possível baixar o termo');
                                    const blob = await res.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Termo_De_Uso_${user.id}.pdf`;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                  } catch (e) {
                                    alert('Erro ao baixar o PDF. Pode não ter sido assinado ainda.');
                                  }
                                }}
                                className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-teal-700"
                                title="Baixar Termo Assinado"
                              >
                                <Download size={12} />Termo
                              </button>
                            )}
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
    role: user?.role ?? (availableRoles.includes('FUNCIONARIO') ? 'FUNCIONARIO' : availableRoles[0] ?? 'FUNCIONARIO'),
    isActive: user ? user.isActive ?? true : undefined,
    customPermissions: user?.customPermissions && Array.isArray(user.customPermissions) && user.customPermissions.length > 0 ? user.customPermissions : undefined,
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
            ...(user ? [] : [{ label: 'Senha padrão (min. 8)', key: 'password' as const, type: 'password' }]),
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
          {user && (
            <div className="flex items-center justify-between rounded-[8px] border border-slate-200 p-3">
              <div>
                <div className="text-xs font-bold text-slate-800">Resetar senha</div>
                <div className="text-[10px] text-slate-500">Define a senha padrão (12345678) e exige troca no login.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja resetar a senha para 12345678?')) {
                    api.users.resetPassword(user.id)
                      .then(() => window.alert('Senha resetada com sucesso!'))
                      .catch((e) => window.alert(e.message));
                  }
                }}
                className="rounded border border-slate-300 px-3 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
              >
                Resetar
              </button>
            </div>
          )}
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

          <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="mb-2 text-sm font-bold text-slate-800">Acessos Personalizados</h4>
            <p className="mb-3 text-[10px] text-slate-500">
              Caso nenhuma caixa esteja marcada, o usuário terá as permissões padrões do <strong>Perfil</strong> escolhido acima. Se você marcar uma ou mais opções, as permissões do perfil serão ignoradas e o usuário só terá os acessos marcados aqui.
            </p>
            <div className="max-h-48 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-2 space-y-1">
              {(Object.keys(PERMISSIONS_LABELS) as Permission[]).map(p => {
                const isSelected = form.customPermissions?.includes(p) || (!form.customPermissions && getDefaultPermissions(form.role || 'FUNCIONARIO').includes(p));
                const isOverride = !!form.customPermissions && form.customPermissions.length > 0;
                
                return (
                  <label key={p} className="flex items-start gap-2 text-[11px] font-medium text-slate-700 py-1 hover:bg-slate-100 rounded px-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.customPermissions?.includes(p)}
                      onChange={(e) => {
                        setForm(f => {
                          const current = Array.isArray(f.customPermissions) ? f.customPermissions : [];
                          if (e.target.checked) {
                            return { ...f, customPermissions: [...current, p] };
                          } else {
                            // If they uncheck something when there's no override yet, we take all defaults and remove this one
                            if (current.length === 0) {
                               const defs = getDefaultPermissions(f.role || 'FUNCIONARIO');
                               return { ...f, customPermissions: defs.filter(x => x !== p) };
                            }
                            return { ...f, customPermissions: current.filter(x => x !== p) };
                          }
                        });
                      }}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                    />
                    <span>{PERMISSIONS_LABELS[p]} {(!isOverride && isSelected) ? <span className="text-[9px] text-slate-400 font-normal">(Padrão do perfil)</span> : null}</span>
                  </label>
                );
              })}
            </div>
            {!!form.customPermissions && form.customPermissions.length > 0 && (
              <button 
                type="button" 
                onClick={() => setForm(f => ({ ...f, customPermissions: undefined }))}
                className="mt-2 text-[10px] font-bold text-teal-600 hover:underline"
              >
                Restaurar acessos padrões do perfil
              </button>
            )}
          </div>
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
