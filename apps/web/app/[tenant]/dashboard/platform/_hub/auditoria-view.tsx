'use client';

import { Download } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { request, type PlatformBillingAuditLog } from '@/app/lib/api';
import { FilterBar, SearchBox, SelectFilter } from '../clientes/_components/filter-bar';
import { StateBlock } from '../_components/page-shell';
import { useUrlFilters } from '../_components/use-url-filters';
import { AuditTable } from './auditoria/audit-table';
import { describeLog, exportCsv, formatActor, formatIp, isMobile, translateAction } from './auditoria/model';
import { comoLista } from './lista';

type CompanyRef = { id: string; name: string };

/**
 * Auditoria de uma empresa. Com `companyId` (ficha do cliente) a empresa é fixa;
 * sem ele (área Sistema) a pessoa escolhe a empresa e a escolha fica na URL (`?empresa=`).
 */
export function AuditoriaView({ companyId: fixedCompanyId }: { companyId?: string }) {
  const filters = useUrlFilters();
  const companyId = fixedCompanyId ?? filters.get('empresa');
  const q = filters.get('q').toLowerCase();
  const type = filters.get('evento');

  const companies = useQuery(() => request<unknown>('/platform/companies?limit=200').then((res) => comoLista<CompanyRef>(res)), [], { enabled: !fixedCompanyId });
  const logs = useQuery(async () => {
    const res = await request<unknown>(`/platform/companies/${companyId}/audit-logs?limit=100`);
    return comoLista<PlatformBillingAuditLog>(res).filter((log) => typeof log?.action === 'string');
  }, [companyId], { enabled: Boolean(companyId) });

  const all = logs.data ?? [];
  const visible = useMemo(() => all.filter((log) => {
    if (type && log.action !== type) return false;
    if (!q) return true;
    return [describeLog(log), log.action, log.entity, formatActor(log), formatIp(log.ipAddress), log.userAgent].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
  }), [all, q, type]);
  const actions = useMemo(() => Array.from(new Set(all.map((log) => log.action))).sort(), [all]);
  const summary = useMemo(() => ({
    failures: all.filter((log) => log.action.includes('FAILED')).length,
    passwords: all.filter((log) => log.action.includes('PASSWORD')).length,
    mobile: all.filter((log) => isMobile(log.userAgent)).length,
    last: all[0]?.createdAt ? new Date(all[0].createdAt).toLocaleString('pt-BR') : 'Sem registros',
  }), [all]);

  return (
    <div className="space-y-4">
      <FilterBar>
        {!fixedCompanyId && (
          <SelectFilter label="Empresa" value={companyId} onChange={(value) => filters.set({ empresa: value, evento: null })}
            options={[['', 'Selecione uma empresa'], ...(companies.data ?? []).map((c): [string, string] => [c.id, c.name])]} />
        )}
        <SearchBox label="Buscar nos eventos" placeholder="Nome, evento, IP ou dispositivo" value={filters.get('q')} onChange={(value) => filters.set({ q: value })} />
        <SelectFilter label="Tipo de evento" value={type} onChange={(value) => filters.set({ evento: value })} options={[['', 'Todos os eventos'], ...actions.map((a): [string, string] => [a, translateAction(a)])]} />
        {all.length > 0 && <Button variant="outline" className="sm:ml-auto" onClick={() => exportCsv(visible)}><Download size={15} aria-hidden="true" /> Exportar CSV</Button>}
      </FilterBar>
      {companies.error && !fixedCompanyId && <p role="alert" className="text-sm text-rose-600">{companies.error}</p>}
      {!companyId ? <p className="card-v2 p-6 text-center text-sm text-fg-sub">Selecione uma empresa para ver a auditoria.</p> : (
        <StateBlock loading={logs.loading && !logs.data} error={logs.error} empty={visible.length === 0} emptyText="Nenhum evento para os filtros escolhidos." loadingLabel="Carregando eventos…" onRetry={logs.refetch}>
          <p className="text-sm text-fg-sub">{visible.length} de {all.length} evento(s) · {summary.failures} falha(s) · {summary.passwords} troca(s) de senha · {summary.mobile} pelo celular · último: {summary.last}</p>
          <AuditTable logs={visible} page={filters.page} onPage={(page) => filters.set({ page })} />
        </StateBlock>
      )}
    </div>
  );
}
