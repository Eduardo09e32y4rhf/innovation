'use client';

import { useState } from 'react';
import { Edit3, Plus, Trash2, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type AppUser, type PlatformCompany, type PlatformCompanyUserRole } from '@/app/lib/api';
import { ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

const COMPANY_USER_ROLES: PlatformCompanyUserRole[] = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
type CompanyUserForm = { name: string; email: string; password: string; role: PlatformCompanyUserRole; isActive?: boolean };

function F({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
    </label>
  );
}

export function CompanyUsersModal({ company, onClose }: { company: PlatformCompany; onClose: () => void }) {
  const users = useQuery(() => api.platform.listCompanyUsers(company.id), [company.id]);
  const onlineUsers = useQuery(() => api.platform.getOnlineUsers(), []);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const remove = useMutation((userId: string) => api.platform.deleteCompanyUser(company.id, userId), { onSuccess: () => users.refetch() });

  async function handleDelete(user: AppUser) {
    if (!window.confirm(`Remover o acesso de ${user.name}?`)) return;
    await remove.mutate(user.id).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-3xl rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-950">Usuários de {normalizeDisplayName(company.name)}</h3>
            <p className="mt-1 text-xs text-slate-500">{company.usersCount} / {company.maxUsers} usuarios</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="mb-4 flex justify-end">
          <button onClick={() => setOpenNew(true)} className="crystal-button inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-xs font-black text-white">
            <Plus size={13} /> Novo usuario
          </button>
        </div>
        {remove.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{remove.error}</p>}
        {users.loading ? <LoadingState label="Carregando usuarios..." /> : users.error ? <ErrorState message={users.error} onRetry={users.refetch} /> : (
          <div className="max-h-[420px] overflow-auto rounded-[8px] border border-slate-100">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-slate-50 text-[11px] font-medium text-slate-500">
                <tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Perfil</th><th className="p-3">Status</th><th className="p-3">Sessão</th><th className="p-3">Ações</th></tr>
              </thead>
              <tbody>
                {(users.data ?? []).map((u) => {
                  const isOnline = onlineUsers.data?.some((ou) => ou.id === u.id);
                  return (
                  <tr key={u.id} className="border-t border-slate-100 text-xs">
                    <td className="p-3 font-semibold text-slate-950">{normalizeDisplayName(u.name)}</td>
                    <td className="p-3 text-slate-600">{u.email}</td>
                    <td className="p-3 text-slate-600">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="p-3 text-slate-600">{u.isActive === false ? 'Bloqueado' : 'Ativo'}</td>
                    <td className="p-3">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(u)} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"><Edit3 size={12} />Editar</button>
                        <button onClick={() => handleDelete(u)} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-rose-600"><Trash2 size={12} />Remover</button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
        {(openNew || editing) && (
          <CompanyUserFormModal
            companyId={company.id}
            user={editing ?? undefined}
            onClose={() => { setOpenNew(false); setEditing(null); }}
            onDone={() => { setOpenNew(false); setEditing(null); users.refetch(); }}
          />
        )}
      </div>
    </div>
  );
}

function CompanyUserFormModal({ companyId, user, onClose, onDone }: { companyId: string; user?: AppUser; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<CompanyUserForm>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: (user?.role as PlatformCompanyUserRole) ?? 'FUNCIONARIO',
    isActive: user?.isActive ?? true,
  });
  const save = useMutation(() => {
    if (user) {
      const { password, ...rest } = form;
      return api.platform.updateCompanyUser(companyId, user.id, { ...rest, name: normalizeDisplayName(rest.name ?? ''), email: rest.email?.trim().toLowerCase(), ...(password ? { password } : {}) });
    }
    const { isActive, ...createInput } = form;
    return api.platform.createCompanyUser(companyId, { ...createInput, name: normalizeDisplayName(createInput.name), email: createInput.email.trim().toLowerCase() });
  }, { onSuccess: onDone });
  const valid = form.name && form.email && (user || form.password.length >= 8);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-base font-black text-slate-950">{user ? 'Editar usuario' : 'Novo usuario'}</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {save.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{save.error}</p>}
        <div className="space-y-3">
          <F label="Nome" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
          <F label="E-mail" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
          <F label={user ? 'Nova senha (opcional)' : 'Senha padrao (min. 8 chars)'} type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} />
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>Perfil</span>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as PlatformCompanyUserRole }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
              {COMPANY_USER_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
            </select>
          </label>
          {user && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              Usuario ativo
            </label>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button onClick={() => valid && save.mutate().catch(() => {})} disabled={!valid || save.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
            {save.loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
