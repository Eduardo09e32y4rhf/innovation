import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { APPLY_LIMITS, ApplyLimiter, assertApplyAllowed } from './apply-abuse';
import { PublicJobsController } from './public-jobs.controller';
import { monthsAgo, DEFAULT_RETENTION_MONTHS, TALENT_CONSENT_MONTHS } from './recruitment-privacy';
import { RecruitmentPrivacyService } from './recruitment-privacy.service';
import { RecruitmentService, foldText } from './recruitment.service';
import { TalentPoolService } from './talent-pool.service';

const pdf = Buffer.from('%PDF-1.4 curriculo');
function request(email: string, ip: string) {
  const parts = [
    { type: 'field', fieldname: 'name', value: 'Maria' },
    { type: 'field', fieldname: 'email', value: email },
    { type: 'file', fieldname: 'resume', filename: 'cv.pdf', mimetype: 'application/pdf', file: { truncated: false }, toBuffer: async () => pdf },
  ];
  return { ip, isMultipart: () => true, parts: () => (async function* () { for (const part of parts) yield part; })() };
}

describe('candidatura pública: anti-spam', () => {
  it('50 candidaturas do mesmo IP em poucos segundos: só as primeiras passam, o resto leva 429', async () => {
    const apply = vi.fn().mockResolvedValue({ received: true });
    const controller = new PublicJobsController({ apply } as any);
    const results = await Promise.all(Array.from({ length: 50 }, (_, i) => controller.apply('job-1', request(`bot${i}@spam.com`, '203.0.113.9')).then(() => 200, (e: HttpException) => e.getStatus())));
    expect(results.filter((r) => r === 200)).toHaveLength(APPLY_LIMITS.perIp.limit);
    expect(results.filter((r) => r === 429)).toHaveLength(50 - APPLY_LIMITS.perIp.limit);
    expect(apply).toHaveBeenCalledTimes(APPLY_LIMITS.perIp.limit);
  });

  it('outro IP não é afetado pelo bloqueio do primeiro', async () => {
    const controller = new PublicJobsController({ apply: vi.fn().mockResolvedValue({ received: true }) } as any);
    for (let i = 0; i < 25; i += 1) await controller.apply('job-1', request(`a${i}@x.com`, '198.51.100.1')).catch(() => undefined);
    await expect(controller.apply('job-1', request('legit@x.com', '198.51.100.2'))).resolves.toEqual({ received: true });
  });

  it('mesmo e-mail na mesma vaga: 3 por hora, mesmo trocando de IP', async () => {
    const limiter = new ApplyLimiter();
    const attempt = (n: number) => assertApplyAllowed(limiter, `10.0.0.${n}`, 'job-9', ' Ana@Mail.com ');
    await attempt(1); await attempt(2); await attempt(3);
    await expect(attempt(4)).rejects.toMatchObject({ status: 429 });
  });

  it('mesmo e-mail em várias vagas: 10 por hora', async () => {
    const limiter = new ApplyLimiter();
    for (let i = 0; i < APPLY_LIMITS.perEmail.limit; i += 1) await assertApplyAllowed(limiter, `10.1.0.${i}`, `job-${i}`, 'ana@mail.com');
    await expect(assertApplyAllowed(limiter, '10.1.1.1', 'job-novo', 'ana@mail.com')).rejects.toMatchObject({ status: 429 });
  });

  it('usa o Redis quando ele responde e cai para memória quando devolve 0 (indisponível)', async () => {
    const counts = new Map<string, number>();
    const redis = { incr: vi.fn(async (k: string) => { counts.set(k, (counts.get(k) ?? 0) + 1); return counts.get(k)!; }), expire: vi.fn(async () => undefined) };
    const shared = new ApplyLimiter(redis as any);
    expect(await shared.allow('k', 2, 60)).toBe(true);
    expect(await shared.allow('k', 2, 60)).toBe(true);
    expect(await shared.allow('k', 2, 60)).toBe(false);
    expect(redis.expire).toHaveBeenCalledTimes(1);
    const down = new ApplyLimiter({ incr: async () => 0, expire: async () => undefined } as any);
    expect(await down.allow('m', 1, 60)).toBe(true);
    expect(await down.allow('m', 1, 60)).toBe(false);
  });
});

