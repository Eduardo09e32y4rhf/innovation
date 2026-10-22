import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService, normalizePath, referrerHost } from './analytics.service';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function build(overrides: { duplicate?: boolean; seenToday?: boolean } = {}) {
  const findFirst = vi.fn()
    .mockResolvedValueOnce(overrides.duplicate ? { id: 'dup' } : null)
    .mockResolvedValueOnce(overrides.seenToday ? { id: 'seen' } : null);
  const create = vi.fn().mockResolvedValue({});
  const prisma: any = { siteVisit: { findFirst, create, updateMany: vi.fn().mockResolvedValue({ count: 3 }), deleteMany: vi.fn().mockResolvedValue({ count: 2 }) } };
  const geo: any = { lookup: vi.fn().mockResolvedValue({ country: 'BR', region: 'Sao Paulo', city: 'Santos' }), available: vi.fn().mockResolvedValue(true) };
  return { service: new AnalyticsService(prisma, geo), prisma, geo };
}

describe('normalizePath / referrerHost', () => {
  it('remove query, hash e barra final', () => {
    expect(normalizePath('/planos/?x=1#topo')).toBe('/planos');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/a'.repeat(200)).length).toBeLessThanOrEqual(200);
  });

  it('guarda so o host da origem', () => {
    expect(referrerHost('https://www.google.com/search?q=rh&x=1')).toBe('www.google.com');
    expect(referrerHost('instagram.com')).toBe('instagram.com');
    expect(referrerHost('')).toBeNull();
    expect(referrerHost(undefined)).toBeNull();
  });
});

describe('AnalyticsService.record', () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => { ctx = build(); });

  it('grava data, lugar aproximado e dispositivo, sem IP', async () => {
    const saved = await ctx.service.record({ ip: '200.160.2.3', userAgent: CHROME, path: '/?utm=1', referrer: 'https://www.google.com/x' });
    expect(saved).toBe(true);
    const data = ctx.prisma.siteVisit.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ path: '/', referrer: 'www.google.com', country: 'BR', region: 'Sao Paulo', city: 'Santos', device: 'desktop', browser: 'Chrome', firstOfDay: true });
    expect(JSON.stringify(data)).not.toContain('200.160.2.3');
    expect(data.visitorKey).toMatch(/^[0-9a-f]{32}$/);
  });

  it('marca firstOfDay=false quando o visitante ja apareceu hoje', async () => {
    ctx = build({ seenToday: true });
    await ctx.service.record({ ip: '200.160.2.3', userAgent: CHROME, path: '/' });
    expect(ctx.prisma.siteVisit.create.mock.calls[0][0].data.firstOfDay).toBe(false);
  });

  it('ignora robo sem tocar no banco', async () => {
    expect(await ctx.service.record({ ip: '66.249.66.1', userAgent: 'Googlebot/2.1', path: '/' })).toBe(false);
    expect(ctx.prisma.siteVisit.findFirst).not.toHaveBeenCalled();
    expect(ctx.prisma.siteVisit.create).not.toHaveBeenCalled();
  });

  it('ignora recarregamento em menos de 30 segundos', async () => {
    ctx = build({ duplicate: true });
    expect(await ctx.service.record({ ip: '200.160.2.3', userAgent: CHROME, path: '/' })).toBe(false);
    expect(ctx.prisma.siteVisit.create).not.toHaveBeenCalled();
  });

  it('a chave de visitante muda de um dia para outro', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-21T15:00:00Z'));
      await ctx.service.record({ ip: '200.160.2.3', userAgent: CHROME, path: '/' });
      const day1 = ctx.prisma.siteVisit.create.mock.calls[0][0].data.visitorKey;
      ctx = build();
      vi.setSystemTime(new Date('2026-10-22T15:00:00Z'));
      await ctx.service.record({ ip: '200.160.2.3', userAgent: CHROME, path: '/' });
      expect(ctx.prisma.siteVisit.create.mock.calls[0][0].data.visitorKey).not.toBe(day1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('nao lanca quando o banco falha', async () => {
    ctx.prisma.siteVisit.findFirst = vi.fn().mockRejectedValue(new Error('db fora'));
    await expect(ctx.service.record({ ip: '200.160.2.3', userAgent: CHROME, path: '/' })).resolves.toBe(false);
  });
});

describe('AnalyticsService.purge', () => {
  it('apaga a chave com mais de 48h e remove o que passou da retencao', async () => {
    const { service, prisma } = build();
    const now = new Date('2026-10-21T12:00:00Z');
    expect(await service.purge(now)).toEqual({ keysCleared: 3, removed: 2 });
    expect(prisma.siteVisit.updateMany.mock.calls[0][0].where.createdAt.lt).toEqual(new Date('2026-10-19T12:00:00Z'));
    expect(prisma.siteVisit.updateMany.mock.calls[0][0].data).toEqual({ visitorKey: null });
    expect(prisma.siteVisit.deleteMany.mock.calls[0][0].where.createdAt.lt).toEqual(new Date(now.getTime() - 400 * 86_400_000));
  });
});
