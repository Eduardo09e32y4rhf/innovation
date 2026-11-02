import 'reflect-metadata';
import { BadRequestException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { bestPerCriterion, parseCompareIds, summarizeCriteria } from './candidate-comparison';
import { CandidateComparisonController } from './candidate-comparison.controller';
import { CandidateComparisonService } from './candidate-comparison.service';
import { JobScopeService } from './job-scope.service';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

describe('RS-R-07 regras da comparacao', () => {
  it('aceita de 2 a 4 candidatos distintos, ignorando repeticao e espacos', () => {
    expect(parseCompareIds(` ${A}, ${B},${A}`)).toEqual([A, B]);
    expect(() => parseCompareIds(A)).toThrow(BadRequestException);
    expect(() => parseCompareIds(`${A},${B},${C},44444444-4444-4444-8444-444444444444,55555555-5555-4555-8555-555555555555`)).toThrow(/4/);
    expect(() => parseCompareIds(`${A},nao-e-uuid`)).toThrow(BadRequestException);
    expect(() => parseCompareIds(undefined)).toThrow(BadRequestException);
  });
  it('media por criterio entre avaliadores e destaque do melhor (empate destaca todos)', () => {
    const criteria = [{ id: 'k1', name: 'Tecnica', weight: 2 }, { id: 'k2', name: 'Comunicacao', weight: 1 }];
    const x = summarizeCriteria(criteria, [{ criterionId: 'k1', score: 5 }, { criterionId: 'k1', score: 3 }, { criterionId: 'k2', score: 4 }]);
    const y = summarizeCriteria(criteria, [{ criterionId: 'k1', score: 4 }, { criterionId: 'k2', score: 4 }]);
    expect(x.k1).toEqual({ average: 4, count: 2 });
    expect(y.k2).toEqual({ average: 4, count: 1 });
    const best = bestPerCriterion(criteria, { a: x, b: y });
    expect(best.k1).toEqual(['a', 'b']);
    expect(best.k2).toEqual(['a', 'b']);
    expect(bestPerCriterion(criteria, { a: x, b: summarizeCriteria(criteria, []) }).k1).toEqual(['a']);
    expect(bestPerCriterion(criteria, { a: summarizeCriteria(criteria, []), b: summarizeCriteria(criteria, []) }).k1).toEqual([]);
  });
});

const app = (id: string, over: Record<string, unknown> = {}) => ({
  id, jobId: 'j1', status: 'INTERVIEW', score: 80, source: 'LINKEDIN', createdAt: new Date('2026-10-01'), knockedOut: false, stage: { id: 's1', name: 'Entrevista' },
  candidate: { name: `Pessoa ${id.slice(0, 1)}`, email: 'p@x.com' }, answers: [{ questionId: 'q1', value: 'Sim' }],
  evaluations: [{ userId: 'me', criterionId: 'k1', score: 5 }, { userId: 'me', criterionId: 'k2', score: 4 }, { userId: 'other', criterionId: 'k1', score: 3 }],
  interviews: [{ id: 'i1', scheduledAt: new Date('2026-10-05'), feedbacks: [{ userId: 'me', authorName: 'Eu', recommendation: 'YES', ratings: [{ score: 4 }], notes: 'Bom' }, { userId: 'other', authorName: 'Outro', recommendation: 'NO', ratings: [{ score: 2 }], notes: 'Nao' }] }],
  ...over,
});
function buildService(apps: unknown[]) {
  const prisma: any = {
    job: { findFirst: vi.fn(async () => ({ id: 'j1', title: 'Dev' })) },
    application: { findMany: vi.fn(async () => apps) },
    jobCriterion: { findMany: vi.fn(async () => [{ id: 'k1', name: 'Tecnica', weight: 2 }, { id: 'k2', name: 'Comunicacao', weight: 1 }]) },
    jobQuestion: { findMany: vi.fn(async () => [{ id: 'q1', label: 'Tem CNH?', type: 'YESNO' }]) },
    recruitmentDocument: { findMany: vi.fn(async () => [{ applicationId: A, label: 'RG', status: 'APPROVED', fileKey: 'segredo', sha256: 'x' }]) },
  };
  return { prisma, service: new CandidateComparisonService(prisma) };
}

describe('RS-R-07 CandidateComparisonService', () => {
  it('agrega notas, pareceres, respostas e documentos por candidato, sem expor chaves de arquivo', async () => {
    const { service, prisma } = buildService([app(A), app(B, { answers: [], evaluations: [], interviews: [] })]);
    const result: any = await service.compare('c1', { sub: 'me', role: 'RH' } as any, 'j1', [A, B]);
    expect(prisma.application.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: 'c1', jobId: 'j1', id: { in: [A, B] } } }));
    expect(result.job).toEqual({ id: 'j1', title: 'Dev' });
    const first = result.candidates.find((row: any) => row.applicationId === A);
    expect(first).toMatchObject({ name: 'Pessoa 1', stage: 'Entrevista', screeningScore: 80, answers: { q1: 'Sim' }, documents: [{ label: 'RG', status: 'APPROVED' }] });
    expect(first.criteria.k1).toEqual({ average: 4, count: 2 });
    expect(first.feedback).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain('segredo');
    expect(result.best.k1).toEqual([A]);
  });
  it('avaliacao cega: quem ainda nao avaliou todos os criterios ve so as proprias notas e pareceres', async () => {
    const { service } = buildService([app(A), app(B)]);
    const result: any = await service.compare('c1', { sub: 'novo', role: 'GESTOR' } as any, 'j1', [A, B]);
    const first = result.candidates[0];
    expect(first.evaluationsHidden).toBe(true);
    expect(first.criteria.k1).toEqual({ average: null, count: 0 });
    expect(first.feedback).toEqual([]);
    expect(first.feedbackHidden).toBe(2);
  });
  it('candidatura de outra vaga/empresa: 404; menos de 2 resultados tambem', async () => {
    const { service } = buildService([app(A)]);
    await expect(service.compare('c1', { sub: 'me', role: 'RH' } as any, 'j1', [A, B])).rejects.toBeInstanceOf(NotFoundException);
    const none = buildService([]);
    none.prisma.job.findFirst.mockResolvedValueOnce(null);
    await expect(none.service.compare('c1', { sub: 'me', role: 'RH' } as any, 'j1', [A, B])).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RS-R-07 rota GET /jobs/:jobId/compare (Nest + Fastify reais)', () => {
  let http: NestFastifyApplication;
  const compare = vi.fn(async () => ({ candidates: [] }));
  const assertJob = vi.fn(async () => undefined);
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CandidateComparisonController],
      providers: [{ provide: CandidateComparisonService, useValue: { compare } }, { provide: JobScopeService, useValue: { assertJob } }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (c: any) => { const r = c.switchToHttp().getRequest(); r.user = { sub: 'u1', companyId: 'c1', role: r.headers['x-role'] ?? 'RH' }; return true; } })
      .overrideGuard(ModuleGuard).useValue({ canActivate: () => true })
      .compile();
    http = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    http.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    http.useGlobalFilters(new HttpExceptionFilter());
    await http.init();
    await http.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => http?.close());

  it('RH, RH_RS e GESTOR comparam dentro do escopo; FUNCIONARIO recebe 403', async () => {
    for (const role of ['RH', 'RH_RS', 'GESTOR']) {
      const res = await http.inject({ method: 'GET', url: `/jobs/${A}/compare?ids=${B},${C}`, headers: { 'x-role': role } });
      expect(res.statusCode, role).toBe(200);
    }
    expect(assertJob).toHaveBeenCalledWith('c1', expect.objectContaining({ sub: 'u1' }), A);
    expect((await http.inject({ method: 'GET', url: `/jobs/${A}/compare?ids=${B},${C}`, headers: { 'x-role': 'FUNCIONARIO' } })).statusCode).toBe(403);
  });
  it('ids invalidos devolvem 400 e nao consultam o banco', async () => {
    compare.mockClear();
    for (const q of ['', '?ids=', `?ids=${B}`, `?ids=${B},x`]) expect((await http.inject({ method: 'GET', url: `/jobs/${A}/compare${q}` })).statusCode, q).toBe(400);
    expect(compare).not.toHaveBeenCalled();
  });
});
