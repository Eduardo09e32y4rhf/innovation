'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type PlatformCompany } from '@/app/lib/api';
import { formatDate } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

import { NewCompanyModal } from '../_components/new-company-modal';
import { CompanyEditModal } from '../_components/company-edit-modal';
import { PlatformStats } from '../_components/platform-stats';
import { CompanyActionMenu } from '../_components/company-action-menu';

export default function CompaniesPage() {
  const params = useParams();
  const { user } = useAuth();
  const tenant = String(params?.tenant || user?.companyId || 'empresa');
  const currentRole = user?.profile?.toUpperCase();
  const isSuperAdmin = currentRole === 'DEV';
  
  const stats = useQuery(() => api.platform.stats(), []);
  const companies = useQuery(() => api.platform.listCompanies(), []);
  const plans = useQuery(() => api.platform.listPlans(), []);
  
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingCompany, setEditingCompany] = useState<PlatformCompany | null>(null);

  const toggleActive = useMutation(
    ({ id, status, suspensionReason }: { id: string; status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'; suspensionReason?: string | null }) =>
      api.platform.updateCompany(id, { status, suspensionReason }),
    { onSuccess: () => { companies.refetch(); stats.refetch(); } },
  );

  const remove = useMutation((id: string) => api.platform.deleteCompany(id), {
    onSuccess: () => { companies.refetch(); stats.refetch(); },
  });

  const purge = useMutation((id: string) => api.platform.purgeCompany(id), {
    onSuccess: () => { companies.refetch(); stats.refetch(); },
  });


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
    const normalized = reason.trim() === 'solicitacao_voluntaria' ? 'solicitacao_voluntaria' : reason.trim() === 'não informado' ? 'não informado' : 'inadimplencia';
    await toggleActive.mutate({ id: c.id, status: 'SUSPENDED', suspensionReason: normalized }).catch(() => {});
  }

  async function handleDelete(c: PlatformCompany) {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Arquivar "${c.name}"? O acesso será bloqueado e o histórico será preservado.`)) return;
    await remove.mutate(c.id).catch(() => {});
  }

  async function handlePurge(c: PlatformCompany) {
    if (!isSuperAdmin) return;
    if (!window.confirm(`ATENÇÃO: Deletar definitivamente "${c.name}" e TODOS os dados associados (usuários, faturas, escalas)? Esta ação é IRREVERSÍVEL!`)) return;
    await purge.mutate(c.id).catch(() => {});
  }

  const filteredCompanies = useMemo(() => {
    if (!companies.data) return [];
    const term = search.toLowerCase();
    return companies.data.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.document && c.document.includes(term)) ||
      (c.id && c.id.includes(term))
    );
  }, [companies.data, search]);

  return (
    <div className="mx-auto w-full space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Empresas</h2>
          <p className="text-sm text-slate-500">Gerencie os clientes e licenças da plataforma.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-nubank">
          <Plus size={14} /> Nova empresa
        </button>
      </div>

      <PlatformStats />

      {(toggleActive.error || remove.error || purge.error) && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {toggleActive.error || remove.error || purge.error}
        </p>
      )}

      {companies.loading ? (
        <LoadingState label="Carregando empresas..." />
      ) : companies.error ? (
        <ErrorState message={companies.error} onRetry={companies.refetch} />
      ) : (companies.data ?? []).length === 0 ? (
        <EmptyState message="Nenhuma empresa cadastrada. Clique em Nova empresa." />
      ) : (
        <section className="rounded-2xl bg-white shadow-sm shadow-slate-900/5 border border-slate-200 pb-32">
          <div className="border-b border-slate-100 p-4 bg-slate-50 rounded-t-2xl">
            <div className="relative max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search size={14} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-[6px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500 bg-white"
              />
            </div>
          </div>
          <div className="p-0 min-h-[400px]">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider bg-white">
                  <th className="p-4 pl-5">Empresa</th>
                  <th className="p-4">CNPJ</th>
                  <th className="p-4">Usuários</th>
                  <th className="p-4">Funcionários</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">Financeiro</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredCompanies.map((c) => {
                  const status = c.status ?? (c.isActive ? 'ACTIVE' : 'SUSPENDED');
                  return (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 text-sm text-slate-700 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-5 font-medium text-slate-900">
                        <div className="flex flex-col">
                          <span>{normalizeDisplayName(c.name)}</span>
                          <span className="text-[10px] font-normal text-slate-400 mt-0.5">Criada em {formatDate(c.createdAt)}</span>
                        </div>
                      </td>
                      <td className="p-4">{c.document || '-'}</td>
                      <td className="p-4 text-slate-600">{c.usersCount} / {c.maxUsers}</td>
                      <td className="p-4 text-slate-600">{c.employeesCount} / {c.maxEmployees}</td>
                      <td className="p-4">
                        <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">{c.plan ?? 'FREE'}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.billingStatus === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : c.billingStatus === 'TRIAL' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                          {c.billingStatus ?? 'TRIAL'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                            {status === 'ACTIVE' ? 'Ativa' : status === 'CANCELLED' ? 'Cancelada' : 'Suspensa'}
                          </span>
                          {status !== 'ACTIVE' && c.suspensionReason && <p className="max-w-[150px] truncate text-[9px] text-slate-400">{c.suspensionReason}</p>}
                        </div>
                      </td>
                      <td className="p-4 pr-5 text-right">
                        <div className="flex justify-end">
                          <CompanyActionMenu 
                            company={c}
                            tenant={tenant}
                            isSuperAdmin={isSuperAdmin}
                            canManageUsers={canManageCompanyUsers(c)}
                            canManageLicenses={canManageLicenses(c)}
                            status={status}
                            onEdit={() => setEditingCompany(c)}
                            onToggleStatus={() => handleToggle(c)}
                            onDelete={() => handleDelete(c)}
                            onPurge={() => handlePurge(c)}
                            loadingToggle={toggleActive.loading}
                            loadingDelete={remove.loading}
                            loadingPurge={purge.loading}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-slate-500 bg-white">
                      Nenhuma empresa encontrada com o termo "{search}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <NewCompanyModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); companies.refetch(); stats.refetch(); }} />
      )}
      {editingCompany && (
        <CompanyEditModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onDone={() => {
            setEditingCompany(null);
            companies.refetch();
            stats.refetch();
            plans.refetch();
          }}
        />
      )}
    </div>
  );
}
