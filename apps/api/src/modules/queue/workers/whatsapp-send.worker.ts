import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { WhatsappProvider } from '../../communication/whatsapp/whatsapp.provider';

@Processor('whatsapp-send')
export class WhatsappSendWorker {
  private readonly logger = new Logger(WhatsappSendWorker.name);

  constructor(private readonly whatsappProvider: WhatsappProvider) {}

  @Process()
  async handleWhatsappSend(job: Job<{ companyId: string; phone: string; message: string; mediaUrl?: string; mimeType?: string; name?: string }>) {
    this.logger.log(`Sending WhatsApp message to ${job.data.phone} for company ${job.data.companyId}`);
    try {
      const media = job.data.mediaUrl && job.data.mimeType ? {
        base64: job.data.mediaUrl, // assuming base64 or downloading before sending
        mimeType: job.data.mimeType,
        name: job.data.name
      } : undefined;

      await this.whatsappProvider.sendMessage(
        job.data.companyId,
        job.data.phone,
        job.data.message,
        media
      );
      
      this.logger.log(`Successfully sent WhatsApp message to ${job.data.phone}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      throw error;
    }
  }
}
