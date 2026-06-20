'use client';

import { useState } from 'react';
import { Building2, Plus, Power, Trash2, Users, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type CreatePlatformCompanyInput, type PlatformCompany } from '@/app/lib/api';
import { formatDate } from '@/app/lib/format';

export default function PlatformPage() {
  const { user } = useAuth();
  const currentRole = user?.profile?.toUpperCase();
  const isSuperAdmin = currentRole === 'DEV';
  const stats = useQuery(() => api.platform.stats(), []);
  const companies = useQuery(() => api.platform.listCompanies(), []);
  const [open, setOpen] = useState(false);

  const toggleActive = useMutation(
    ({ id, isActive, suspensionReason }: { id: string; isActive: boolean; suspensionReason?: string | null }) =>
      api.platform.updateCompany(id, { isActive, suspensionReason }),
    { onSuccess: () => { companies.refetch(); stats.refetch(); } },
  );

  const remove = useMutation((id: string) => api.platform.deleteCompany(id), {
    onSuccess: () => { companies.refetch(); stats.refetch(); },
  });

  async function handleToggle(c: PlatformCompany) {
    if (!isSuperAdmin) return;
    if (!c.isActive) {
      await toggleActive.mutate({ id: c.id, isActive: true, suspensionReason: null }).catch(() => {});
      return;
    }
    const reason = window.prompt('Motivo da suspensao: inadimplencia ou solicitacao voluntaria?', 'inadimplencia');
    if (reason === null) return;
    await toggleActive.mutate({ id: c.id, isActive: false, suspensionReason: reason.trim() || 'nao informado' }).catch(() => {});
  }

  async function handleDelete(c: PlatformCompany) {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Excluir "${c.name}"? Remove TODOS os dados (usuarios, funcionarios, conversas). Irreversivel.`)) return;
    await remove.mutate(c.id).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Plataforma</p>
          <h2 className="text-2xl font-black text-slate-950">Gestao de empresas</h2>
        </div>
        <button onClick={() => setOpen(true)} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
          <Plus size={14} /> Nova empresa
        </button>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Empresas', value: stats.data?.companies, icon: Building2 },
          { label: 'Usuarios', value: stats.data?.users, icon: Users },
          { label: 'Funcionarios', value: stats.data?.employees, icon: Users },
          { label: 'Mensagens', value: stats.data?.messages, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="ops-card rounded-[8px] border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <div className="icon-chip icon-chip-teal"><Icon size={15} strokeWidth={1.8} /></div>
            </div>
            <p className="text-2xl font-black text-slate-950">{value ?? '-'}</p>
          </div>
        ))}
      </section>

      {(toggleActive.error || remove.error) && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {toggleActive.error || remove.error}
        </p>
      )}

      {companies.loading ? (
        <LoadingState label="Carregando empresas..." />
      ) : companies.error ? (
        <ErrorState message={companies.error} onRetry={companies.refetch} />
      ) : (companies.data ?? []).length === 0 ? (
        <EmptyState message="Nenhuma empresa cadastrada. Clique em Nova empresa." />
      ) : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Empresa</th>
                  <th className="pb-3 pr-4">CNPJ</th>
                  <th className="pb-3 pr-4">Usuarios</th>
                  <th className="pb-3 pr-4">Funcionarios</th>
                  <th className="pb-3 pr-4">Assinatura</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {(companies.data ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 text-xs text-slate-700">
                    <td className="py-3 pr-4 font-medium text-slate-950">{c.name}</td>
                    <td className="py-3 pr-4">{c.document || '-'}</td>
                    <td className="py-3 pr-4">{c.usersCount} / {c.maxUsers}</td>
                    <td className="py-3 pr-4">{c.employeesCount} / {c.maxEmployees}</td>
                    <td className="py-3 pr-4">{formatDate(c.subscriptionStartedAt ?? c.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="space-y-1">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                          {c.isActive ? 'Ativa' : 'Suspensa'}
                        </span>
                        {!c.isActive && c.suspensionReason && <p className="max-w-[180px] truncate text-[10px] text-slate-400">{c.suspensionReason}</p>}
                      </div>
                    </td>
                    <td className="py-3">
                      {isSuperAdmin ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggle(c)}
                            disabled={toggleActive.loading}
                            className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"
                          >
                            <Power size={12} />{c.isActive ? 'Suspender' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={remove.loading}
                            className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-rose-600"
                          >
                            <Trash2 size={12} />Excluir
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">Cadastro comercial</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <NewCompanyModal
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); companies.refetch(); stats.refetch(); }}
        />
      )}
    </div>
  );
}

function NewCompanyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<CreatePlatformCompanyInput>({
    name: '', document: '', maxUsers: 6, maxEmployees: 50,
    adminName: '', adminEmail: '', adminPassword: '',
  });
  const create = useMutation(() => api.platform.createCompany(form), { onSuccess: onDone });
  const valid = form.name && form.adminName && form.adminEmail && form.adminPassword.length >= 8;

  function set<K extends keyof CreatePlatformCompanyInput>(k: K, v: CreatePlatformCompanyInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Nova empresa</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {create.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{create.error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome da empresa" value={form.name} onChange={(v) => set('name', v)} required />
          <F label="CNPJ" value={form.document ?? ''} onChange={(v) => set('document', v)} />
          <F label="Max. usuarios" type="number" value={String(form.maxUsers)} onChange={(v) => set('maxUsers', Number(v) || 6)} />
          <F label="Max. funcionarios" type="number" value={String(form.maxEmployees)} onChange={(v) => set('maxEmployees', Number(v) || 50)} />
        </div>
        <p className="mb-2 mt-4 text-[11px] font-black uppercase tracking-wider text-slate-400">Admin inicial</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome" value={form.adminName} onChange={(v) => set('adminName', v)} required />
          <F label="E-mail" type="email" value={form.adminEmail} onChange={(v) => set('adminEmail', v)} required />
          <div className="sm:col-span-2">
            <F label="Senha (min. 8 chars)" type="password" value={form.adminPassword} onChange={(v) => set('adminPassword', v)} required />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button
            onClick={() => valid && create.mutate().catch(() => {})}
            disabled={!valid || create.loading}
            className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            {create.loading ? 'Criando...' : 'Criar empresa'}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span>{label}{required && <span className="text-rose-500"> *</span>}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
      />
    </label>
  );
}
