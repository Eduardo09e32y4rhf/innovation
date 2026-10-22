'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { featureAllowed } from '@/app/lib/feature-flags';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { DataTable, type Column } from '../../../_components/data-table';
import { StateBlock } from '../../../_components/page-shell';
import { date, money } from '../../../_hub/format';
import { platformLinks } from '../../../_lib/platform-links';

type Contract = { id: string; status: string; agreedAmount: number | string; startsAt: string; endsAt?: string | null; documentUrl?: string | null; externalContractNumber?: string | null };

const STATUS: Record<string, string> = { ACTIVE: 'Ativo', ENDED: 'Encerrado', CANCELED: 'Cancelado' };

const columns: Column<Contract>[] = [
  { key: 'number', label: 'Contrato', cell: (c) => c.externalContractNumber || c.id.slice(0, 8) },
  { key: 'status', label: 'Situação', cell: (c) => STATUS[c.status] ?? c.status },
  { key: 'amount', label: 'Valor combinado', cell: (c) => money(c.agreedAmount) },
  { key: 'period', label: 'Vigência', cell: (c) => `${date(c.startsAt)} a ${c.endsAt ? date(c.endsAt) : 'sem fim'}` },
  { key: 'doc', label: 'Documento', right: true, cell: (c) => (c.documentUrl ? <a href={c.documentUrl} target="_blank" rel="noreferrer" className="font-semibold underline">Abrir</a> : '—') },
];

/** Documentos: contratos da empresa. O atalho de gerenciar só aparece com o módulo de contratos ligado. */
export function TabDocumentos({ companyId }: { companyId: string }) {
  const { tenant = '' } = useParams<{ tenant: string }>();
  const contracts = useQuery(() => api.platform.listManualContracts({ companyId }) as Promise<Contract[]>, [companyId]);
  return (
    <div className="space-y-3">
      {featureAllowed('manual-contracts') && <div className="flex justify-end"><Link href={platformLinks(tenant).contratos(companyId)} className="btn btn-outline min-h-11 text-sm">Gerenciar contratos</Link></div>}
      <StateBlock loading={contracts.loading && !contracts.data} error={contracts.error} empty={!contracts.data?.length} emptyText="Nenhum contrato ou documento registrado." loadingLabel="Carregando documentos…" onRetry={contracts.refetch}>
        <DataTable caption="Contratos da empresa" columns={columns} rows={contracts.data ?? []} rowKey={(c) => c.id} />
      </StateBlock>
    </div>
  );
}
