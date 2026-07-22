import { Body, Controller, ForbiddenException, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { SkipThrottle } from '@nestjs/throttler';
import type { Queue } from 'bull';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';

interface AsaasWebhookPayload {
  id?: string;
  event?: string;
  payment?: { id?: string };
  invoice?: { id?: string };
}

@SkipThrottle()
@Controller('finance/webhook')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('asaas-webhook') private readonly webhookQueue: Queue,
  ) {}

  @Post('asaas')
  @HttpCode(200)
  async handleAsaasWebhook(
    @Headers('asaas-access-token') accessToken: string | undefined,
    @Body() payload: AsaasWebhookPayload,
  ) {
    this.validateToken(accessToken);
    const eventType = payload?.event;
    if (!eventType) return { received: true, ignored: true };

    const asaasEventId = payload.id || `${eventType}:${payload.payment?.id || payload.invoice?.id || 'unknown'}`;
    let stored = await this.prisma.asaasWebhookEvent.findUnique({ where: { asaasEventId } });

    if (!stored) {
      try {
        stored = await this.prisma.asaasWebhookEvent.create({
          data: { asaasEventId, eventType, payload: payload as any, status: 'PENDING' },
        });
      } catch {
        stored = await this.prisma.asaasWebhookEvent.findUnique({ where: { asaasEventId } });
      }
    }

    if (!stored) {
      throw new Error('Não foi possível persistir o evento Asaas.');
    }

    if (['PENDING', 'PROCESSING', 'PROCESSED', 'IGNORED'].includes(stored.status)) {
      if (stored.status === 'PENDING') await this.enqueue(stored.id);
      return { received: true, duplicate: stored.attempts > 0, queued: true };
    }

    await this.prisma.asaasWebhookEvent.update({
      where: { id: stored.id },
      data: { status: 'PENDING', errorMessage: null },
    });
    await this.enqueue(stored.id);
    return { received: true, retried: true, queued: true };
  }

  private async enqueue(eventId: string) {
    try {
      await this.webhookQueue.add(
        'process',
        { eventId },
        {
          jobId: eventId,
          attempts: 5,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: 500,
          removeOnFail: 1_000,
        },
      );
    } catch (error) {
      await this.prisma.asaasWebhookEvent.update({
        where: { id: eventId },
        data: { status: 'FAILED', errorMessage: String(error).slice(0, 2000) },
      }).catch(() => undefined);
      throw error;
    }
  }

  private validateToken(accessToken?: string) {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_SECRET;
    if (!expected) {
      this.logger.warn('ASAAS_WEBHOOK_TOKEN/ASAAS_WEBHOOK_SECRET não configurado.');
      if (process.env.NODE_ENV === 'production') throw new ForbiddenException('Webhook não configurado.');
      return;
    }
    if (!accessToken || !this.secureEqual(accessToken, expected)) {
      throw new ForbiddenException('Token de webhook inválido.');
    }
  }

  private secureEqual(received: string, expected: string) {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  }
}
