'use client';

import { useState } from 'react';
import { Trash2, UserPlus, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type CreateUserInput, type UserRole } from '@/app/lib/api';
import { ROLE_LABEL } from '@/app/lib/format';

const ROLES: UserRole[] = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO'];

export default function UsersPage() {
  const users = useQuery(() => api.users.list(), []);
  const [open, setOpen] = useState(false);

  const remove = useMutation((id: string) => api.users.delete(id), {
    onSuccess: () => users.refetch(),
  });

  const rows = users.data ?? [];

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remover o acesso de ${name}?`)) return;
    await remove.mutate(id).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Usuarios</p>
          <h2 className="text-2xl font-black text-slate-950">Permissoes de acesso</h2>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"
        >
          <UserPlus size={14} />
          Novo usuario
        </button>
      </header>

      {remove.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{remove.error}</p>
      )}

      {users.loading ? (
        <LoadingState label="Carregando usuarios..." />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhum usuario cadastrado." />
      ) : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="pb-3 pr-4">E-mail</th>
                  <th className="pb-3 pr-4">Perfil</th>
                  <th className="pb-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100 text-xs text-slate-700">
                    <td className="py-3 pr-4 font-medium text-slate-950">{user.name}</td>
                    <td className="py-3 pr-4">{user.email}</td>
                    <td className="py-3 pr-4">{ROLE_LABEL[user.role] ?? user.role}</td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={remove.loading}
                        className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] disabled:opacity-50"
                      >
                        <Trash2 size={12} />Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <NewUserModal
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            users.refetch();
          }}
        />
      )}
    </div>
  );
}

function NewUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<CreateUserInput>({ name: '', email: '', password: '', role: 'RH' });

  const create = useMutation(() => api.users.create(form), { onSuccess: onDone });
  const valid = form.name && form.email && form.password.length >= 8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Novo usuario</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {create.error && (
          <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{create.error}</p>
        )}

        <div className="space-y-3">
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>Nome</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
            />
          </label>
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
            />
          </label>
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>Senha (min. 8 caracteres)</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
            />
          </label>
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>Perfil</span>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>{ROLE_LABEL[role]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button
            onClick={() => valid && create.mutate().catch(() => {})}
            disabled={!valid || create.loading}
            className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            {create.loading ? 'Criando...' : 'Criar usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}
