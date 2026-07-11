import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

@Processor('email-send')
export class EmailSendWorker {
  private readonly logger = new Logger(EmailSendWorker.name);

  @Process()
  async handleEmailSend(job: Job<{ email: string; subject: string; text: string }>) {
    this.logger.log(`Sending email to ${job.data.email}`);
    // Future implementation
    return { success: true };
  }
}
