import { Counter, Gauge } from 'prom-client';

// Metricas de negocio usadas pelos alertas em infra/alerts.yml
export const loginFailures = new Counter({ name: 'auth_login_failures_total', help: 'Logins recusados' });
export const webhookFailures = new Counter({ name: 'webhook_failures_total', help: 'Webhooks que falharam', labelNames: ['provider'] });
export const cronLastSuccess = new Gauge({ name: 'cron_last_success_timestamp_seconds', help: 'Ultima execucao bem sucedida do cron', labelNames: ['job'] });

export function cronHeartbeat(job: string) {
  cronLastSuccess.set({ job }, Date.now() / 1000);
}