describe('consentimento com prazo e retenção (LGPD)', () => {
  it('banco de talentos só enxerga consentimento dentro do prazo', async () => {
    const findMany = vi.fn(async () => []);
    const findFirst = vi.fn(async () => null);
    const service = new TalentPoolService({ candidateAccount: { findMany, findFirst } } as any, {} as any, {} as any);
    await service.search('c1', 'u1', {});
    const cutoff = (findMany.mock.calls[0] as any)[0].where.talentPoolConsentAt.gte as Date;
    expect(Math.abs(cutoff.getTime() - monthsAgo(TALENT_CONSENT_MONTHS).getTime())).toBeLessThan(5000);
    await expect(service.resume('c1', 'u1', 'acc-1')).rejects.toThrow(/fora do banco de talentos/);
    expect((findFirst.mock.calls[0] as any)[0].where.talentPoolConsentAt.gte).toBeInstanceOf(Date);
  });

  it('rotina encerra os consentimentos vencidos e nada além disso', async () => {
    const updateMany = vi.fn(async () => ({ count: 3 }));
    const service = new TalentPoolService({ candidateAccount: { updateMany } } as any, {} as any, {} as any);
    expect(await service.expireConsents()).toBe(3);
    const call = (updateMany.mock.calls[0] as any)[0];
    expect(call.where.talentPoolConsentAt.lt).toBeInstanceOf(Date);
    expect(call.data).toEqual({ talentPoolConsentAt: null });
  });

  it('candidatura sem prazo gravado (pós-processamento falhou) também é anonimizada pela data de criação', async () => {
    const findMany = vi.fn(async () => []);
    const service = new RecruitmentPrivacyService({ application: { findMany }, recruitmentSetting: {}, recruitmentAccessToken: { deleteMany: vi.fn(async () => ({})) } } as any, {} as any, {} as any);
    await service.purgeExpired();
    const where = (findMany.mock.calls[0] as any)[0].where;
    expect(where.anonymizedAt).toBeNull();
    expect(where.status).toEqual({ not: 'HIRED' });
    expect(where.OR).toHaveLength(2);
    expect(where.OR[1].retentionUntil).toBeNull();
    const fallback = where.OR[1].createdAt.lte as Date;
    expect(Math.abs(fallback.getTime() - monthsAgo(DEFAULT_RETENTION_MONTHS).getTime())).toBeLessThan(5000);
  });
});

describe('busca de candidatos sem acento', () => {
  it('foldText tira acento, cedilha e caixa', () => {
    expect(foldText('  João CONCEIÇÃO  ')).toBe('joao conceicao');
    expect(foldText('Ñandú Ávila')).toBe('nandu avila');
    expect(foldText(undefined)).toBe('');
  });

  it('ids encontrados sem acento entram no filtro além do ILIKE', async () => {
    const service = new RecruitmentService({} as any) as any;
    const where = service.buildWhere('c1', 'j1', { q: 'joao' }, ['cand-1']);
    const or = where.AND[0].OR;
    expect(or).toContainEqual({ candidateId: { in: ['cand-1'] } });
    expect(or.length).toBeGreaterThanOrEqual(5);
    expect(service.buildWhere('c1', 'j1', { q: 'joao' }).AND[0].OR.some((c: any) => c.candidateId)).toBe(false);
  });

  it('a consulta usa translate() no banco e escapa % _ \\ do termo', async () => {
    const queryRaw = vi.fn(async () => [{ candidateId: 'cand-1' }]);
    const service = new RecruitmentService({ $queryRaw: queryRaw } as any) as any;
    expect(await service.accentInsensitiveCandidateIds('c1', 'j1', 'Joã_o%')).toEqual(['cand-1']);
    const [strings, , , , , needle] = queryRaw.mock.calls[0] as any[];
    expect(strings.join('?')).toContain('translate(');
    expect(needle).toBe('%joa\\_o\\%%');
    expect(await service.accentInsensitiveCandidateIds('c1', 'j1', '   ')).toEqual([]);
    const broken = new RecruitmentService({ $queryRaw: async () => { throw new Error('db'); } } as any) as any;
    expect(await broken.accentInsensitiveCandidateIds('c1', 'j1', 'ana')).toEqual([]);
  });
});
