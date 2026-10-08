'use client';

import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { ErrorState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { dateTime, errorText } from '../platform/_hub/format';

/** Eventos do provedor de pagamento (Asaas): falhas podem ser reprocessadas pelo DEV. */
export default function Integration({ companyId, canRetry }: { companyId?: string; canRetry: boolean }) {
  const events = useQuery(() => api.platform.finance.webhookEvents({ companyId, limit: 15 }), [companyId]);
  const fiscal = useQuery(() => api.faturas.fiscalStatus(), []);
  if (events.error) return <ErrorState message={events.error} onRetry={events.refetch} />;
  const rows = events.data ?? [];
  const nf = fiscal.data;
  return (
    <details className="card-v2 p-4">
      <summary className="cursor-pointer text-sm font-semibold">Integração de pagamentos ({rows.filter((row) => row.status === 'FAILED').length} com falha)</summary>
      {nf && (
        <div className={`mt-3 rounded-xl border p-3 text-sm ${nf.enabled && nf.account.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          <p className="font-semibold">Nota fiscal automática (Asaas): {nf.enabled ? 'ligada' : 'desligada'}</p>
          {nf.missing.length > 0 && <p className="mt-1 break-words text-xs">Falta no servidor: {nf.missing.join(', ')}</p>}
          <p className="mt-1 text-xs">{nf.account.message}</p>
        </div>
      )}
      <ul className="mt-3 divide-y divide-border text-sm">
        {rows.map((event) => (
          <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0"><span className="font-medium">{event.eventType}</span> <span className="text-fg-sub">· {event.company?.name ?? 'sem empresa'} · {dateTime(event.createdAt)}</span>{event.errorMessage && <span className="block truncate text-xs text-rose-700">{event.errorMessage}</span>}</span>
            <span className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs ${event.status === 'FAILED' ? 'bg-rose-50 text-rose-700' : event.status === 'PROCESSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>{event.status}</span>
              {canRetry && event.status === 'FAILED' && <Button size="sm" variant="outline" onClick={async () => { try { await api.platform.finance.retryWebhookEvent(event.id); toast.success('Evento reenviado para processamento.'); events.refetch(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível reprocessar.')); } }}>Reprocessar</Button>}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="py-3 text-fg-sub">Nenhum evento recente.</li>}
      </ul>
    </details>
  );
}
