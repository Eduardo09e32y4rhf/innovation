import 'reflect-metadata';
import { Controller, Get, NotFoundException } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { REQUIRES_FEATURE_KEY, RequiresFeature } from '../decorators/requires-feature.decorator';
import { FROZEN_FEATURES, type FeatureName } from '../feature-flags';
import { FeatureFlagGuard } from './feature-flag.guard';

import { AiController } from '../../modules/ai/ai.controller';
import { CeoOnboardingController } from '../../modules/ceo-onboarding/ceo-onboarding.controller';
import { CommercialSalesController } from '../../modules/commercial-sales/commercial-sales.controller';
import { CommunicationController } from '../../modules/communication/communication.controller';
import { ManualContractsController } from '../../modules/manual-contracts/manual-contracts.controller';
import { PartnersController } from '../../modules/partners/partners.controller';
import { PromotionsController } from '../../modules/promotions/promotions.controller';
import { ProposalsController } from '../../modules/proposals/proposals.controller';

// Os .spec sao excluidos do tsconfig da API (sem experimentalDecorators): aplicamos os decorators por chamada, nao por sintaxe.
function route(controller: { prototype: object }, method: string, path: string, feature?: FeatureName) {
  const descriptor = Object.getOwnPropertyDescriptor(controller.prototype, method)!;
  Get(path)(controller.prototype, method, descriptor);
  if (feature) RequiresFeature(feature)(controller.prototype, method, descriptor);
}

class FrozenController { ping() { return { ok: true }; } }
Controller('congelado')(FrozenController);
RequiresFeature('ai')(FrozenController);
route(FrozenController, 'ping', 'ping');

class FreeController { ping() { return { ok: true }; } }
Controller('livre')(FreeController);
route(FreeController, 'ping', 'ping');

class MixedController {
  open() { return { ok: true }; }
  closed() { return { ok: true }; }
}
Controller('misto')(MixedController);
route(MixedController, 'open', 'aberta');
route(MixedController, 'closed', 'fechada', 'partners');

describe('FeatureFlagGuard em uma aplicacao Nest real', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FrozenController, FreeController, MixedController],
      providers: [{ provide: APP_GUARD, useClass: FeatureFlagGuard }],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(() => { delete process.env.FEATURE_AI; delete process.env.FEATURE_PARTNERS; });
  afterAll(async () => { await app.close(); });

  const status = async (url: string) => (await app.inject({ method: 'GET', url })).statusCode;

  it('rota de modulo congelado responde 404 por padrao', async () => {
    expect(await status('/congelado/ping')).toBe(404);
  });

  it('responde 200 quando a flag e ligada, sem reiniciar', async () => {
    process.env.FEATURE_AI = 'true';
    expect(await status('/congelado/ping')).toBe(200);
    process.env.FEATURE_AI = 'false';
    expect(await status('/congelado/ping')).toBe(404);
  });

  it('rota sem decorator nunca e afetada', async () => {
    expect(await status('/livre/ping')).toBe(200);
  });

  it('a flag de um modulo nao libera outro', async () => {
    process.env.FEATURE_PARTNERS = 'true';
    expect(await status('/congelado/ping')).toBe(404);
  });

  it('decorator no metodo bloqueia so aquela rota', async () => {
    expect(await status('/misto/aberta')).toBe(200);
    expect(await status('/misto/fechada')).toBe(404);
    process.env.FEATURE_PARTNERS = 'true';
    expect(await status('/misto/fechada')).toBe(200);
  });
});

describe('FeatureFlagGuard (unidade)', () => {
  const guard = new FeatureFlagGuard(new Reflector());
  const context = (cls: object, handler: () => void = () => undefined) => ({ getClass: () => cls, getHandler: () => handler }) as never;

  it('lanca NotFoundException, nao Forbidden (a rota "nao existe")', () => {
    expect(() => guard.canActivate(context(FrozenController))).toThrow(NotFoundException);
  });
});

describe('cobertura dos 8 modulos congelados', () => {
  const controllers: Array<[FeatureName, object]> = [
    ['ai', AiController], ['partners', PartnersController], ['commercial-sales', CommercialSalesController], ['proposals', ProposalsController],
    ['manual-contracts', ManualContractsController], ['ceo-onboarding', CeoOnboardingController], ['communication', CommunicationController], ['promotions', PromotionsController],
  ];

  it.each(controllers)('controller de %s esta marcado com a propria flag', (feature, controller) => {
    expect(Reflect.getMetadata(REQUIRES_FEATURE_KEY, controller)).toBe(feature);
  });

  const modulesDir = join(__dirname, '../../modules');
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

  it.each(FROZEN_FEATURES)('TODO controller novo de %s tambem precisa do decorator', (feature) => {
    const files = walk(join(modulesDir, feature)).filter((file) => file.endsWith('.controller.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(readFileSync(file, 'utf8'), file).toContain(`@RequiresFeature('${feature}')`);
  });

  it('webhooks de pagamento e o nucleo de cobranca NAO dependem de flag', () => {
    const finance = walk(join(modulesDir, 'finance')).filter((file) => file.endsWith('.controller.ts'));
    expect(finance.some((file) => file.includes('asaas-webhook'))).toBe(true);
    expect(finance.some((file) => file.includes('mercadopago-webhook'))).toBe(true);
    for (const file of finance) expect(readFileSync(file, 'utf8'), file).not.toContain('RequiresFeature');
  });

  it('nenhum modulo do MVP usa o decorator', () => {
    const core = ['auth', 'users', 'companies', 'employees', 'time-track', 'schedule-hub', 'vacations', 'payroll', 'accounting', 'jobs', 'privacy', 'support', 'platform', 'analytics', 'notifications'];
    for (const name of core) {
      for (const file of walk(join(modulesDir, name)).filter((item) => item.endsWith('.controller.ts'))) {
        expect(readFileSync(file, 'utf8'), file).not.toContain('RequiresFeature');
      }
    }
  });
});
