import { outboundFetch } from '../http/outbound';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;
/** Erros de configuracao (segredo errado): nao e culpa do usuario, entao nao bloqueia ninguem. */
const CONFIG_ERRORS = new Set(['missing-input-secret', 'invalid-input-secret', 'internal-error']);

/**
 * Valida o token do Cloudflare Turnstile. DESLIGADO por padrao: so ativa com TURNSTILE_SECRET_KEY.
 * Falha de rede/timeout/erro da Cloudflare = fail-open (log de aviso) para nunca travar o login de clientes.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  isEnabled(): boolean {
    return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
  }

  async verify(token: string | undefined, remoteIp?: string): Promise<void> {
    if (!this.isEnabled()) return;
    const response = typeof token === 'string' ? token.trim() : '';
    if (!response) throw new BadRequestException('Confirme que você não é um robô e tente novamente.');
    if (response.length > 2048) throw new BadRequestException('Verificação anti-robô inválida. Atualize a página e tente novamente.');

    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!.trim(), response });
    if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp);

    let result: { success?: boolean; 'error-codes'?: string[] };
    try {
      const res = await outboundFetch(TURNSTILE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      }, { timeoutMs: TIMEOUT_MS });
      if (!res.ok) {
        this.logger.warn(`Turnstile: Cloudflare respondeu HTTP ${res.status}; seguindo sem validar (fail-open).`);
        return;
      }
      result = (await res.json()) as typeof result;
    } catch (error) {
      this.logger.warn(`Turnstile: falha ao falar com a Cloudflare (${error instanceof Error ? error.message : 'erro'}); seguindo sem validar (fail-open).`);
      return;
    }

    if (result?.success === true) return;
    const codes = result?.['error-codes'] ?? [];
    if (codes.some((code) => CONFIG_ERRORS.has(code))) {
      this.logger.error(`Turnstile mal configurado (${codes.join(', ')}); seguindo sem validar. Revise TURNSTILE_SECRET_KEY.`);
      return;
    }
    throw new BadRequestException('Não foi possível validar a verificação anti-robô. Atualize a página e tente novamente.');
  }
}
