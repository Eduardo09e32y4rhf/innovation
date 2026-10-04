import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { MailContent } from './mail-templates';

export interface MailResult { sent: boolean; provider: 'smtp' | 'resend' | 'none'; error?: string }

/**
 * Envio de e-mail transacional. Provedores (o primeiro configurado vence):
 *  - Resend:  RESEND_API_KEY + MAIL_FROM
 *  - SMTP:    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (+ SMTP_SECURE=true para 465) + MAIL_FROM
 * Nunca lança erro para quem chama: falha de e-mail não pode derrubar login, cadastro ou recuperação.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  provider(): 'smtp' | 'resend' | 'none' {
    if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) return 'resend';
    if (process.env.SMTP_HOST && process.env.MAIL_FROM) return 'smtp';
    return 'none';
  }

  isConfigured() {
    return this.provider() !== 'none';
  }

  async send(to: string, content: MailContent): Promise<MailResult> {
    const provider = this.provider();
    if (provider === 'none') {
      this.logger.warn(`E-mail NÃO enviado (nenhum provedor configurado): "${content.subject}" → ${this.mask(to)}`);
      return { sent: false, provider };
    }
    try {
      if (provider === 'resend') await this.viaResend(to, content);
      else await this.viaSmtp(to, content);
      this.logger.log(`E-mail enviado (${provider}): "${content.subject}" → ${this.mask(to)}`);
      return { sent: true, provider };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha ao enviar e-mail (${provider}) para ${this.mask(to)}: ${message}`);
      return { sent: false, provider, error: message };
    }
  }

  private async viaResend(to: string, content: MailContent) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject: content.subject, html: content.html, text: content.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  private async viaSmtp(to: string, content: MailContent) {
    this.transporter ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: String(process.env.SMTP_SECURE ?? '').toLowerCase() === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 8000,
      socketTimeout: 12000,
    });
    await this.transporter.sendMail({ from: process.env.MAIL_FROM, to, subject: content.subject, html: content.html, text: content.text });
  }

  /** a***@dominio.com: logs não guardam o endereço inteiro. */
  private mask(email: string) {
    const [user, domain] = email.split('@');
    return `${(user ?? '').slice(0, 1)}***@${domain ?? ''}`;
  }
}
