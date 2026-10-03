'use client';

import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { NewCompanyModal } from '../_components/new-company-modal';
import { BILLING_STATUS, COMPANY_STATUS, date } from './format';

export function CompaniesView({ onOpenCompany }: { onOpenCompany: (id: string, name?: string) => void }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const list = useQuery(() => api.platform.listCompanies({ page, limit: 15, search: debounced || undefined }), [page, debounced]);
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-3 text-fg-sub" aria-hidden="true" />
          <input className="input-v2 !pl-10 w-full text-base sm:text-sm" placeholder="Buscar por nome, CNPJ ou slug" aria-label="Buscar empresas" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Button onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> Nova empresa</Button>
      </div>

      {list.error && <ErrorState message={list.error} onRetry={list.refetch} />}
      {list.loading && !list.data ? <LoadingState label="Carregando empresas…" /> : (list.data?.data.length ?? 0) === 0 ? <EmptyState message="Nenhuma empresa encontrada." /> : (
        <div className="card-v2 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Empresas da plataforma</caption>
            <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Empresa', 'Plano', 'Situação', 'Cobrança', 'Usuários', 'Funcionários', 'Desde'].map((label) => <th key={label} scope="col" className="px-3 py-2.5 font-medium">{label}</th>)}</tr></thead>
            <tbody>
              {list.data?.data.map((company) => {
                const status = COMPANY_STATUS[company.status] ?? { label: company.status, tone: 'bg-zinc-100' };
                const billing = BILLING_STATUS[company.billingStatus ?? ''] ?? { label: company.billingStatus ?? '—', tone: 'bg-zinc-100' };
                return (
                  <tr key={company.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-sub" onClick={() => onOpenCompany(company.id, company.name)}>
                    <th scope="row" className="px-3 py-2.5 text-left font-medium">{company.name}<span className="block text-xs font-normal text-fg-sub">{company.document}</span></th>
                    <td className="px-3 py-2.5">{company.plan ?? '—'}</td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.tone}`}>{status.label}</span></td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${billing.tone}`}>{billing.label}</span></td>
                    <td className="px-3 py-2.5 tabular-nums">{company.usersCount}{company.maxUsers ? ` / ${company.maxUsers}` : ''}</td>
                    <td className="px-3 py-2.5 tabular-nums">{company.employeesCount}{company.maxEmployees ? ` / ${company.maxEmployees}` : ''}</td>
                    <td className="px-3 py-2.5 text-fg-sub">{date(company.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-between text-sm"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page} de {pages} · {total} empresas</span><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</Button></nav>
      )}
      {creating && <NewCompanyModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); list.refetch(); }} />}
    </div>
  );
}
