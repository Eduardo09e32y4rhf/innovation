import { vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CronLock, CronLockOptions, setCronLockRedis } from './cron-lock.decorator';

/** Redis falso com a semântica de SET NX: um mapa compartilhado entre "instâncias". */
function fakeRedis(shared = new Set<string>()) {
  return {
    shared,
    acquireLock: vi.fn(async (key: string) => (shared.has(key) ? false : (shared.add(key), true))),
    releaseLock: vi.fn(async (key: string) => { shared.delete(key); }),
  } as any;
}

/** Aplica o decorator sem a sintaxe @ (o transformador do Vitest do projeto não a compila em specs). */
function makeJob(name: string, ttl: number, work: () => Promise<unknown>, options?: CronLockOptions) {
  class Job {
    redis?: any;
    constructor(redis?: any) { if (redis) this.redis = redis; }
    async run() { return work(); }
  }
  const descriptor = Object.getOwnPropertyDescriptor(Job.prototype, 'run')!;
  CronLock(name, ttl, options)(Job.prototype, 'run', descriptor);
  Object.defineProperty(Job.prototype, 'run', descriptor);
  return Job;
}

describe('CronLock: 2 instâncias, 1 execução', () => {
  afterEach(() => setCronLockRedis(undefined));

  it('duas instâncias disparando juntas: o job roda uma vez', async () => {
    const lock = new Set<string>();
    const work = vi.fn(async () => { await new Promise((r) => setTimeout(r, 10)); return 'ok'; });
    const Job = makeJob('t.job', 60, work);
    const results = await Promise.all([new Job(fakeRedis(lock)).run(), new Job(fakeRedis(lock)).run()]);
    expect(work).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r === 'ok')).toHaveLength(1);
  });

  it('10 instâncias ao mesmo tempo: ainda uma execução', async () => {
    const lock = new Set<string>();
    const work = vi.fn(async () => 'ok');
    const Job = makeJob('t.ten', 60, work);
    await Promise.all(Array.from({ length: 10 }, () => new Job(fakeRedis(lock)).run()));
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('o lock não é liberado no sucesso: um disparo atrasado da outra instância não repete o job', async () => {
    const lock = new Set<string>();
    const work = vi.fn(async () => 'ok');
    const Job = makeJob('t.late', 60, work);
    await new Job(fakeRedis(lock)).run();
    await new Job(fakeRedis(lock)).run();
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('classe SEM a propriedade redis usa o RedisService registrado no boot (antes o lock era ignorado)', async () => {
    const lock = new Set<string>();
    setCronLockRedis(fakeRedis(lock));
    const work = vi.fn(async () => 'ok');
    const Job = makeJob('t.noprop', 60, work);
    await Promise.all([new Job().run(), new Job().run()]);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('sem Redis registrado nem injetado o job roda (não trava a operação)', async () => {
    const work = vi.fn(async () => 'ok');
    const Job = makeJob('t.none', 60, work);
    await new Job().run();
    expect(work).toHaveBeenCalledTimes(1);
  });
});

describe('CronLock: falha, retry com backoff e liberação', () => {
  it('falha duas vezes e na terceira funciona: 3 chamadas, lock liberado a cada falha', async () => {
    const redis = fakeRedis();
    const work = vi.fn().mockRejectedValueOnce(new Error('asaas fora')).mockRejectedValueOnce(new Error('asaas fora')).mockResolvedValue('ok');
    const Job = makeJob('t.retry', 60, work, { retries: 2, backoffMs: 1 });
    await expect(new Job(redis).run()).resolves.toBe('ok');
    expect(work).toHaveBeenCalledTimes(3);
    expect(redis.releaseLock).toHaveBeenCalledTimes(2);
  });

  it('esgota as tentativas: propaga o erro e deixa o lock livre para o próximo disparo', async () => {
    const redis = fakeRedis();
    const work = vi.fn().mockRejectedValue(new Error('banco fora'));
    const Job = makeJob('t.exhaust', 60, work, { retries: 1, backoffMs: 1 });
    await expect(new Job(redis).run()).rejects.toThrow('banco fora');
    expect(work).toHaveBeenCalledTimes(2);
    expect(redis.shared.has('cron:t.exhaust')).toBe(false);
  });

  it('o backoff dobra a cada falha (100 ms, 200 ms)', async () => {
    const waits: number[] = [];
    const original = global.setTimeout;
    vi.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => { waits.push(Number(ms)); return original(fn, 0); }) as any);
    const work = vi.fn().mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('x')).mockResolvedValue('ok');
    const Job = makeJob('t.backoff', 60, work, { retries: 2, backoffMs: 100 });
    await new Job(fakeRedis()).run();
    vi.restoreAllMocks();
    expect(waits.filter((ms) => ms === 100 || ms === 200)).toEqual([100, 200]);
  });

  it('retries padrão é 0: erro sobe na primeira falha, como antes', async () => {
    const work = vi.fn().mockRejectedValue(new Error('boom'));
    const Job = makeJob('t.default', 60, work);
    await expect(new Job(fakeRedis()).run()).rejects.toThrow('boom');
    expect(work).toHaveBeenCalledTimes(1);
  });
});

describe('guarda de regressão: todo @Cron tem @CronLock', () => {
  const root = join(__dirname, '..', '..');
  const files: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.ts') && !full.endsWith('.spec.ts') && !full.endsWith('cron-lock.decorator.ts')) files.push(full);
    }
  })(root);

  it('nenhum cron roda sem lock distribuído', () => {
    const missing: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const crons = text.match(/@Cron\(/g)?.length ?? 0;
      const locked = text.match(/@Cron\([^\n]*\)\s*\n\s*@CronLock\(/g)?.length ?? 0;
      if (crons !== locked) missing.push(`${file.replace(root, 'src')}: ${crons} @Cron, ${locked} com @CronLock`);
    }
    expect(missing).toEqual([]);
  });

  it('nenhum @Interval/@Timeout/setInterval solto nos serviços (rodariam em todas as instâncias)', () => {
    const loose: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (/@Interval\(|@Timeout\(|setInterval\(/.test(text)) loose.push(file.replace(root, 'src'));
    }
    expect(loose).toEqual([]);
  });
});
