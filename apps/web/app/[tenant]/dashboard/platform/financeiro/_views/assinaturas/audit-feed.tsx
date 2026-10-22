'use client';

import type { PlatformBillingAuditLog } from '@/app/lib/api';
import { auditTone, dateLabel, formatAction } from './subscription-model';

const KEYS = ['name', 'nextPlanName', 'amount', 'nextSeatQuantity', 'previousStatus', 'nextStatus', 'paymentUrlCreated'];

function summaryOf(log: PlatformBillingAuditLog): string {
  const metadata = (log.metadata || {}) as Record<string, unknown>;
  return KEYS.filter((key) => key in metadata).map((key) => `${key}: ${String(metadata[key])}`).join(' · ');
}

/** Últimos eventos de assinatura (quem criou, quem alterou, o que mudou). */
export function AuditFeed({ logs }: { logs: PlatformBillingAuditLog[] }) {
  return (
    <section className="card-v2 h-fit p-4" aria-label="Auditoria das assinaturas">
      <h3 className="text-sm font-bold text-fg">Auditoria recente</h3>
      <p className="text-xs text-fg-sub">Quem criou, quem alterou e o que mudou em cada assinatura.</p>
      {logs.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-center text-xs text-fg-sub">Nenhum evento de assinatura encontrado ainda.</p> : (
        <ul className="mt-3 space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${auditTone(log.action)}`}>{formatAction(log.action)}</span>
                <span className="text-xs text-fg-mut">{dateLabel(log.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-fg">{log.company?.name || 'Empresa removida'}</p>
              <p className="text-xs text-fg-sub">{summaryOf(log) || 'Evento financeiro registrado.'} · {log.user?.name || log.user?.email || 'Sistema'}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
