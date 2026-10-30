import 'reflect-metadata';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpExceptionFilter } from '../../apps/api/src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../../apps/api/src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../apps/api/src/common/guards/roles.guard';
import { PrismaService } from '../../apps/api/src/database/prisma.service';
import { AiController } from '../../apps/api/src/modules/ai/ai.controller';
import { AiGuardrailsService } from '../../apps/api/src/modules/ai/ai-guardrails.service';
import { AiUsageService } from '../../apps/api/src/modules/ai/ai-usage.service';
import { PlatformAiService } from '../../apps/api/src/modules/ai/platform-ai.service';
import { SupportAiService } from '../../apps/api/src/modules/ai/support-ai.service';

// API-03: IA. Recurso inexistente = 404 (RFC 9110 15.5.5); classify exige perfil de plataforma e tem limite proprio.
const ID = '11111111-1111-4111-8111-111111111111';
let classifyCalls = 0;

describe('API-03 AiController (Nest + Fastify reais)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const prisma = { supportTicket: { findUnique: async () => null }, supportTicketMessage: { findMany: async () => [] }, company: { findUnique: async () => null } };
    const moduleRef = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: SupportAiService, useValue: { classifyTicket: async () => { classifyCalls++; return { category: 'X' }; } } },
        { provide: PlatformAiService, useValue: {} }, { provide: AiUsageService, useValue: {} }, { provide: AiGuardrailsService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (c: any) => { const r = c.switchToHttp().getRequest(); r.user = { sub: 'u1', companyId: 'c1', role: r.headers['x-role'] ?? 'DEV' }; return true; } })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app?.close());

  it('ticket inexistente devolve 404 em summarize e suggest-reply', async () => {
    for (const path of ['summarize', 'suggest-reply']) {
      const res = await app.inject({ method: 'POST', url: `/ai/support/ticket/${ID}/${path}` });
      expect(res.statusCode, path).toBe(404);
      expect(res.json().error.message).toMatch(/Ticket não encontrado/);
    }
  });
  it('empresa inexistente devolve 404 no resumo da plataforma', async () => {
    const res = await app.inject({ method: 'POST', url: `/ai/platform/company/${ID}/summary` });
    expect(res.statusCode).toBe(404);
  });
  it('FUNCIONARIO, ADMIN e RH recebem 403 em classify e o provedor de IA nao e chamado', async () => {
    for (const role of ['FUNCIONARIO', 'ADMIN', 'RH']) {
      const res = await app.inject({ method: 'POST', url: '/ai/support/classify', headers: { 'x-role': role }, payload: { title: 'Erro' } });
      expect(res.statusCode, role).toBe(403);
    }
    expect(classifyCalls).toBe(0);
  });
  it('COMERCIAL (suporte da plataforma) e DEV podem classificar', async () => {
    for (const role of ['COMERCIAL', 'DEV']) {
      const res = await app.inject({ method: 'POST', url: '/ai/support/classify', headers: { 'x-role': role }, payload: { title: 'Erro' } });
      expect(res.statusCode, role).toBe(200);
    }
  });
  it('classify tem limite proprio (@Throttle)', () => {
    const keys = Reflect.getMetadataKeys(AiController.prototype.classifyTicket).filter((k: any) => String(k).startsWith('THROTTLER'));
    expect(keys.length).toBeGreaterThan(0);
  });
});
