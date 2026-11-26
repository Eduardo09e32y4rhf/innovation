import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { EmailRecipientStatus } from '@prisma/client';
import { outboundFetch } from '../../common/http/outbound';
import { PrismaService } from '../../database/prisma.service';
import { escapeHtml } from '../mail/mail-templates';

@Injectable()
@Processor('commercial-email')
export class CommercialEmailProcessor {
  private readonly logger = new Logger(CommercialEmailProcessor.name);
  constructor(private readonly prisma: PrismaService) {}

  @Process('send-commercial-email')
  async send(job: Job<{ recipientId: string; rawToken?: string }>) {
    const recipient = await this.prisma.emailRecipient.findUnique({ where: { id: job.data.recipientId }, include: { campaign: true } });
    if (!recipient || recipient.status !== EmailRecipientStatus.QUEUED) return;
    const origin = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://innovationia.com.br').replace(/\/$/, '');
    const trialUrl = job.data.rawToken ? `${origin}/teste/${encodeURIComponent(job.data.rawToken)}` : origin;
    const unsubscribeUrl = `${origin}/api/commercial/email/unsubscribe?e=${encodeURIComponent(recipient.email)}`;
    const text = recipient.campaign.bodyText.replace(/\{\s*Nome\s*\}/gi, recipient.name || 'Cliente').replace(/\{\s*Link(?:\s+de\s+)?Teste\s*\}/gi, trialUrl);
    const safeBody = escapeHtml(recipient.campaign.bodyText)
      .replace(/\{\s*Nome\s*\}/gi, escapeHtml(recipient.name || 'Cliente'))
      .replace(/\{\s*Link(?:\s+de\s+)?Teste\s*\}/gi, `<a href="${escapeHtml(trialUrl)}">${escapeHtml(trialUrl)}</a>`)
      .replace(/\r?\n/g, '<br>');
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.6">${safeBody}<hr><small>Innovation S A · <a href="${escapeHtml(unsubscribeUrl)}">Descadastrar</a></small></div>`;
    try {
      if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) throw new Error('RESEND_API_KEY e MAIL_FROM precisam estar configurados para campanhas.');
      const response = await outboundFetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `campaign-${recipient.campaignId}-recipient-${recipient.id}` }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [recipient.email], subject: recipient.campaign.subject, html, text: `${text}\n\nDescadastrar: ${unsubscribeUrl}` }) }, { timeoutMs: 12_000 });
      const result: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Resend ${response.status}: ${String(result.message ?? 'falha no envio').slice(0, 240)}`);
      const now = new Date();
      await this.prisma.emailRecipient.update({ where: { id: recipient.id }, data: { status: EmailRecipientStatus.SENT, resendEmailId: result.id ?? null, sentAt: now } });
      if (recipient.campaign.type === 'TRIAL_INVITE') await this.prisma.trialInvite.upsert({ where: { email: recipient.email }, update: { lastInviteSentAt: now }, create: { email: recipient.email, lastInviteSentAt: now } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const maxAttempts = Number(job.opts.attempts ?? 1);
      if (job.attemptsMade + 1 >= maxAttempts) await this.prisma.emailRecipient.update({ where: { id: recipient.id }, data: { status: EmailRecipientStatus.FAILED, error: message.slice(0, 500) } });
      this.logger.error(`Falha no envio do convite ${recipient.id}: ${message}`);
      throw error;
    }
  }
}
