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
  const health = useQuery(() => api.faturas.providerHealth(), []);
  if (events.error) return <ErrorState message={events.error} onRetry={events.refetch} />;
  const rows = events.data ?? [];
  const nf = fiscal.data;
  const names = { ASAAS: 'Asaas', MERCADOPAGO: 'Mercado Pago' } as const;
  const modes: Record<string, string> = { sandbox: 'teste', production: 'produção', unconfigured: 'sem chave' };
  async function choose(provider: 'ASAAS' | 'MERCADOPAGO') {
    try { await api.faturas.setProvider(provider); toast.success(`${names[provider]} agora é o provedor de cobrança.`); health.refetch(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível trocar o provedor.')); }
  }
  return (
    <details className="card-v2 p-4">
      <summary className="cursor-pointer text-sm font-semibold">Integração de pagamentos ({rows.filter((row) => row.status === 'FAILED').length} com falha)</summary>
      {health.data && (
        <div className="mt-3 rounded-xl border border-line p-3 text-sm">
          <p className="font-semibold">Provedor de cobrança ativo: {names[health.data.active]}</p>
          <p className="mt-1 text-xs text-fg-sub">Faturas novas usam o provedor ativo. Faturas já criadas no outro provedor continuam nele (cancele e gere de novo para mudar).</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['ASAAS', 'MERCADOPAGO'] as const).map((key) => {
              const info = health.data!.providers[key];
              const active = health.data!.active === key;
              return (
                <div key={key} className="min-w-0 flex-1 basis-[200px] rounded-lg border border-line p-2">
                  <p className="font-medium">{names[key]} <span className="text-xs font-normal text-fg-sub">· {info.configured ? `chave ${modes[info.mode] ?? info.mode}` : 'sem chave'}{info.configured && !info.webhookSecret ? ' · falta token do webhook' : ''}</span></p>
                  {!info.configured && <p className="break-words text-xs text-amber-700">Falta: {info.requiredEnv.join(', ')}</p>}
                  {canRetry && <Button size="sm" variant={active ? 'outline' : 'primary'} disabled={active || !info.configured} onClick={() => void choose(key)}>{active ? 'Ativo' : `Usar ${names[key]}`}</Button>}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
