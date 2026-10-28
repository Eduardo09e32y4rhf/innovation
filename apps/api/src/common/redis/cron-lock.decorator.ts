import { Logger } from '@nestjs/common';
import type { RedisService } from './redis.service';

let sharedRedis: RedisService | undefined;

/** Registrado pelo RedisService ao iniciar: o lock vale mesmo em classes que não injetam `redis`. */
export function setCronLockRedis(redis: RedisService | undefined): void {
  sharedRedis = redis;
}

export interface CronLockOptions {
  /** Novas tentativas se o job lançar erro (0 = nenhuma). Entre elas o lock é liberado. */
  retries?: number;
  /** Espera inicial entre tentativas; dobra a cada falha. */
  backoffMs?: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Evita que varias instancias da API executem o mesmo cron ao mesmo tempo.
 * Use ABAIXO de @Cron. Usa `this.redis` se a classe tiver, senao o RedisService registrado no boot.
 * O lock NAO e liberado ao terminar com sucesso: expira pelo TTL, para que uma instancia que dispare
 * poucos segundos depois nao reexecute o job. Use ttlSeconds menor que o intervalo do cron.
 * Se o job falhar, o lock e liberado (outra instancia ou a proxima tentativa pode rodar) e, com `retries`, repete com backoff.
 * Sem coordenação disponível o job é adiado para o próximo disparo, sem executar efeitos concorrentes.
 */
export function CronLock(name: string, ttlSeconds: number, options: CronLockOptions = {}): MethodDecorator {
  const { retries = 0, backoffMs = 1000 } = options;
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (this: { redis?: RedisService }, ...args: unknown[]) {
      const redis = this.redis ?? sharedRedis;
      if (!redis) {
        new Logger('CronLock').warn(`Cron ${name} adiado: Redis não registrado.`);
        return;
      }
      const acquire = async () => {
        try { return await redis.acquireLock(`cron:${name}`, ttlSeconds); }
        catch {
          new Logger('CronLock').warn(`Cron ${name} adiado: coordenação indisponível.`);
          return null;
        }
      };
      let token = await acquire();
      if (!token) {
        new Logger('CronLock').log(`Cron ${name} sem lock adquirido; disparo ignorado.`);
        return;
      }
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await original.apply(this, args);
        } catch (error) {
          await redis.releaseLock(`cron:${name}`, token).catch(() => undefined);
          if (attempt >= retries) throw error;
          const wait = backoffMs * 2 ** attempt;
          new Logger('CronLock').warn(`Cron ${name} falhou (${error instanceof Error ? error.message : String(error)}); nova tentativa ${attempt + 1}/${retries} em ${wait}ms.`);
          await sleep(wait);
          token = await acquire();
          if (!token) return;
        }
      }
    };
  };
}
