import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { AccountingPayrollController } from './accounting-payroll.controller';
import { AccountingPayrollItemsService } from './accounting-payroll-items.service';

const actor = { sub: 'acc-1', role: 'CONTABIL', email: 'c@x.test' } as any;
const payroll = { id: 'p1', companyId: 'c1', baseSalary: 3000, status: 'DRAFT', employee: { name: 'Ana', dependents: null } };

function build(recalc: { gross: number; inss: number; irrf: number }) {
  const created: any[] = [];
  const tx: any = {
    payroll: { findUnique: vi.fn(async () => payroll), update: vi.fn() },
    payrollItem: {
      create: vi.fn(async ({ data }: any) => { const row = { id: 'i1', ...data }; created.push(row); return row; }),
      update: vi.fn(), delete: vi.fn(),
      findMany: vi.fn(async () => created),
    },
    auditLog: { create: vi.fn() },
  };
  const prisma: any = { $transaction: vi.fn(async (fn: any) => fn(tx)), payrollItem: { findFirst: vi.fn(async ({ where }: any) => (where.id === 'tax' ? { id: 'tax', type: 'INSS', amount: 1 } : null)) } };
  const hub: any = {
    loadEditablePayroll: vi.fn(async () => payroll),
    recalcPayrollRow: vi.fn(async () => ({ updated: payroll, result: { grossPay: recalc.gross, inssDiscount: recalc.inss, irrfDiscount: recalc.irrf, fgtsAmount: 0, netPay: 0 } })),
  };
  return { service: new AccountingPayrollItemsService(prisma, hub), tx, prisma, hub };
}

describe('folha manual da contabilidade', () => {
  it('só DEV, CEO e CONTABIL acessam', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AccountingPayrollController)).toEqual(['DEV', 'CEO', 'CONTABIL']);
  });

  it('inclui linha manual com motivo, autoria e marca como manual, depois recalcula pelo motor único', async () => {
    const { service, tx, hub } = build({ gross: 3000, inss: 250, irrf: 0 });
    const out = await service.add(actor, 'p1', { type: 'BONUS', description: 'Bônus de meta', amount: 200, reason: 'meta batida' });
    expect(tx.payrollItem.create.mock.calls[0][0].data).toMatchObject({ type: 'BONUS', isManual: true, manualReason: 'meta batida', editedById: 'acc-1', isDeduction: false });
    expect(hub.recalcPayrollRow).toHaveBeenCalled();
    expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'ACCOUNTING_PAYROLL_ITEM_ADDED', userId: 'acc-1' });
    expect(out.limitWarnings).toEqual([]);
  });

  it('exige motivo', async () => {
    const { service } = build({ gross: 3000, inss: 250, irrf: 0 });
    await expect(service.add(actor, 'p1', { type: 'BONUS', amount: 10, reason: '  ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('consignado acima de 35% é barrado sem forceLimit e passa com justificativa', async () => {
    const blocked = build({ gross: 3000, inss: 250, irrf: 0 }); // 35% de 2750 = 962,50
    await expect(blocked.service.add(actor, 'p1', { type: 'CONSIGNADO', amount: 1200, reason: 'contrato 55' })).rejects.toMatchObject({ response: { code: 'LIMIT_EXCEEDED' } });
    const forced = build({ gross: 3000, inss: 250, irrf: 0 });
    const out = await forced.service.add(actor, 'p1', { type: 'CONSIGNADO', amount: 1200, reason: 'contrato 55', forceLimit: true });
    expect(out.limitWarnings).toHaveLength(1);
    expect(forced.tx.payrollItem.update.mock.calls[0][0].data.manualReason).toContain('contrato 55');
    expect(forced.tx.auditLog.create.mock.calls[0][0].data.metadata.forcedLimit).toBe(true);
  });

  it('consignado dentro da margem passa; VT acima de 6% do salário é barrado', async () => {
    const ok = build({ gross: 3000, inss: 250, irrf: 0 });
    await expect(ok.service.add(actor, 'p1', { type: 'CONSIGNADO', amount: 900, reason: 'contrato 55' })).resolves.toBeTruthy();
    const vt = build({ gross: 3000, inss: 250, irrf: 0 });
    await expect(vt.service.add(actor, 'p1', { type: 'VALE_TRANSPORTE', amount: 200, reason: 'desconto VT' })).rejects.toMatchObject({ response: { code: 'LIMIT_EXCEEDED' } });
  });

  it('impostos não podem ser digitados nem removidos', async () => {
    const { service } = build({ gross: 1, inss: 0, irrf: 0 });
    await expect(service.update(actor, 'p1', 'tax', { amount: 10, reason: 'ajuste manual' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.remove(actor, 'p1', 'tax', 'quero remover')).rejects.toBeInstanceOf(BadRequestException);
  });
});
