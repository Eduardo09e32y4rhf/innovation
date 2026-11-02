import { Counter, Gauge, register } from 'prom-client';

function counter(name: string, help: string, labelNames: string[]) {
  return (register.getSingleMetric(name) as Counter<string>) ?? new Counter({ name, help, labelNames });
}
function gauge(name: string, help: string) {
  return (register.getSingleMetric(name) as Gauge<string>) ?? new Gauge({ name, help });
}

/** Eventos do Asaas sem tratamento (PAG-07): registrados em log e contados, sem mudar estado de fatura. */
export const asaasUnhandledEvents = counter('asaas_webhook_unhandled_events_total', 'Eventos do Asaas sem tratamento especifico', ['event']);
export const asaasQueueAlerts = counter('asaas_webhook_queue_alerts_total', 'Alertas do verificador da fila de webhook do Asaas', ['condition']);
export const asaasPendingOldest = gauge('asaas_webhook_pending_oldest_age_seconds', 'Idade do webhook PENDING mais antigo');
