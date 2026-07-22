import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../../database/prisma.service';
import { WhatsappProvider } from '../../communication/whatsapp/whatsapp.provider';

type WhatsappJob = {
  companyId?: string;
  sessionKey?: string;
  recipientCompanyId?: string;
  phone: string;
  message: string;
  notificationLogId?: string;
  mediaUrl?: string;
  mimeType?: string;
  name?: string;
};

@Processor('whatsapp-send')
export class WhatsappSendWorker {
  private readonly logger = new Logger(WhatsappSendWorker.name);

  constructor(
    private readonly whatsappProvider: WhatsappProvider,
    private readonly prisma: PrismaService,
  ) {}

  @Process()
  async handleWhatsappSend(job: Job<WhatsappJob>) {
    const sessionToUse = job.data.sessionKey || job.data.companyId;
    if (!sessionToUse) throw new Error('Missing sessionKey or companyId for WhatsApp sending');
    try {
      const media = job.data.mediaUrl && job.data.mimeType ? {
        base64: job.data.mediaUrl,
        mimeType: job.data.mimeType,
        name: job.data.name,
      } : undefined;
      await this.whatsappProvider.sendMessage(sessionToUse, job.data.phone, job.data.message, media);
      if (job.data.notificationLogId) {
        await this.prisma.financeNotificationLog.update({
          where: { id: job.data.notificationLogId },
          data: { status: 'SENT', sentAt: new Date(), errorMessage: null },
        }).catch(() => undefined);
      }
      this.logger.log(`WhatsApp enviado para ${job.data.phone}`);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (job.data.notificationLogId) {
        await this.prisma.financeNotificationLog.update({
          where: { id: job.data.notificationLogId },
          data: { status: 'FAILED', errorMessage: message.slice(0, 2000) },
        }).catch(() => undefined);
      }
      this.logger.error(`Falha no WhatsApp (tentativa ${job.attemptsMade + 1}): ${message}`);
      throw error;
    }
  }
}
