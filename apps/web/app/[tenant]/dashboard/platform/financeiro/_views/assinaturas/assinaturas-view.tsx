'use client';

import { RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { useState } from 'react';
import { Button } from '@/app/components/ui';
import { StateBlock } from '../../../_components/page-shell';
import { useUrlFilters } from '../../../_components/use-url-filters';
import { FilterBar, SearchBox, SelectFilter } from '../../../clientes/_components/filter-bar';
import { platformLinks } from '../../../_lib/platform-links';
import { AuditFeed } from './audit-feed';
import { SubscriptionDetail } from './subscription-detail';
import { SubscriptionList } from './subscription-list';
import { STATUS_FILTERS, money, type SubscriptionCompany } from './subscription-model';
import { useSubscriptions } from './use-subscriptions';

const Stat = ({ label, value }: { label: string; value: string | number }) => <article className="card-v2 p-4"><p className="text-xs text-fg-mut">{label}</p><p className="mt-1 text-2xl font-black tabular-nums text-fg">{value}</p></article>;

/** Assinaturas: busca e situação ficam na URL (`q`, `situacao`); detalhe abre em painel lateral. */
export function AssinaturasView({ params: { tenant } }: { params: { tenant: string } }) {
  const filters = useUrlFilters();
  const search = filters.get('q');
  const status = filters.get('situacao');
  const state = useSubscriptions(search, status);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const links = platformLinks(tenant);
  const selected = useMemo<SubscriptionCompany | null>(() => state.rows.find((c) => c.id === selectedId) ?? null, [state.rows, selectedId]);
  const options = STATUS_FILTERS.map((item): [string, string] => [item.value === 'ALL' ? '' : item.value, item.value === 'ALL' ? 'Todas as situações' : item.label]);

  return (
    <div className="space-y-4 p-3 sm:p-5 lg:p-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo das assinaturas">
        <Stat label="Receita mensal recorrente" value={state.summary ? money(state.summary.mrr) : '—'} />
        <Stat label="Assinaturas ativas" value={state.totals.active} />
        <Stat label="Primeiro pagamento pendente" value={state.totals.pending} />
        <Stat label="Inadimplentes" value={state.totals.overdue} />
      </section>
      <FilterBar>
        <SearchBox label="Buscar assinatura" placeholder="Empresa, plano ou situação" value={search} onChange={(value) => filters.set({ q: value })} />
        <SelectFilter label="Situação da assinatura" value={status} options={options} onChange={(value) => filters.set({ situacao: value })} />
        <Button variant="outline" className="sm:ml-auto" onClick={() => void state.load()} disabled={state.loading}><RefreshCw size={14} className={state.loading ? 'animate-spin' : ''} aria-hidden="true" /> Atualizar</Button>
      </FilterBar>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <StateBlock loading={state.loading && state.rows.length === 0} error={state.error} empty={state.rows.length === 0} emptyText="Nenhuma assinatura encontrada para os filtros escolhidos." loadingLabel="Carregando assinaturas…" onRetry={() => void state.load()}>
          <SubscriptionList rows={state.rows} planById={state.planById} fichaHref={(id) => links.ficha(id, 'assinatura')} onDetails={(c) => setSelectedId(c.id)} />
        </StateBlock>
        <AuditFeed logs={state.auditLogs} />
      </div>
      {selected && <SubscriptionDetail company={selected} plan={state.planById.get(selected.platformPlanId || '')} onClose={() => setSelectedId(null)} fichaHref={links.ficha(selected.id, 'assinatura')}
        faturasHref={links.ficha(selected.id, 'faturas')} canRunCheckout={state.canRunCheckout} working={state.workingId === selected.id} onCheckout={() => void state.runCheckout(selected)} />}
    </div>
  );
}
