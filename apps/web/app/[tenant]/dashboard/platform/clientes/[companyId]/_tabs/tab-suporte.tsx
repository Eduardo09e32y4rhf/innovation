'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { DataTable, type Column } from '../../../_components/data-table';
import { StateBlock } from '../../../_components/page-shell';
import { dateTime } from '../../../_hub/format';
import { platformLinks } from '../../../_lib/platform-links';

type Ticket = { id: string; ticketNumber?: string; title: string; status: string; priority: string; createdAt: string };

const columns: Column<Ticket>[] = [
  { key: 'number', label: 'Chamado', cell: (t) => t.ticketNumber ?? t.id.slice(0, 8) },
  { key: 'title', label: 'Assunto', cell: (t) => <span className="font-semibold">{t.title}</span> },
  { key: 'status', label: 'Situação', cell: (t) => t.status },
  { key: 'priority', label: 'Prioridade', cell: (t) => t.priority },
  { key: 'created', label: 'Aberto em', cell: (t) => dateTime(t.createdAt) },
];

/** Suporte: chamados desta empresa. O atendimento em si acontece na área Suporte. */
export function TabSuporte({ companyId, canOpenQueue }: { companyId: string; canOpenQueue: boolean }) {
  const { tenant = '' } = useParams<{ tenant: string }>();
  const tickets = useQuery(() => api.platformSupport.list({ companyId }) as Promise<Ticket[]>, [companyId]);
  return (
    <div className="space-y-3">
      {canOpenQueue && <div className="flex justify-end"><Link href={platformLinks(tenant).suporte(companyId)} className="btn btn-outline min-h-11 text-sm">Abrir na fila de suporte</Link></div>}
      <StateBlock loading={tickets.loading && !tickets.data} error={tickets.error} empty={!tickets.data?.length} emptyText="Nenhum chamado desta empresa." loadingLabel="Carregando chamados…" onRetry={tickets.refetch}>
        <DataTable caption="Chamados da empresa" columns={columns} rows={tickets.data ?? []} rowKey={(t) => t.id} />
      </StateBlock>
    </div>
  );
}
