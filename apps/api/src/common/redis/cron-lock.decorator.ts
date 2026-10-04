import { Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Evita que varias instancias da API executem o mesmo cron ao mesmo tempo.
 * Use ABAIXO de @Cron e injete `redis: RedisService` na classe.
 * O lock NAO e liberado ao terminar: expira pelo TTL, para que uma instancia que dispare
 * poucos segundos depois nao reexecute o job. Use ttlSeconds menor que o intervalo do cron.
 * Sem Redis conectado o job roda normalmente (o mesmo fallback do RedisService).
 */
export function CronLock(name: string, ttlSeconds: number): MethodDecorator {
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (this: { redis?: RedisService }, ...args: unknown[]) {
      const redis = this.redis;
      if (redis && !(await redis.acquireLock(`cron:${name}`, ttlSeconds))) {
        new Logger('CronLock').log(`Cron ${name} ja em execucao em outra instancia; ignorado.`);
        return;
      }
      return original.apply(this, args);
    };
  };
}