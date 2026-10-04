import { describe, expect, it } from 'vitest';
import { dunningConfigFromEnv, dunningStage } from './dunning';

const cfg = { warnDay: 3, blockDay: 5, cancelDay: 30 };

describe('regua de inadimplencia', () => {
  it('percorre lembrete, aviso, bloqueio e cancelamento', () => {
    expect([0, 1, 3, 5, 29, 30, 90].map((d) => dunningStage(d, cfg))).toEqual(['NONE', 'REMINDER', 'WARNING', 'BLOCK', 'BLOCK', 'CANCEL', 'CANCEL']);
  });
  it('normaliza configuracao fora de ordem', () => {
    const c = dunningConfigFromEnv({ DUNNING_WARN_DAY: '9', DUNNING_BLOCK_DAY: '5', DUNNING_CANCEL_DAY: '2' } as any);
    expect(c.warnDay).toBeLessThan(c.blockDay);
    expect(c.cancelDay).toBeGreaterThan(c.blockDay);
  });
});