import 'reflect-metadata';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { friendlyValidationFactory } from '../../apps/api/src/common/filters/friendly-validation';
import { DeductionRuleDto } from '../../apps/api/src/modules/payroll/dto/deduction-rule.dto';
import { PlanPayloadDto } from '../../apps/api/src/modules/platform/dto/plan-payload.dto';
import { UpdatePlatformCompanyDto } from '../../apps/api/src/modules/platform/dto/update-platform-company.dto';
import { PromotionDto } from '../../apps/api/src/modules/promotions/dto/promotion.dto';
import { AcceptTermsDto, CreateProposalDto } from '../../apps/api/src/modules/proposals/dto/proposal.dto';
import { CommissionTransitionDto } from '../../apps/api/src/modules/commercial-sales/dto/commission-transition.dto';
import { UpdateSupportPriorityDto } from '../../apps/api/src/modules/support/dto/update-support-priority.dto';
import { ProposalsController } from '../../apps/api/src/modules/proposals/proposals.controller';
import { PromotionsController } from '../../apps/api/src/modules/promotions/promotions.controller';
import { PlatformSupportController } from '../../apps/api/src/modules/support/platform-support.controller';

// API-02: o ValidationPipe global (main.ts: whitelist + forbidNonWhitelisted + transform) so valida CLASSES com decorators.
// Mesma configuracao do main.ts:
const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, exceptionFactory: friendlyValidationFactory });
const run = (metatype: any, value: unknown) => pipe.transform(value, { type: 'body', metatype });
const status = async (metatype: any, value: unknown) => { try { await run(metatype, value); return 200; } catch (e: any) { return e.getStatus?.() ?? 500; } };

const UUID = '11111111-1111-4111-8111-111111111111';
const proposal = { companyId: UUID, title: 'Plano', startDate: '2026-11-01', planType: 'PRO', monthlyPrice: 199.9, usersLimit: 10, employeesLimit: 100, features: ['ponto'] };

describe('API-02 dto-validation: valor negativo/texto devolve 400', () => {
  it('propostas', async () => {
    expect(await status(CreateProposalDto, proposal)).toBe(200);
    expect(await status(CreateProposalDto, { ...proposal, monthlyPrice: 'abc' })).toBe(400);
    expect(await status(CreateProposalDto, { ...proposal, monthlyPrice: -1 })).toBe(400);
    expect(await status(CreateProposalDto, { ...proposal, usersLimit: 1.5 })).toBe(400);
    expect(await status(CreateProposalDto, { ...proposal, features: 'x' })).toBe(400);
    expect(await status(CreateProposalDto, { ...proposal, status: 'PAID' })).toBe(400); // campo extra (forbidNonWhitelisted)
    expect(await status(AcceptTermsDto, { signedByName: 'Ana', signedByEmail: 'ana@x.com' })).toBe(200);
    expect(await status(AcceptTermsDto, { signedByName: 'Ana', signedByEmail: 'nao-e-email' })).toBe(400);
  });
  it('promocoes', async () => {
    const ok = { employeeId: UUID, newSalary: '5.500,00', effectiveDate: '2026-12-01', newPosition: 'Senior' };
    expect(await status(PromotionDto, ok)).toBe(200);
    expect(await status(PromotionDto, { ...ok, newSalary: 5500.5 })).toBe(200);
    expect(await status(PromotionDto, { ...ok, newSalary: -10 })).toBe(400);
    expect(await status(PromotionDto, { ...ok, newSalary: 'abc' })).toBe(400);
    expect(await status(PromotionDto, { ...ok, employeeId: 'x' })).toBe(400);
    expect(await status(PromotionDto, { ...ok, companyId: UUID })).toBe(400);
  });
  it('regras de deducao (value/maxAmount)', async () => {
    expect(await status(DeductionRuleDto, { name: 'VT', value: 6, maxAmount: null })).toBe(200);
    expect(await status(DeductionRuleDto, { name: 'VT', value: '6,5' })).toBe(200);
    expect(await status(DeductionRuleDto, { name: 'VT', value: 'abc' })).toBe(400);
    expect(await status(DeductionRuleDto, { name: 'VT', value: -3 })).toBe(400);
    expect(await status(DeductionRuleDto, { name: 'VT', value: 5, maxAmount: { $gt: 1 } })).toBe(400);
  });
  it('planos (dinheiro)', async () => {
    expect(await status(PlanPayloadDto, { name: 'Pro', price: '29,90', userMonthlyPrice: 5 })).toBe(200);
    expect(await status(PlanPayloadDto, { name: 'Pro', price: 'grátis' })).toBe(400);
    expect(await status(PlanPayloadDto, { name: 'Pro', baseMonthlyPrice: -1 })).toBe(400);
    expect(await status(PlanPayloadDto, { name: 'Pro', discountPercent: true })).toBe(400);
  });
  it('empresa da plataforma: activeModules precisa ser lista de textos', async () => {
    expect(await status(UpdatePlatformCompanyDto, { activeModules: ['ponto'] })).toBe(200);
    expect(await status(UpdatePlatformCompanyDto, { activeModules: 'x' })).toBe(400);
    expect(await status(UpdatePlatformCompanyDto, { activeModules: [1, 2] })).toBe(400);
  });
  it('prioridade do chamado e transicao de comissao viram DTO', async () => {
    expect(await status(UpdateSupportPriorityDto, { priority: 'HIGH' })).toBe(200);
    expect(await status(UpdateSupportPriorityDto, { priority: 'MEDIUM' })).toBe(400); // nao existe no enum Prisma
    expect(await status(UpdateSupportPriorityDto, {})).toBe(400);
    expect(await status(CommissionTransitionDto, { paymentReference: 'PIX-1' })).toBe(200);
    expect(await status(CommissionTransitionDto, { paymentReference: 42 })).toBe(400);
  });
  it('controllers recebem CLASSE (nao interface) como corpo', () => {
    const types = (c: any, m: string) => Reflect.getMetadata('design:paramtypes', c.prototype, m) as any[];
    expect(types(ProposalsController, 'createProposal')).toContain(CreateProposalDto);
    expect(types(ProposalsController, 'acceptTerms')).toContain(AcceptTermsDto);
    expect(types(PromotionsController, 'create')).toContain(PromotionDto);
    expect(types(PlatformSupportController, 'updatePriority')).toContain(UpdateSupportPriorityDto);
  });
});

describe('API-02 ParseUUIDPipe nos parametros que sao UUID', () => {
  const ROOT = join(__dirname, '../../apps/api/src/modules');
  // finance/ e auth/ pertencem a outros grupos; os nomes abaixo sao sempre chaves uuid no schema.prisma.
  const SKIP = ['finance/', 'auth/'];
  const UUID_PARAMS = ['id', 'companyId', 'employeeId', 'userId', 'jobId', 'taskId', 'interviewId', 'ceoUserId'];
  function controllers(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const full = join(dir, n);
      if (statSync(full).isDirectory()) return controllers(full);
      return n.endsWith('.controller.ts') ? [full] : [];
    });
  }
  it('nenhum @Param de id uuid fica sem ParseUUIDPipe', () => {
    const bad: string[] = [];
    for (const file of controllers(ROOT)) {
      const rel = relative(ROOT, file).split(sep).join('/');
      if (SKIP.some((s) => rel.startsWith(s))) continue;
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(new RegExp(`@Param\\('(${UUID_PARAMS.join('|')})'\\)`, 'g'))) bad.push(`${rel}:${src.slice(0, m.index).split('\n').length}`);
    }
    expect(bad).toEqual([]);
  });
});
