import { setCronLockRedis } from '../../common/redis/cron-lock.decorator';
import { beforeEach } from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromotionsService } from './promotions.service';

function service(applied: number) {
  const instance: any = Object.create(PromotionsService.prototype);
  instance.applyDue = vi.fn().mockResolvedValue(applied);
  instance.logger = { log: vi.fn(), error: vi.fn() };
  return instance as PromotionsService & { applyDue: ReturnType<typeof vi.fn> };
}

afterEach(() => { delete process.env.FEATURE_PROMOTIONS; });

describe('tarefa diaria de promocoes', () => {
  it('com o modulo congelado (padrao) nao aplica nada', async () => {
    const svc = service(3);
    await svc.dailyJob();
    expect(svc.applyDue).not.toHaveBeenCalled();
  });

  it('com a flag ligada aplica as promocoes vencidas', async () => {
    process.env.FEATURE_PROMOTIONS = 'true';
    const svc = service(3);
    await svc.dailyJob();
    expect(svc.applyDue).toHaveBeenCalledTimes(1);
  });
});

// Domain tests explicitly supply successful coordination; outage behavior is covered by cron-lock.spec.ts.
beforeEach(() => setCronLockRedis({ acquireLock: vi.fn(async () => 'test-acquisition'), releaseLock: vi.fn(async () => undefined) } as never));
