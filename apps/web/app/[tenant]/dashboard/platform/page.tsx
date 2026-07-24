'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type PlatformCompany } from '@/app/lib/api';
import { formatDate } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

import { NewCompanyModal } from './_components/new-company-modal';
import { CompanyUsersModal } from './_components/company-users-modal';
import { CompanyManageModal } from './_components/company-manage-modal';
import { PlatformStats } from './_components/platform-stats';
import { CompanyActionMenu } from './_components/company-action-menu';

export default function PlatformPage() {
  const { user } = useAuth();
  const tenant = user?.companyId || 'empresa';
  const currentRole = user?.profile?.toUpperCase();
  const isSuperAdmin = currentRole === 'DEV';
  
  const stats = useQuery(() => api.platform.stats(), []);
  const companies = useQuery(() => api.platform.listCompanies(), []);
  
  const [open, setOpen] = useState(false);
  const [usersCompany, setUsersCompany] = useState<PlatformCompany | null>(null);
  const [licenseCompany, setLicenseCompany] = useState<PlatformCompany | null>(null);
  const [search, setSearch] = useState('');

  const toggleActive = useMutation(
    ({ id, status, suspensionReason }: { id: string; status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'; suspensionReason?: string | null }) =>
      api.platform.updateCompany(id, { status, suspensionReason }),
    { onSuccess: () => { companies.refetch(); stats.refetch(); } },
  );

  const remove = useMutation((id: string) => api.platform.deleteCompany(id), {
    onSuccess: () => { companies.refetch(); stats.refetch(); },
  });

  const updateLicense = useMutation(
    ({ id, ...payload }: any) =>
      api.platform.updateCompany(id, payload),
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
    if (!window.confirm(`Arquivar "${c.name}"? O acesso será bloqueado e o histórico será preservado.`)) return;
    await remove.mutate(c.id).catch(() => {});
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
        <h2 className="text-lg font-bold text-slate-900">Visão Geral e Empresas</h2>
        <button onClick={() => setOpen(true)} className="btn-nubank">
          <Plus size={14} /> Nova empresa
        </button>
      </div>

      <PlatformStats />

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
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-slate-900/5">
          <div className="border-b border-slate-100 p-4">
            <div className="relative max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search size={14} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-[6px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto p-0 min-h-[400px]">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-500">
                  <th className="p-3 pl-5">Empresa</th>
                  <th className="p-3">CNPJ</th>
                  <th className="p-3">Usuários</th>
                  <th className="p-3">Funcionários</th>
                  <th className="p-3">Plano</th>
                  <th className="p-3">Financeiro</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c) => {
                  const status = c.status ?? (c.isActive ? 'ACTIVE' : 'SUSPENDED');
                  return (
                    <tr key={c.id} className="border-t border-slate-100 text-xs text-slate-700 hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 pl-5 font-medium text-slate-950">
                        <div className="flex flex-col">
                          <span>{normalizeDisplayName(c.name)}</span>
                          <span className="text-[10px] font-normal text-slate-400">Criada em {formatDate(c.createdAt)}</span>
                        </div>
                      </td>
                      <td className="p-3">{c.document || '-'}</td>
                      <td className="p-3">{c.usersCount} / {c.maxUsers}</td>
                      <td className="p-3">{c.employeesCount} / {c.maxEmployees}</td>
                      <td className="p-3">
                        <span className="inline-flex rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">{c.plan ?? 'FREE'}</span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.billingStatus === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : c.billingStatus === 'TRIAL' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                          {c.billingStatus ?? 'TRIAL'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                            {status === 'ACTIVE' ? 'Ativa' : status === 'CANCELLED' ? 'Cancelada' : 'Suspensa'}
                          </span>
                          {status !== 'ACTIVE' && c.suspensionReason && <p className="max-w-[150px] truncate text-[9px] text-slate-400">{c.suspensionReason}</p>}
                        </div>
                      </td>
                      <td className="p-3 pr-5 text-right">
                        <div className="flex justify-end">
                          <CompanyActionMenu 
                            company={c}
                            tenant={tenant}
                            isSuperAdmin={isSuperAdmin}
                            canManageUsers={canManageCompanyUsers(c)}
                            canManageLicenses={canManageLicenses(c)}
                            status={status}
                            onManageUsers={() => setUsersCompany(c)}
                            onManageLicense={() => setLicenseCompany(c)}
                            onToggleStatus={() => handleToggle(c)}
                            onDelete={() => handleDelete(c)}
                            loadingToggle={toggleActive.loading}
                            loadingDelete={remove.loading}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-slate-500">
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
      {usersCompany && (
        <CompanyUsersModal company={usersCompany} onClose={() => setUsersCompany(null)} />
      )}
      {licenseCompany && (
        <CompanyManageModal
          company={licenseCompany}
          onClose={() => setLicenseCompany(null)}
          onSave={(data) => {
            const { plan: selectedPlanId, name, document: cnpj, ...rest } = data;
            updateLicense.mutate({ id: licenseCompany.id, name, document: cnpj, platformPlanId: selectedPlanId, ...rest }).catch(() => {});
          }}
          loading={updateLicense.loading}
          error={updateLicense.error}
        />
      )}
    </div>
  );
}
