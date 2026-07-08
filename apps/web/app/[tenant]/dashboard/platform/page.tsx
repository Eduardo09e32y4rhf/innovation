'use client';

import { useState } from 'react';
import { Building2, Edit3, Plus, Power, Settings, Trash2, Users, X, Database, Shield, CreditCard, MessageSquare, Key } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type AppUser, type CreatePlatformCompanyInput, type PlatformCompany, type PlatformCompanyUserRole } from '@/app/lib/api';
import { ROLE_LABEL, formatDate } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

const COMPANY_USER_ROLES: PlatformCompanyUserRole[] = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];

type CompanyUserForm = { name: string; email: string; password: string; role: PlatformCompanyUserRole; isActive?: boolean };

function safeIsoDate(val: any) {
  if (!val) return '';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

export default function PlatformPage() {
  const { user } = useAuth();
  const currentRole = user?.profile?.toUpperCase();
  const isSuperAdmin = currentRole === 'DEV';
  const stats = useQuery(() => api.platform.stats(), []);
  const companies = useQuery(() => api.platform.listCompanies(), []);
  const [open, setOpen] = useState(false);
  const [usersCompany, setUsersCompany] = useState<PlatformCompany | null>(null);
  const [licenseCompany, setLicenseCompany] = useState<PlatformCompany | null>(null);

  const toggleActive = useMutation(
    ({ id, status, suspensionReason }: { id: string; status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'; suspensionReason?: string | null }) =>
      api.platform.updateCompany(id, { status, suspensionReason }),
    { onSuccess: () => { companies.refetch(); stats.refetch(); } },
  );

  const remove = useMutation((id: string) => api.platform.deleteCompany(id), {
    onSuccess: () => { companies.refetch(); stats.refetch(); },
  });

  const updateLicense = useMutation(
    ({ id, maxUsers, maxEmployees, plan, billingStatus, trialEndsAt, activeModules }: { id: string; maxUsers: number; maxEmployees: number; plan?: 'FREE' | 'BASE' | 'PRO' | 'ENTERPRISE'; billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'; trialEndsAt?: string; activeModules?: string[]; asaasCustomerId?: string; asaasSubscriptionId?: string; internalNotes?: string }) =>
      api.platform.updateCompany(id, { maxUsers, maxEmployees, plan, billingStatus, trialEndsAt, activeModules }),
    { onSuccess: () => { companies.refetch(); stats.refetch(); setLicenseCompany(null); } },
  );

  function canManageCompanyUsers(c: PlatformCompany) {
    if (isSuperAdmin) return true;
    return currentRole === 'COMERCIAL' && c.commercialOwnerId === user?.id;
  }

  function canManageLicenses(c: PlatformCompany) {
    if (isSuperAdmin) return true;
    return currentRole === 'COMERCIAL' && c.commercialOwnerId === user?.id;
  }

  async function handleToggle(c: PlatformCompany) {
    if (!isSuperAdmin) return;
    const currentStatus = c.status ?? (c.isActive ? 'ACTIVE' : 'SUSPENDED');
    if (currentStatus !== 'ACTIVE') {
      await toggleActive.mutate({ id: c.id, status: 'ACTIVE', suspensionReason: null }).catch(() => {});
      return;
    }
    const reason = window.prompt('Motivo: inadimplencia ou solicitacao_voluntaria?', 'inadimplencia');
    if (reason === null) return;
    const normalized = reason.trim() === 'solicitacao_voluntaria' ? 'solicitacao_voluntaria' : reason.trim() === 'nao informado' ? 'nao informado' : 'inadimplencia';
    await toggleActive.mutate({ id: c.id, status: 'SUSPENDED', suspensionReason: normalized }).catch(() => {});
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
          <h2 className="text-2xl font-black text-slate-950">Gestão de empresas</h2>
        </div>
        <button onClick={() => setOpen(true)} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
          <Plus size={14} /> Nova empresa
        </button>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Empresas', value: stats.data?.companies, icon: Building2 },
          { label: 'Usuários', value: stats.data?.users, icon: Users },
          { label: 'Funcionários', value: stats.data?.employees, icon: Users },
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
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Empresa</th>
                  <th className="pb-3 pr-4">CNPJ</th>
                  <th className="pb-3 pr-4">Usuários</th>
                  <th className="pb-3 pr-4">Funcionários</th>
                  <th className="pb-3 pr-4">Plano</th><th className="pb-3 pr-4">Financeiro</th><th className="pb-3 pr-4">Criada em</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {(companies.data ?? []).map((c) => {
                  const status = c.status ?? (c.isActive ? 'ACTIVE' : 'SUSPENDED');
                  return (
                    <tr key={c.id} className="border-t border-slate-100 text-xs text-slate-700">
                      <td className="py-3 pr-4 font-medium text-slate-950">{normalizeDisplayName(c.name)}</td>
                      <td className="py-3 pr-4">{c.document || '-'}</td>
                      <td className="py-3 pr-4">{c.usersCount} / {c.maxUsers}</td>
                      <td className="py-3 pr-4">{c.employeesCount} / {c.maxEmployees}</td>
                      <td className="py-3 pr-4">
    <span className="inline-flex rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">{c.plan ?? 'FREE'}</span>
  </td>
  <td className="py-3 pr-4">
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.billingStatus === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : c.billingStatus === 'TRIAL' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
      {c.billingStatus ?? 'TRIAL'}
    </span>
  </td>
  <td className="py-3 pr-4">{formatDate(c.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="space-y-1">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                            {status === 'ACTIVE' ? 'Ativa' : status === 'CANCELLED' ? 'Cancelada' : 'Suspensa'}
                          </span>
                          {status !== 'ACTIVE' && c.suspensionReason && <p className="max-w-[180px] truncate text-[10px] text-slate-400">{c.suspensionReason}</p>}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {canManageCompanyUsers(c) && (
                            <>
                              <button onClick={() => setUsersCompany(c)} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]">
                                <Users size={12} />Usuários
                              </button>
                              {canManageLicenses(c) && (
                                <button onClick={() => setLicenseCompany(c)} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]">
                                  <Settings size={12} />Gerenciar
                                </button>
                              )}
                            </>
                          )}
                          {isSuperAdmin && (
                            <>
                              <button onClick={() => (() => {})()} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-[#0030B9] hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 font-semibold">
                                <Key size={12} />Acessar
                              </button>
                              <button onClick={() => handleToggle(c)} disabled={toggleActive.loading} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]">
                                <Power size={12} />{status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                              </button>
                              <button onClick={() => handleDelete(c)} disabled={remove.loading} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-rose-600">
                                <Trash2 size={12} />Excluir
                              </button>
                            </>
                          )}
                          {!canManageCompanyUsers(c) && !isSuperAdmin && <span className="text-[11px] font-semibold text-slate-400">Somente visualizacao</span>}
                        </div>
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
        <NewCompanyModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); companies.refetch(); stats.refetch(); }} />
      )}
      {usersCompany && (
        <CompanyUsersModal company={usersCompany} onClose={() => setUsersCompany(null)} />
      )}
      {licenseCompany && (
        <CompanyManageModal
          company={licenseCompany}
          onClose={() => setLicenseCompany(null)}
          onSave={(data) => updateLicense.mutate({ id: licenseCompany.id, ...data }).catch(() => {})}
          loading={updateLicense.loading}
          error={updateLicense.error}
        />
      )}
    </div>
  );
}

function CompanyUsersModal({ company, onClose }: { company: PlatformCompany; onClose: () => void }) {
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

function NewCompanyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<CreatePlatformCompanyInput>({
    name: '', document: '', maxUsers: 6, maxEmployees: 50,
    adminName: '', adminEmail: '', adminPassword: '',
  });
  const create = useMutation(() => api.platform.createCompany({
    ...form,
    name: normalizeDisplayName(form.name),
    document: form.document?.trim(),
    adminName: normalizeDisplayName(form.adminName),
    adminEmail: form.adminEmail.trim().toLowerCase(),
  }), { onSuccess: onDone });
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
          <button onClick={() => valid && create.mutate().catch(() => {})} disabled={!valid || create.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
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
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
    </label>
  );
}

// ─── COMPANY MANAGE MODAL ───────────────────────────────────────────────────

function CompanyManageModal({ company, onClose, onSave, loading, error }: { company: PlatformCompany; onClose: () => void; onSave: (data: any) => void; loading: boolean; error: string | null }) {
  const [activeTab, setActiveTab] = useState<'plan' | 'permissions' | 'finance' | 'crm'>('plan');

  const [maxUsers, setMaxUsers] = useState(company.maxUsers);
  const [maxEmployees, setMaxEmployees] = useState(company.maxEmployees ?? 1);
  const [plan, setPlan] = useState<any>(company.plan ?? 'FREE');
  const [billingStatus, setBillingStatus] = useState<any>(company.billingStatus ?? 'TRIAL');
  const [trialEndsAt, setTrialEndsAt] = useState(safeIsoDate(company.trialEndsAt));
  const [activeModules, setActiveModules] = useState<string[]>(company.activeModules || ['employees', 'time-track', 'vacations', 'management', 'whatsapp']);
  const [asaasCustomerId, setAsaasCustomerId] = useState(company.asaasCustomerId || '');
  const [asaasSubscriptionId, setAsaasSubscriptionId] = useState(company.asaasSubscriptionId || '');
  const [internalNotes, setInternalNotes] = useState(company.internalNotes || '');

  const changed = 
    maxUsers !== (company.maxUsers ?? 1) || 
    maxEmployees !== (company.maxEmployees ?? 1) || 
    plan !== (company.plan ?? 'FREE') || 
    billingStatus !== (company.billingStatus ?? 'TRIAL') || 
    trialEndsAt !== safeIsoDate(company.trialEndsAt) || 
    JSON.stringify(activeModules) !== JSON.stringify(company.activeModules || ['employees', 'time-track', 'vacations', 'management', 'whatsapp']) ||
    asaasCustomerId !== (company.asaasCustomerId || '') ||
    asaasSubscriptionId !== (company.asaasSubscriptionId || '') ||
    internalNotes !== (company.internalNotes || '');

  const valid = maxUsers >= 1 && maxUsers >= company.usersCount && maxEmployees >= 1 && maxEmployees >= company.employeesCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[12px] border border-slate-200 bg-white p-0 shadow-xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-black text-slate-950">Gerenciar {normalizeDisplayName(company.name)}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">Configurações, limites e financeiro</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {/* TABS */}
        <div className="flex gap-6 border-b border-slate-100 px-6 pt-2 overflow-x-auto">
          {[
            { id: 'plan', label: 'Planos e Limites', icon: <Database size={14} /> },
            { id: 'permissions', label: 'Permissões', icon: <Shield size={14} /> },
            { id: 'finance', label: 'Financeiro', icon: <CreditCard size={14} /> },
            { id: 'crm', label: 'CRM / Notas', icon: <MessageSquare size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-xs font-bold transition-colors ${activeTab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

          {activeTab === 'plan' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Usuários</label>
                  <span className="text-[10px] font-bold text-slate-400">{company.usersCount} em uso</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={Math.max(1, company.usersCount)} value={maxUsers} onChange={(e) => setMaxUsers(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500" />
                </div>
                {maxUsers < company.usersCount && <p className="mt-1 text-[10px] font-semibold text-rose-600">Não pode ser menor que o atual ({company.usersCount})</p>}
              </div>

              <div className="rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Funcionários</label>
                  <span className="text-[10px] font-bold text-slate-400">{company.employeesCount} em uso</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={Math.max(1, company.employeesCount)} value={maxEmployees} onChange={(e) => setMaxEmployees(Math.max(1, Number(e.target.value) || 1))} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500" />
                </div>
                {maxEmployees < company.employeesCount && <p className="mt-1 text-[10px] font-semibold text-rose-600">Não pode ser menor que o atual ({company.employeesCount})</p>}
              </div>

              <div className="sm:col-span-2 rounded-[10px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Plano Ativo</label>
                    <select value={plan} onChange={(e) => setPlan(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500 bg-white">
                      <option value="FREE">Free Trial</option>
                      <option value="BASE">Base (R$ 299,00)</option>
                      <option value="PRO">Pro (R$ 399,00)</option>
                      <option value="ENTERPRISE">Enterprise (R$ 699,99)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Status de Faturamento</label>
                    <select value={billingStatus} onChange={(e) => setBillingStatus(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-teal-500 bg-white">
                      <option value="TRIAL">Em Teste (Trial)</option>
                      <option value="ACTIVE">Ativo</option>
                      <option value="PAST_DUE">Inadimplente</option>
                      <option value="CANCELED">Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm">
              <label className="mb-4 block text-[11px] font-black uppercase tracking-wider text-slate-500">Módulos Liberados</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'employees', label: 'Funcionários' },
                  { id: 'time-track', label: 'Controle de Ponto' },
                  { id: 'vacations', label: 'Gestão de Férias' },
                  { id: 'management', label: 'Painel de Gestão' },
                  { id: 'whatsapp', label: 'Integração WhatsApp' },
                ].map(mod => (
                  <label key={mod.id} className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 p-2 rounded-[8px] hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600" checked={activeModules.includes(mod.id)} onChange={(e) => {
                      if (e.target.checked) setActiveModules(prev => [...prev, mod.id]);
                      else setActiveModules(prev => prev.filter(id => id !== mod.id));
                    }} />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0030B9] text-white">
                    <Database size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Integração Asaas</h4>
                    <p className="text-[11px] text-slate-500">Vincule a empresa ao cliente e assinatura do Asaas</p>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Customer ID (Asaas)</label>
                    <input type="text" placeholder="cus_00000..." value={asaasCustomerId} onChange={(e) => setAsaasCustomerId(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 font-mono" />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Subscription ID (Asaas)</label>
                    <input type="text" placeholder="sub_00000..." value={asaasSubscriptionId} onChange={(e) => setAsaasSubscriptionId(e.target.value)} className="h-9 w-full rounded-[6px] border border-slate-200 px-3 text-sm font-medium outline-none focus:border-teal-500 font-mono" />
                  </div>
                </div>

                {(asaasCustomerId || asaasSubscriptionId) && (
                  <div className="mt-4 flex gap-2">
                    {asaasCustomerId && (
                      <a href={`https://www.asaas.com/customer/view/${asaasCustomerId}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#0030B9] hover:underline">
                        Abrir Cliente no Asaas
                      </a>
                    )}
                    {asaasCustomerId && asaasSubscriptionId && <span className="text-slate-300">|</span>}
                    {asaasSubscriptionId && (
                      <a href={`https://www.asaas.com/subscription/view/${asaasSubscriptionId}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#0030B9] hover:underline">
                        Abrir Assinatura no Asaas
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="rounded-[10px] border border-slate-100 bg-white p-5 shadow-sm flex flex-col h-full">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">Anotações Internas (Somente DEV/COMERCIAL)</label>
              <textarea 
                value={internalNotes} 
                onChange={(e) => setInternalNotes(e.target.value)} 
                placeholder="Registre aqui o histórico de negociação, alinhamentos e observações técnicas sobre o cliente..."
                className="w-full flex-1 min-h-[160px] rounded-[8px] border border-slate-200 p-3 text-sm outline-none focus:border-teal-500 resize-y" 
              />
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-100 p-6 bg-white rounded-b-[12px]">
          <div className="text-[11px]">
            {changed ? (
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-[4px]">Alterações pendentes em abas</span>
            ) : (
              <span className="text-slate-400">Nenhuma alteração</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline h-9 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
            <button
              onClick={() => valid && changed && onSave({ 
                maxUsers, 
                maxEmployees, 
                plan, 
                billingStatus, 
                trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : undefined, 
                activeModules, 
                asaasCustomerId, 
                asaasSubscriptionId, 
                internalNotes 
              })}
              disabled={!valid || !changed || loading}
              className="crystal-button h-9 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Salvar Empresa'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
