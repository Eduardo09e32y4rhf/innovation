'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformInvoice } from '@/app/lib/api';
import { hasPermission } from '@/app/lib/permissions';
import CompanyFicha from '../../../financeiro/_views/_ficha';
import { DataTable, type Column } from '../../../_components/data-table';
import { StateBlock } from '../../../_components/page-shell';
import { INVOICE_STATUS, date, money } from '../../../_hub/format';
import { platformHub } from '../../../_hub/hub-api';
import { toFaturasRow } from './tab-assinatura';

const columns: Column<PlatformInvoice>[] = [
  { key: 'description', label: 'Descrição', cell: (i) => i.description || 'Cobrança' },
  { key: 'amount', label: 'Valor', cell: (i) => money(i.amount) },
  { key: 'due', label: 'Vencimento', cell: (i) => date(i.dueDate) },
  { key: 'status', label: 'Situação', cell: (i) => INVOICE_STATUS[i.status]?.label ?? i.status },
  { key: 'link', label: 'Link', right: true, cell: (i) => (i.invoiceUrl ? <a href={i.invoiceUrl} target="_blank" rel="noreferrer" className="font-semibold underline">Abrir</a> : '—') },
];

/** Consulta de faturas para quem não tem a visão de todas as empresas (ex.: Comercial). */
function InvoicesReadOnly({ companyId }: { companyId: string }) {
  const invoices = useQuery(() => api.platform.finance.listCompany(companyId), [companyId]);
  return (
    <StateBlock loading={invoices.loading && !invoices.data} error={invoices.error} empty={!invoices.data?.length} emptyText="Nenhuma fatura." loadingLabel="Carregando faturas…" onRetry={invoices.refetch}>
      <DataTable caption="Faturas da empresa" columns={columns} rows={invoices.data ?? []} rowKey={(i) => i.id} />
    </StateBlock>
  );
}

function InvoicesWithActions({ companyId }: { companyId: string }) {
  const overview = useQuery(() => platformHub.overview(companyId), [companyId]);
  const company = overview.data?.scope === 'COMPANY' ? overview.data.company : undefined;
  return (
    <StateBlock loading={overview.loading && !overview.data} error={overview.error} empty={!company} emptyText="Sem dados desta empresa." loadingLabel="Carregando faturas…" onRetry={overview.refetch}>
      {company && <CompanyFicha company={toFaturasRow(company)} part="faturas" onChanged={overview.refetch} />}
    </StateBlock>
  );
}

/** Faturas: lista completa com ações para quem tem a permissão de Faturas de todas as empresas; os demais só consultam. */
export function TabFaturas({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  return hasPermission(user, 'faturas.todas_empresas') ? <InvoicesWithActions companyId={companyId} /> : <InvoicesReadOnly companyId={companyId} />;
}
