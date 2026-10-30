import 'reflect-metadata';
import { APP_GUARD } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ThrottlerModule } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildThrottlerOptions } from './throttler.config';
import { UserThrottlerGuard } from './user-throttler.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { AuthController } from '../../modules/auth/auth.controller';
import { UsersController } from '../../modules/users/users.controller';
import { UsersService } from '../../modules/users/users.service';
import { UsersActivityService } from '../../modules/users/users-activity.service';
import { PrivacyController } from '../../modules/privacy/privacy.controller';
import { PrivacyService } from '../../modules/privacy/privacy.service';
import { SupportController } from '../../modules/support/support.controller';
import { LookupController } from '../../modules/lookup/lookup.controller';
import { PlatformController } from '../../modules/platform/platform.controller';
import { CandidateAccountController } from '../../modules/jobs/candidate-account.controller';
import { CompanyBillingController } from '../../modules/finance/company-billing.controller';
import { FaturasController } from '../../modules/finance/faturas.controller';
import { FinanceController } from '../../modules/finance/finance.controller';

// SEG-05 (restante): rotas sensiveis tinham so o limite global de 300/min. Valores prudentes, por rota.
// OWASP / NestJS rate limiting: https://docs.nestjs.com/security/rate-limiting (VIA BUSCA, host bloqueado).
const TABLE: Array<[any, string, number]> = [
  [AuthController, 'adminResetEmployeePassword', 10],
  [UsersController, 'resetPassword', 10],
  [UsersController, 'resetMfa', 10],
  [PrivacyController, 'accept', 20],
  [SupportController, 'uploadAttachment', 20],
  [LookupController, 'cep', 30],
  [LookupController, 'cnpj', 30],
  [PlatformController, 'lookupCnpj', 30],
  [CandidateAccountController, 'cep', 30],
  [CompanyBillingController, 'checkout', 10],
  [FaturasController, 'checkout', 10],
  [FinanceController, 'companyCheckout', 10],
  [FinanceController, 'retryWebhookEvent', 10],
];

describe('SEG-05: rotas sensiveis tem @Throttle proprio', () => {
  it.each(TABLE)('%o.%s limita a %i/min', (cls, method, limit) => {
    const h = cls.prototype[method];
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', h), `${cls.name}.${method}`).toBe(limit);
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', h)).toBe(60000);
  });
});

describe('SEG-05: o limite dispara 429 (Nest + Fastify reais, ThrottlerModule real)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const okUser = { canActivate: (c: any) => { c.switchToHttp().getRequest().user = { sub: 'u1', companyId: 'c1', role: 'DEV' }; return true; } };
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(buildThrottlerOptions())],
      controllers: [UsersController, PrivacyController],
      providers: [
        { provide: APP_GUARD, useClass: UserThrottlerGuard },
        { provide: UsersService, useValue: { resetMfa: async () => ({ ok: true }), reissueTemporaryPassword: async () => ({ ok: true }) } },
        { provide: UsersActivityService, useValue: {} },
        { provide: PrivacyService, useValue: { accept: async () => ({ ok: true }) } },
      ],
    }).overrideGuard(JwtAuthGuard).useValue(okUser).overrideGuard(RolesGuard).useValue({ canActivate: () => true }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app?.close());

  const U = '11111111-1111-4111-8111-111111111111';
  async function codes(url: string, n: number, token: string, payload: object = {}) {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push((await app.inject({ method: 'POST', url, payload, headers: { authorization: `Bearer ${token}` } })).statusCode);
    return out;
  }
  it('reset de MFA: 10 passam, a 11a e 429', async () => {
    const c = await codes(`/users/${U}/mfa/reset`, 11, 'tok-mfa');
    expect(c.slice(0, 10).every((x) => x < 400), String(c)).toBe(true);
    expect(c[10]).toBe(429);
  });
  it('aceite de termos: 20 passam, a 21a e 429', async () => {
    const c = await codes('/legal/terms/accept', 21, 'tok-terms');
    expect(c.slice(0, 20).every((x) => x < 400), String(c)).toBe(true);
    expect(c[20]).toBe(429);
  });
});
