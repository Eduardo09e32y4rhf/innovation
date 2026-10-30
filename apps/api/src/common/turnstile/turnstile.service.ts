import { outboundFetch } from '../http/outbound';
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;
/** Erros de configuracao (segredo errado): nao e culpa do usuario, entao nao bloqueia ninguem. */
const CONFIG_ERRORS = new Set(['missing-input-secret', 'invalid-input-secret', 'internal-error']);

export type TurnstileFailMode = 'open' | 'closed';

/**
 * SEG-10. TURNSTILE_FAIL_MODE=open|closed manda. Sem ele: `closed` so em producao com chave secreta E
 * TURNSTILE_ENFORCE=true; nos demais casos `open` (dev e producao que ainda nao optou).
 */
export function turnstileFailMode(): TurnstileFailMode {
  const explicit = process.env.TURNSTILE_FAIL_MODE?.trim().toLowerCase();
  if (explicit === 'open' || explicit === 'closed') return explicit;
  const strict = process.env.NODE_ENV === 'production' && Boolean(process.env.TURNSTILE_SECRET_KEY?.trim()) && process.env.TURNSTILE_ENFORCE === 'true';
  return strict ? 'closed' : 'open';
}

const UNAVAILABLE = 'Verificação anti-robô indisponível no momento. Tente novamente em instantes.';

/**
 * Valida o token do Cloudflare Turnstile. DESLIGADO por padrao: so ativa com TURNSTILE_SECRET_KEY.
 * Falha de rede/timeout/erro da Cloudflare ou segredo invalido: modo `open` (padrao) segue com alerta de erro no log;
 * modo `closed` responde 503 (ver turnstileFailMode e docs/TURNSTILE.md).
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
      if (!res.ok) return this.unavailable(`Cloudflare respondeu HTTP ${res.status}`);
      result = (await res.json()) as typeof result;
    } catch (error) {
      return this.unavailable(`falha ao falar com a Cloudflare (${error instanceof Error ? error.message : 'erro'})`);
    }

    if (result?.success === true) return;
    const codes = result?.['error-codes'] ?? [];
    if (codes.some((code) => CONFIG_ERRORS.has(code))) {
      return this.unavailable(`mal configurado (${codes.join(', ')}); revise TURNSTILE_SECRET_KEY`);
    }
    throw new BadRequestException('Não foi possível validar a verificação anti-robô. Atualize a página e tente novamente.');
  }

  /** Alerta (nivel error) em todo caso; em modo closed bloqueia com 503, em open deixa passar. */
  private unavailable(reason: string): void {
    if (turnstileFailMode() === 'closed') {
      this.logger.error(`Turnstile: ${reason}; modo closed, requisicao recusada (503).`);
      throw new ServiceUnavailableException(UNAVAILABLE);
    }
    this.logger.error(`Turnstile: ${reason}; modo open, seguindo sem validar.`);
  }
}
