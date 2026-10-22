import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

/**
 * Estado efêmero de segurança (anti-replay de TOTP, contagem de tentativas).
 * Usa Redis para valer entre instâncias; sem Redis cai para memória do processo (melhor que nada).
 */
@Injectable()
export class SecurityStore {
  private readonly memory = new Map<string, { value: number; expiresAt: number }>();

  constructor(private readonly redis: RedisService) {}

  private live() {
    return this.redis.getStatus() ? this.redis.getClient() : null;
  }

  private sweep(now: number) {
    if (this.memory.size < 5000) return;
    for (const [key, entry] of this.memory) if (entry.expiresAt <= now) this.memory.delete(key);
  }

  /** Marca a chave como usada. Devolve false se já tinha sido usada dentro do TTL (replay). */
  async claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
    const client = this.live();
    if (client) {
      try {
        return (await client.set(`sec:${key}`, '1', 'EX', ttlSeconds, 'NX')) === 'OK';
      } catch { /* cai para memória */ }
    }
    const now = Date.now();
    this.sweep(now);
    const current = this.memory.get(key);
    if (current && current.expiresAt > now) return false;
    this.memory.set(key, { value: 1, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  /** Soma 1 ao contador (janela fixa a partir do primeiro hit) e devolve o total. */
  async hit(key: string, ttlSeconds: number): Promise<number> {
    const client = this.live();
    if (client) {
      try {
        const total = await client.incr(`sec:${key}`);
        if (total === 1) await client.expire(`sec:${key}`, ttlSeconds);
        return total;
      } catch { /* cai para memória */ }
    }
    const now = Date.now();
    this.sweep(now);
    const current = this.memory.get(key);
    if (!current || current.expiresAt <= now) {
      this.memory.set(key, { value: 1, expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }
    current.value += 1;
    return current.value;
  }

  async reset(key: string): Promise<void> {
    this.memory.delete(key);
    const client = this.live();
    if (client) {
      try { await client.del(`sec:${key}`); } catch { /* ignora */ }
    }
  }
}
