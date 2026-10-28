import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { createHash } from 'node:crypto';
import { isEmail, isUUID } from 'class-validator';
import { MailService } from '../../mail/mail.service';
import { escapeHtml } from '../../mail/mail-templates';

export interface EmailSendJob {
  companyId: string;
  email: string;
  subject: string;
  text: string;
  html?: string;
}

/** Only app notifications: providers/recipients are resolved by authorized producers, never a public relay endpoint. */
@Processor('email-send')
export class EmailSendWorker {
  constructor(private readonly mail: MailService) {}

  @Process({ concurrency: 2 })
  async handleEmailSend(job: Job<EmailSendJob>) {
    const data = job.data;
    if (!data || !isUUID(data.companyId) || !isEmail(data.email) || typeof data.subject !== 'string' || !data.subject.trim() || data.subject.length > 200 || typeof data.text !== 'string' || data.text.length > 100_000 || (data.html !== undefined && (typeof data.html !== 'string' || data.html.length > 200_000))) {
      job.discard();
      throw new Error('EMAIL_INVALID_JOB');
    }
    // Resend remembers this key for 24h. Old/replayed jobs require reconciliation before sending again.
    if (!job.id || !Number.isFinite(job.timestamp) || Date.now() - job.timestamp > 23 * 60 * 60 * 1000) {
      job.discard();
      throw new Error('EMAIL_RECONCILIATION_REQUIRED');
    }
    const idempotencyKey = `innovation-email/${createHash('sha256').update(`${data.companyId}/${job.id}`).digest('hex')}`;
    const result = await this.mail.send(data.email, {
      subject: data.subject,
      text: data.text,
      html: data.html ?? `<pre>${escapeHtml(data.text)}</pre>`,
    }, { idempotencyKey });
    if (!result.sent) {
      // Generic SMTP/SES has no demonstrated idempotency guarantee for this adapter.
      if (result.provider !== 'resend') job.discard();
      throw new Error(`EMAIL_NOT_ACCEPTED:${result.provider}`);
    }
    // Acceptance is not delivery. Provider delivery/bounce webhooks remain a separate integration.
    return { accepted: true, provider: result.provider, messageId: result.messageId ?? null };
  }
}
