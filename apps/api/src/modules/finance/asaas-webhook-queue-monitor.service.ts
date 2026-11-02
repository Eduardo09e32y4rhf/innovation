import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { cronHeartbeat } from '../../common/metrics/app-metrics';
import { PrismaService } from '../../database/prisma.service';
import { asaasPendingOldest, asaasQueueAlerts } from './asaas-webhook-metrics';

/**
 * PAG-07: o Asaas pausa a fila de webhook apos falhas seguidas (VIA BUSCA: docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook).
 * Sem consultar a API do Asaas (semantica de GET /webhooks nao confirmada), vigia a nossa tabela:
 *  - webhook PENDING ha mais de N minutos (fila nossa parada);
 *  - nenhuma entrega do Asaas ha mais de X horas (fila do Asaas possivelmente pausada).
 * Limiares: ASAAS_WEBHOOK_PENDING_MAX_MINUTES (padrao 30), ASAAS_WEBHOOK_SILENCE_MAX_HOURS (padrao 24).
 */
@Injectable()
export class AsaasWebhookQueueMonitorService {
  private readonly logger = new Logger(AsaasWebhookQueueMonitorService.name);
  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/15 * * * *')
  @CronLock('billing.monitorAsaasWebhookQueue', 600)
  async run() {
    await this.check();
    cronHeartbeat('asaas_webhook_queue_monitor');
  }

  async check(now: Date = new Date()) {
    const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
    const pendingMin = num(process.env.ASAAS_WEBHOOK_PENDING_MAX_MINUTES, 30);
    const silenceH = num(process.env.ASAAS_WEBHOOK_SILENCE_MAX_HOURS, 24);
    const alerts: string[] = [];

    const oldest = await this.prisma.asaasWebhookEvent.findFirst({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } });
    const pendingAgeMs = oldest ? now.getTime() - oldest.createdAt.getTime() : 0;
    asaasPendingOldest.set(pendingAgeMs / 1000);
    if (oldest && pendingAgeMs > pendingMin * 60_000) {
      const pending = await this.prisma.asaasWebhookEvent.count({ where: { status: 'PENDING' } });
      this.logger.error(`OPERATIONAL_ALERT ${JSON.stringify({ condition: 'asaas_webhook_pending_stuck', pending, oldestMinutes: Math.round(pendingAgeMs / 60_000), thresholdMinutes: pendingMin })}`);
      asaasQueueAlerts.inc({ condition: 'pending_stuck' });
      alerts.push('pending_stuck');
    }

    const last = await this.prisma.asaasWebhookEvent.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    if (last && now.getTime() - last.createdAt.getTime() > silenceH * 3_600_000) {
      this.logger.error(`OPERATIONAL_ALERT ${JSON.stringify({ condition: 'asaas_webhook_silent', lastDeliveryAt: last.createdAt.toISOString(), thresholdHours: silenceH })}`);
      asaasQueueAlerts.inc({ condition: 'silent' });
      alerts.push('silent');
    }
    return alerts;
  }
}
