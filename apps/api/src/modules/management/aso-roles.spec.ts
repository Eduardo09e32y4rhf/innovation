import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AsoController } from './aso.controller';

/** Roda o RolesGuard real contra o metadado @Roles de cada rota do AsoController. */
function pode(handler: keyof AsoController, role: string): boolean {
  const guard = new RolesGuard(new Reflector());
  const ctx = {
    getHandler: () => AsoController.prototype[handler],
    getClass: () => AsoController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
  try { return guard.canActivate(ctx); } catch (e) { if (e instanceof ForbiddenException) return false; throw e; }
}

const LEITURA: Array<keyof AsoController> = ['list', 'listByEmployee', 'rhAlerts', 'listClinicPresets', 'find'];
const ESCRITA: Array<keyof AsoController> = ['createClinicPreset', 'deleteClinicPreset', 'create', 'update', 'delete'];
const LEITORES = ['DEV', 'ADMIN', 'RH', 'GESTOR', 'CEO', 'CONSULTA'];
const ESCRITORES = ['DEV', 'ADMIN', 'RH'];
const NEGADOS = ['GESTOR', 'CEO', 'CONSULTA', 'RH_RS', 'FUNCIONARIO', 'CONTABIL', 'COMERCIAL'];

describe('ASO: matriz de perfis', () => {
  for (const h of LEITURA) it(`leitura ${String(h)} segue aberta aos perfis atuais`, () => {
    for (const r of LEITORES) expect(pode(h, r), `${r} ${String(h)}`).toBe(true);
  });
  for (const h of ESCRITA) it(`escrita ${String(h)}: so DEV, ADMIN, RH`, () => {
    for (const r of ESCRITORES) expect(pode(h, r), `${r} ${String(h)}`).toBe(true);
    for (const r of NEGADOS) expect(pode(h, r), `${r} ${String(h)}`).toBe(false);
  });
});
