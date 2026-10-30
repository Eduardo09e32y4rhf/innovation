import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { JobAuditService } from './job-audit.service';
import { JobScopeService } from './job-scope.service';
import { RecruitmentMetricsController } from './recruitment-metrics.controller';
import { RecruitmentMetricsService } from './recruitment-metrics.service';

const ID = '11111111-1111-4111-8111-111111111111';
const service = { metrics: vi.fn(async () => ({ ok: true })), costs: vi.fn(async () => ({ costAmount: 10, sources: [] })), saveCosts: vi.fn(async () => ({ costAmount: 10, sources: [{ source: 'LINKEDIN', amount: 50 }] })), exportCsv: vi.fn(async () => '﻿"Indicador"') };
const audit = { record: vi.fn(async () => undefined) };
const scope = { scope: vi.fn(() => ({})), assertJob: vi.fn(async () => undefined) };

describe('RS-R-10 rotas de metricas e custos (Nest + Fastify reais)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RecruitmentMetricsController],
      providers: [{ provide: RecruitmentMetricsService, useValue: service }, { provide: JobAuditService, useValue: audit }, { provide: JobScopeService, useValue: scope }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (c: any) => { const r = c.switchToHttp().getRequest(); r.user = { sub: 'u1', companyId: 'c1', role: r.headers['x-role'] ?? 'RH' }; return true; } })
      .overrideGuard(ModuleGuard).useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app?.close());

  it('custos da vaga: RH grava e a acao entra na auditoria; RH_RS, GESTOR e CEO recebem 403', async () => {
    const ok = await app.inject({ method: 'PUT', url: `/recruitment-metrics/jobs/${ID}/costs`, payload: { costAmount: 10, sources: [{ source: 'LINKEDIN', amount: 50 }] } });
    expect(ok.statusCode).toBe(200);
    expect(audit.record).toHaveBeenCalledWith('c1', 'u1', 'JOB_COST_UPDATED', ID, { sources: ['LINKEDIN'], fixedCostChanged: true });
    for (const role of ['RH_RS', 'GESTOR', 'CEO']) {
      expect((await app.inject({ method: 'PUT', url: `/recruitment-metrics/jobs/${ID}/costs`, headers: { 'x-role': role }, payload: { sources: [] } })).statusCode, role).toBe(403);
      expect((await app.inject({ method: 'GET', url: `/recruitment-metrics/jobs/${ID}/costs`, headers: { 'x-role': role } })).statusCode, role).toBe(403);
    }
  });
  it('valida origem, valor negativo e id da vaga', async () => {
    const bad = (payload: unknown, url = `/recruitment-metrics/jobs/${ID}/costs`) => app.inject({ method: 'PUT', url, payload: payload as object });
    expect((await bad({ sources: [{ source: 'XPTO', amount: 1 }] })).statusCode).toBe(400);
    expect((await bad({ sources: [{ source: 'LINKEDIN', amount: -1 }] })).statusCode).toBe(400);
    expect((await bad({ sources: [{ source: 'LINKEDIN', amount: 1.234 }] })).statusCode).toBe(400);
    expect((await bad({ sources: [] }, '/recruitment-metrics/jobs/nao-e-uuid/costs')).statusCode).toBe(400);
  });
  it('valores de custo so vao para DEV, ADMIN e RH', async () => {
    service.metrics.mockClear();
    for (const [role, include] of [['RH', true], ['ADMIN', true], ['RH_RS', false], ['GESTOR', false]] as const) {
      await app.inject({ method: 'GET', url: '/recruitment-metrics', headers: { 'x-role': role } });
      expect((service.metrics.mock.calls.at(-1) as unknown[])[3], role).toEqual({ includeCosts: include });
    }
  });
  it('relatorio CSV: RH_RS e GESTOR exportam so o proprio escopo, em text/csv com BOM', async () => {
    const res = await app.inject({ method: 'GET', url: '/recruitment-metrics/export?from=2026-01-01&to=2026-02-01', headers: { 'x-role': 'GESTOR' } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('relatorio-recrutamento.csv');
    expect(res.body.startsWith('﻿')).toBe(true);
    expect(service.exportCsv).toHaveBeenCalledWith('c1', {}, { from: '2026-01-01', to: '2026-02-01', jobId: undefined }, { includeCosts: false });
    expect((await app.inject({ method: 'GET', url: '/recruitment-metrics', headers: { 'x-role': 'FUNCIONARIO' } })).statusCode).toBe(403);
  });
});
