import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

@Processor('whatsapp-send')
export class WhatsappSendWorker {
  private readonly logger = new Logger(WhatsappSendWorker.name);

  @Process()
  async handleWhatsappSend(job: Job<{ phone: string; message: string; mediaUrl?: string }>) {
    this.logger.log(`Sending WhatsApp message to ${job.data.phone}`);
    // Future implementation
    return { success: true };
  }
}
