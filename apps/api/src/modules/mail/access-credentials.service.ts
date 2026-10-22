import { Injectable, Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { welcomeAccessEmail } from './mail-templates';

export interface SendAccessInput {
  to: string;
  name: string;
  companyName?: string | null;
  temporaryPassword: string;
  expiresAt: Date;
  /** true quando e uma nova senha provisoria para quem ja tinha acesso. */
  reissued?: boolean;
}

/** Acesso criado dentro de uma transacao: o e-mail so sai DEPOIS do commit (E/S externa nunca roda dentro da transacao). */
export interface PendingAccessEmail {
  to: string;
  name: string;
  temporaryPassword: string;
  expiresAt: Date;
}

/**
 * Entrega do acesso inicial. A senha provisoria sai da plataforma SOMENTE por aqui (e-mail do proprio usuario):
 * nunca volta em resposta de API nem fica visivel em tela. Nao lanca erro: se o e-mail falhar, o cadastro continua e
 * o chamador devolve `emailSent: false` para a tela oferecer "Reenviar acesso" (gera outra senha provisoria).
 */
@Injectable()
export class AccessCredentialsService {
  private readonly logger = new Logger(AccessCredentialsService.name);

  constructor(private readonly mail: MailService) {}

  loginUrl() {
    const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    return `${base}/login`;
  }

  /** Envia os acessos acumulados durante uma transacao ja concluida. Devolve o resultado na mesma ordem. */
  async sendPending(companyName: string | null, pending: PendingAccessEmail[]): Promise<boolean[]> {
    const results: boolean[] = [];
    for (const item of pending) results.push((await this.sendAccess({ ...item, companyName })).emailSent);
    return results;
  }

  async sendAccess(input: SendAccessInput): Promise<{ emailSent: boolean }> {
    const to = input.to?.trim();
    if (!to || !to.includes('@')) {
      this.logger.warn('Acesso nao enviado: usuario sem e-mail valido.');
      return { emailSent: false };
    }
    const result = await this.mail.send(to, welcomeAccessEmail({
      name: input.name, companyName: input.companyName, email: to, temporaryPassword: input.temporaryPassword,
      loginUrl: this.loginUrl(), expiresAt: input.expiresAt, reissued: input.reissued,
    }));
    return { emailSent: result.sent };
  }
}
