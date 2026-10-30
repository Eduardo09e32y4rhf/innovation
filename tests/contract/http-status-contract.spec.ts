import 'reflect-metadata';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from '../../apps/api/src/common/filters/http-exception.filter';
import { friendlyValidationFactory } from '../../apps/api/src/common/filters/friendly-validation';
import { JwtAuthGuard } from '../../apps/api/src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../apps/api/src/common/guards/roles.guard';
import { parseDay } from '../../apps/api/src/modules/payroll/labor-dates';
import { calculateTermination } from '../../apps/api/src/modules/payroll/termination.calculator';
import { TerminationController } from '../../apps/api/src/modules/payroll/termination.controller';
import { TerminationService } from '../../apps/api/src/modules/payroll/termination.service';
import { PrismaService } from '../../apps/api/src/database/prisma.service';
import { PayrollCalculationService } from '../../apps/api/src/modules/time-track/payroll-calculation.service';
import { SupportStorageService } from '../../apps/api/src/modules/support/support-storage.service';

// API-01: `throw new Error` vira 500 (RFC 9110 15.5 = erro do cliente, 15.6.1 = 500 inesperado).
// Cada cenario abaixo prova o status HTTP esperado.
const EMPLOYEE_ID = '11111111-1111-4111-8111-111111111111';

async function appWith(controller: any, providers: any[]) {
  const moduleRef = await Test.createTestingModule({ controllers: [controller], providers })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: (c: any) => { c.switchToHttp().getRequest().user = { sub: 'u1', companyId: 'c1', role: 'RH' }; return true; } })
    .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
    .compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, exceptionFactory: friendlyValidationFactory }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

function statusOf(fn: () => unknown): number | string {
  try { fn(); } catch (error: any) { return typeof error?.getStatus === 'function' ? error.getStatus() : `Error:${error?.message}`; }
  return 'no-throw';
}

describe('API-01 calculadoras de folha: dado invalido do pedido nao pode virar 500', () => {
  it('parseDay com data inexistente devolve 400 e mantem a mensagem em portugues', () => {
    expect(statusOf(() => parseDay('abcd-ef-gh'))).toBe(400);
    expect(() => parseDay('abcd-ef-gh')).toThrow(/Data inválida/);
  });
  const base = { type: 'SEM_JUSTA_CAUSA', salary: 3000, admissionDate: '2025-03-01', terminationDate: '2026-04-15' } as any;
  it('desligamento anterior a admissao: 422 (regra de negocio)', () => {
    expect(statusOf(() => calculateTermination({ ...base, terminationDate: '2024-01-01' }))).toBe(422);
  });
  it('salario invalido: 400', () => {
    expect(statusOf(() => calculateTermination({ ...base, salary: 0 }))).toBe(400);
  });
  it('rescisao antecipada sem contractEndDate: 400', () => {
    expect(statusOf(() => calculateTermination({ ...base, type: 'ANTECIPADA_EMPREGADOR' }))).toBe(400);
  });
});

describe('API-01 POST /payroll/termination/simulate (Nest + Fastify reais)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const prisma = {
      employee: { findFirst: async () => ({ id: EMPLOYEE_ID, userId: null, name: 'Ana', cpf: null, registration: '1', position: 'x', salary: 3000, dependents: null, admissionDate: new Date('2025-03-01T00:00:00Z'), terminationDate: null, status: 'ACTIVE' }) },
      timeClosing: { findMany: async () => [] },
      vacationEntitlement: { findMany: async () => [] },
    };
    const calculator = { resolveTaxContext: async () => ({}) };
    app = await appWith(TerminationController, [TerminationService, { provide: PrismaService, useValue: prisma }, { provide: PayrollCalculationService, useValue: calculator }, { provide: SupportStorageService, useValue: {} }]);
  });
  afterAll(() => app?.close());
  const call = (payload: object) => app.inject({ method: 'POST', url: '/payroll/termination/simulate', payload: { employeeId: EMPLOYEE_ID, type: 'SEM_JUSTA_CAUSA', ...payload } });

  it('desligamento anterior a admissao devolve 422', async () => {
    const res = await call({ terminationDate: '2024-01-10', includeVariableAverage: false });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.message).toMatch(/anterior à admissão/);
  });
  it('rescisao antecipada sem contractEndDate devolve 400', async () => {
    const res = await call({ terminationDate: '2026-04-15', type: 'ANTECIPADA_EMPREGADOR', includeVariableAverage: false });
    expect(res.statusCode).toBe(400);
  });
});

describe('API-01 regressao: throw new Error em codigo alcancavel por rota', () => {
  const ROOT = join(__dirname, '../../apps/api/src');
  // Excecoes deliberadas (arquivo -> quantidade), todas SEM caminho de resposta HTTP direto:
  const ALLOWED: Record<string, { count: number; why: string }> = {
    'config/env.validation.ts': { count: 3, why: 'falha de boot (configuracao), nunca em requisicao' },
    'modules/auth/auth.module.ts': { count: 1, why: 'boot; area do grupo G1' },
    'modules/auth/totp.ts': { count: 1, why: 'area do grupo G1 (auth)' },
    'common/crypto/crypto.service.ts': { count: 1, why: 'dado interno corrompido: 500 generico e correto' },
    'common/crypto/temporary-password.ts': { count: 1, why: 'dado interno corrompido: 500 generico e correto' },
    'modules/mail/mail.service.ts': { count: 3, why: 'falha de provedor de e-mail; capturada por send()/boot' },
    'modules/queue/workers/whatsapp-send.worker.ts': { count: 1, why: 'worker Bull, sem resposta HTTP' },
    'modules/jobs/recruitment-workflow.service.ts': { count: 4, why: 'executado por cron/fila; execute() captura e grava FAILED' },
    'modules/jobs/jobs-storage.service.ts': { count: 1, why: 'invariante interna (chave vem do banco, nao do cliente)' },
    'modules/holidays/holidays.service.ts': { count: 1, why: 'capturado no mesmo try; feriados opcionais' },
    'modules/vacations/vacations.repository.ts': { count: 1, why: 'sinal interno em transacao; vacations.service converte em 400' },
    'modules/finance/finance-notification.service.ts': { count: 1, why: 'capturado no mesmo try (notificacao interna)' },
    'modules/finance/itf-barcode.ts': { count: 1, why: 'utilitario de PDF; entrada vem do provedor' },
    'modules/finance/asaas-webhook.processor.ts': { count: 3, why: 'processor Bull: o throw faz a fila reprocessar (nao e resposta HTTP)' },
    'modules/finance/mercadopago-payment-sync.service.ts': { count: 1, why: 'sincronizacao em fila/cron' },
  };
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return walk(full);
      return name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [full] : [];
    });
  }
  it('todo throw new Error restante esta na lista de excecoes documentadas', () => {
    const found: Record<string, number> = {};
    for (const file of walk(ROOT)) {
      const rel = relative(ROOT, file).split(sep).join('/');
      const n = (readFileSync(file, 'utf8').match(/throw new Error\(/g) ?? []).length;
      if (n) found[rel] = n;
    }
    const unexpected = Object.entries(found).filter(([f, n]) => (ALLOWED[f]?.count ?? 0) !== n).map(([f, n]) => `${f}: ${n} (permitido ${ALLOWED[f]?.count ?? 0})`);
    expect(unexpected).toEqual([]);
    void vi;
  });
});
