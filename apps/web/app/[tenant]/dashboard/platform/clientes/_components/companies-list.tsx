'use client';

import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformCompany } from '@/app/lib/api';
import { CompanyActionMenu } from '../../_components/company-action-menu';
import { CompanyEditModal } from '../../_components/company-edit-modal';
import { NewCompanyModal } from '../../_components/new-company-modal';
import { DataTable, Pager, type Column } from '../../_components/data-table';
import { StateBlock } from '../../_components/page-shell';
import { useUrlFilters } from '../../_components/use-url-filters';
import { BILLING_STATUS, COMPANY_STATUS, date } from '../../_hub/format';
import { platformLinks } from '../../_lib/platform-links';
import { FilterBar, SearchBox, SelectFilter } from './filter-bar';
import { useCompanyActions } from './use-company-actions';

const PAGE_SIZE = 12;
const STATUS_OPTIONS: Array<[string, string]> = [['', 'Todas as situações'], ['ACTIVE', 'Ativas'], ['SUSPENDED', 'Suspensas'], ['CANCELLED', 'Canceladas']];
const BILLING_OPTIONS: Array<[string, string]> = [['', 'Qualquer cobrança'], ['PENDING_PAYMENT', 'Aguardando pagamento'], ['PAST_DUE', 'Inadimplentes'], ['TRIAL', 'Em teste'], ['ACTIVE', 'Em dia'], ['CANCELED', 'Canceladas']];

function Chip({ map, value }: { map: Record<string, { label: string; tone: string }>; value?: string | null }) {
  const item = map[value ?? ''] ?? { label: value ?? '—', tone: 'bg-zinc-100 text-zinc-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.tone}`}>{item.label}</span>;
}

const usage = (used: number, max?: number | null) => `${used}${max ? ` / ${max}` : ''}`;

/** Lista de empresas: busca, situação, cobrança e página ficam na URL. Clicar na linha abre a ficha. */
export function CompaniesList() {
  const { user } = useAuth();
  const router = useRouter();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const filters = useUrlFilters();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlatformCompany | null>(null);
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const isSuperAdmin = role === 'DEV';
  const q = filters.get('q');
  const status = filters.get('situacao');
  const billing = filters.get('cobranca');
  const page = filters.page;
  const list = useQuery(() => api.platform.listCompanies({ page, limit: PAGE_SIZE, search: q || undefined, status: status || undefined, billingStatus: billing || undefined }), [page, q, status, billing]);
  const actions = useCompanyActions(isSuperAdmin, list.refetch);
  // Comercial só gere usuários e licenças da própria carteira (a API também valida).
  const owns = (company: PlatformCompany) => isSuperAdmin || (role === 'COMERCIAL' && company.commercialOwnerId === user?.id);
  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;
  const open = (company: PlatformCompany) => router.push(platformLinks(tenant).ficha(company.id));

  const columns: Column<PlatformCompany>[] = [
    { key: 'name', label: 'Empresa', cell: (c) => <><p className="font-semibold">{c.name}</p><p className="text-xs text-fg-sub">{c.document || 'Sem documento'}</p></> },
    { key: 'status', label: 'Situação', cell: (c) => <Chip map={COMPANY_STATUS} value={c.status} /> },
    { key: 'billing', label: 'Cobrança', cell: (c) => <Chip map={BILLING_STATUS} value={c.billingStatus} /> },
    { key: 'plan', label: 'Plano', cell: (c) => c.plan ?? '—' },
    { key: 'users', label: 'Usuários', cell: (c) => usage(c.usersCount, c.maxUsers) },
    { key: 'employees', label: 'Funcionários', cell: (c) => usage(c.employeesCount, c.maxEmployees) },
    { key: 'since', label: 'Desde', cell: (c) => date(c.createdAt) },
    { key: 'actions', label: 'Ações', right: true, cell: (c) => (
      <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <CompanyActionMenu company={c} tenant={tenant} isSuperAdmin={isSuperAdmin} canManageUsers={owns(c)} canManageLicenses={owns(c)}
          status={c.status ?? (c.isActive ? 'ACTIVE' : 'SUSPENDED')} onEdit={() => setEditing(c)} onToggleStatus={() => actions.toggleStatus(c)} onDelete={() => actions.archive(c)} onPurge={() => actions.destroy(c)}
          loadingToggle={actions.loading.toggle} loadingDelete={actions.loading.remove} loadingPurge={actions.loading.purge} />
      </span>
    ) },
  ];

  return (
    <div className="space-y-4">
      <FilterBar>
        <SearchBox label="Buscar empresas" placeholder="Buscar por nome ou CNPJ" value={q} onChange={(value) => filters.set({ q: value })} />
        <SelectFilter label="Situação da empresa" value={status} options={STATUS_OPTIONS} onChange={(value) => filters.set({ situacao: value })} />
        <SelectFilter label="Situação da cobrança" value={billing} options={BILLING_OPTIONS} onChange={(value) => filters.set({ cobranca: value })} />
        {isSuperAdmin || role === 'CEO' || role === 'COMERCIAL' ? <Button className="sm:ml-auto" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> Nova empresa</Button> : null}
      </FilterBar>
      <StateBlock loading={list.loading && !list.data} error={list.error} empty={rows.length === 0} emptyText="Nenhuma empresa encontrada com esses filtros." loadingLabel="Carregando empresas…" onRetry={list.refetch}>
        <DataTable caption="Empresas clientes" columns={columns} rows={rows} rowKey={(c) => c.id} onRowClick={open} />
        <Pager page={page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} onPage={(next) => filters.set({ page: next })} />
      </StateBlock>
      {creating && <NewCompanyModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); list.refetch(); }} />}
      {editing && <CompanyEditModal company={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); list.refetch(); }} />}
    </div>
  );
}
