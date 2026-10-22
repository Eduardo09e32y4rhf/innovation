'use client';

import { DataTable, Pager, type Column } from '../../_components/data-table';
import type { PlatformBillingAuditLog } from '@/app/lib/api';
import { describeLog, formatActor, formatIp, isMobile } from './model';

export const AUDIT_PAGE_SIZE = 50;

const tone = (action: string) => (action.includes('FAILED') ? 'bg-rose-50 text-rose-700' : action.includes('PASSWORD') ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700');

const columns: Column<PlatformBillingAuditLog>[] = [
  { key: 'date', label: 'Data', className: 'whitespace-nowrap', cell: (log) => new Date(log.createdAt).toLocaleString('pt-BR') },
  { key: 'event', label: 'Evento', cell: (log) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone(log.action)}`}>{describeLog(log)}</span> },
  { key: 'actor', label: 'Ator', cell: (log) => <span className="font-semibold">{formatActor(log)}</span> },
  { key: 'entity', label: 'Entidade', cell: (log) => log.entity || '—' },
  { key: 'ip', label: 'IP', cell: (log) => formatIp(log.ipAddress) },
  { key: 'device', label: 'Dispositivo', cell: (log) => (isMobile(log.userAgent) ? 'Celular' : 'Computador') },
];

/** Linha do tempo paginada (tabela no computador, cartões no celular). */
export function AuditTable({ logs, page, onPage }: { logs: PlatformBillingAuditLog[]; page: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(logs.length / AUDIT_PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = logs.slice((current - 1) * AUDIT_PAGE_SIZE, current * AUDIT_PAGE_SIZE);
  return (
    <div className="space-y-3">
      <DataTable caption="Eventos de auditoria" columns={columns} rows={slice} rowKey={(log) => log.id} />
      <Pager page={current} pages={pages} total={logs.length} onPage={onPage} />
    </div>
  );
}
