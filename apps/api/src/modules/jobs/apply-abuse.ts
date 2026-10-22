import { HttpException, HttpStatus } from '@nestjs/common';
import type { RedisService } from '../../common/redis/redis.service';

/** Janela fixa com Redis (várias instâncias); se o Redis estiver fora, cai para memória do processo. */
export class ApplyLimiter {
  private readonly memory = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly redis?: Pick<RedisService, 'incr' | 'expire'>) {}

  async allow(key: string, limit: number, windowSec: number): Promise<boolean> {
    const shared = await this.redis?.incr(`apply:${key}`);
    if (shared && shared > 0) {
      if (shared === 1) await this.redis?.expire(`apply:${key}`, windowSec);
      return shared <= limit;
    }
    const now = Date.now();
    const slot = this.memory.get(key);
    if (!slot || slot.resetAt <= now) {
      if (this.memory.size > 10_000) for (const [k, v] of this.memory) if (v.resetAt <= now) this.memory.delete(k);
      this.memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
      return true;
    }
    slot.count += 1;
    return slot.count <= limit;
  }
}

export const APPLY_LIMITS = {
  perIp: { limit: 20, windowSec: 600 },
  perEmail: { limit: 10, windowSec: 3600 },
  perEmailJob: { limit: 3, windowSec: 3600 },
} as const;

/** Anti-spam da candidatura pública: IP, e-mail e e-mail+vaga. Lança 429 em pt-BR ao estourar qualquer limite. */
export async function assertApplyAllowed(limiter: ApplyLimiter, ip: string, jobId: string, email: unknown): Promise<void> {
  const normalized = String(email ?? '').trim().toLowerCase().slice(0, 200);
  const checks: Array<[string, { limit: number; windowSec: number }]> = [[`ip:${ip}`, APPLY_LIMITS.perIp]];
  if (normalized) {
    checks.push([`email:${normalized}`, APPLY_LIMITS.perEmail], [`email-job:${normalized}:${jobId}`, APPLY_LIMITS.perEmailJob]);
  }
  for (const [key, rule] of checks) {
    if (!(await limiter.allow(key, rule.limit, rule.windowSec))) {
      throw new HttpException('Muitas tentativas de candidatura. Aguarde alguns minutos e tente novamente.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
