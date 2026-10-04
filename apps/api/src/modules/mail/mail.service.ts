import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { createHash, createHmac } from 'node:crypto';
import type { MailContent } from './mail-templates';

export interface MailResult { sent: boolean; provider: 'smtp' | 'resend' | 'ses' | 'none'; error?: string }

/**
 * Envio de e-mail transacional. Provedores (o primeiro configurado vence):
 *  - Resend:  RESEND_API_KEY + MAIL_FROM
 *  - SES:     AWS_SES_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY + MAIL_FROM
 *  - SMTP:    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (+ SMTP_SECURE=true para 465) + MAIL_FROM
 * Nunca lança erro para quem chama: falha de e-mail não pode derrubar login, cadastro ou recuperação.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  provider(): 'smtp' | 'resend' | 'ses' | 'none' {
    if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) return 'resend';
    if (process.env.AWS_SES_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.MAIL_FROM) return 'ses';
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
      else if (provider === 'ses') await this.viaSes(to, content);
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

  private async viaSes(to: string, content: MailContent) {
    const region = process.env.AWS_SES_REGION!;
    const host = `email.${region}.amazonaws.com`;
    const path = '/v2/email/outbound-emails';
    const body = JSON.stringify({
      FromEmailAddress: process.env.MAIL_FROM,
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: content.subject, Charset: 'UTF-8' }, Body: { Text: { Data: content.text, Charset: 'UTF-8' }, Html: { Data: content.html, Charset: 'UTF-8' } } } },
    });
    const payloadHash = createHash('sha256').update(body).digest('hex');
    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', 'Z');
    const dateStamp = amzDate.slice(0, 8);
    const token = process.env.AWS_SESSION_TOKEN;
    const headers: Record<string, string> = { host, 'content-type': 'application/json', 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
    if (token) headers['x-amz-security-token'] = token;
    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers).sort().map((key) => `${key}:${headers[key].trim()}\n`).join('');
    const canonicalRequest = ['POST', path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${dateStamp}/${region}/ses/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${createHash('sha256').update(canonicalRequest).digest('hex')}`;
    const kDate = createHmac('sha256', `AWS4${process.env.AWS_SECRET_ACCESS_KEY}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(region).digest();
    const kService = createHmac('sha256', kRegion).update('ses').digest();
    const signingKey = createHmac('sha256', kService).update('aws4_request').digest();
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const response = await fetch(`https://${host}${path}`, { method: 'POST', headers: { ...headers, Authorization: authorization }, body, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`SES ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  /** a***@dominio.com: logs não guardam o endereço inteiro. */
  private mask(email: string) {
    const [user, domain] = email.split('@');
    return `${(user ?? '').slice(0, 1)}***@${domain ?? ''}`;
  }
}
