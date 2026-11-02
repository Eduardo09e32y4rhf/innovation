import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccountingController } from './accounting.controller';

/** Tabelas globais (INSS/IRRF/FGTS/parametros CLT = PayrollTaxTable): sem tenant, afetam todas as empresas. */
function pode(handler: keyof AccountingController, role: string): boolean {
  const guard = new RolesGuard(new Reflector());
  const ctx = {
    getHandler: () => AccountingController.prototype[handler],
    getClass: () => AccountingController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
  try { return guard.canActivate(ctx); } catch (e) { if (e instanceof ForbiddenException) return false; throw e; }
}

describe('tabelas globais de folha: escrita so DEV', () => {
  for (const h of ['saveRule', 'deactivateRule'] as const) it(`${h}: DEV passa; CONTABIL, CEO e demais recebem 403`, () => {
    expect(pode(h, 'DEV')).toBe(true);
    for (const r of ['CONTABIL', 'CEO', 'ADMIN', 'RH', 'GESTOR', 'CONSULTA', 'COMERCIAL', 'FUNCIONARIO']) expect(pode(h, r), r).toBe(false);
  });
  for (const h of ['listRules', 'simulate'] as const) it(`${h}: leitura segue para DEV, CEO e CONTABIL`, () => {
    for (const r of ['DEV', 'CEO', 'CONTABIL']) expect(pode(h, r), r).toBe(true);
    expect(pode(h, 'ADMIN')).toBe(false);
  });
});
