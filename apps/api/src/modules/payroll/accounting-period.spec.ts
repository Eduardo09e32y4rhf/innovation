import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AccountingAccessService } from '../../common/accounting-access';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { AccountingController } from '../accounting/accounting.controller';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { TimeClosingService } from '../time-track/time-closing.service';
import { AccountingPeriodService, parseCompetence } from './accounting-period.service';
import { PayrollPeriodsController } from './payroll-periods.controller';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const MONTH = '2026-10';
const accountant = { sub: 'acc-1', role: 'CONTABIL', companyId: 'acc-co', email: 'c@x.test' } as any;
const rh = { sub: 'rh-1', role: 'RH', companyId: A, email: 'rh@x.test' } as any;
const rhB = { sub: 'rh-b', role: 'RH', companyId: B, email: 'rhb@x.test' } as any;

const employees = [{ id: 'e1', name: 'Ana', gross: 3000 }, { id: 'e2', name: 'Bia', gross: 4000 }];
const netOf = (gross: number) => Math.round(gross * 0.85 * 100) / 100;

/** Banco em memória + motores de ponto/folha simulados: o que se testa aqui é a orquestração e a máquina de estados. */
function build() {
  const db = { periods: [] as any[], closings: [] as any[], adjustments: [] as any[], payrolls: [] as any[], audit: [] as any[], notifications: [] as any[], mails: [] as any[], notices: [] as any[], seq: 0 };
  const id = (p: string) => `${p}-${++db.seq}`;
  const matchPeriod = (row: any, where: any) => row.companyId === where.companyId && row.month === where.month;

  const prisma: any = {
    company: { findUnique: vi.fn(async ({ where }: any) => ({ id: where.id, slug: 'acme', name: 'Acme' })) },
    accountingPeriod: {
      findUnique: vi.fn(async ({ where }: any) => db.periods.find((p) => matchPeriod(p, where.companyId_month)) ?? null),
      findMany: vi.fn(async ({ where }: any) => db.periods.filter((p) => p.companyId === where.companyId && where.month.in.includes(p.month))),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const found = db.periods.find((p) => matchPeriod(p, where.companyId_month));
        if (found) { Object.assign(found, update); return found; }
        const row = { id: id('per'), returnComment: null, ...create }; db.periods.push(row); return row;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const found = db.periods.find((p) => p.id === where.id && (typeof where.status === 'string' ? p.status === where.status : where.status.in.includes(p.status)));
        if (found) Object.assign(found, data);
        return { count: found ? 1 : 0 };
      }),
    },
    timeClosing: {
      findMany: vi.fn(async ({ where }: any) => db.closings.filter((c) => c.companyId === where.companyId && +c.periodStart === +where.periodStart && +c.periodEnd === +where.periodEnd)
        .map((c) => ({ ...c, employee: { name: employees.find((e) => e.id === c.employeeId)!.name }, _count: { adjustments: db.adjustments.filter((a) => a.timeClosingId === c.id).length } }))),
      updateMany: vi.fn(async ({ where, data }: any) => { db.closings.filter((c) => where.id.in.includes(c.id)).forEach((c) => Object.assign(c, data)); return { count: 1 }; }),
    },
    timeClosingAdjustment: { findMany: vi.fn(async ({ where }: any) => db.adjustments.filter((a) => where.timeClosingId.in.includes(a.timeClosingId))) },
    payroll: {
      findMany: vi.fn(async ({ where }: any) => db.payrolls.filter((p) => p.companyId === where.companyId && p.referenceMonth === where.referenceMonth && p.status !== 'CANCELLED' && (!where.employeeId || where.employeeId.in.includes(p.employeeId)))),
    },
    auditLog: { create: vi.fn(async ({ data }: any) => { db.audit.push(data); }) },
    user: {
      findMany: vi.fn(async () => [{ email: 'admin@acme.test' }, { email: 'rh@acme.test' }]),
      findUnique: vi.fn(async () => ({ id: 'acc-1', companyId: 'acc-co', email: 'c@x.test', isActive: true })),
    },
    accountingClient: { findFirst: vi.fn(async () => ({ responsibleId: 'acc-1' })) },
    notification: { create: vi.fn(async ({ data }: any) => { db.notifications.push(data); }) },
  };

  const closing: any = {
    generate: vi.fn(async (companyId: string, _actor: any, dto: any) => {
      const start = new Date(`${dto.periodStart}T00:00:00.000Z`); const end = new Date(`${dto.periodEnd}T00:00:00.000Z`);
      const out = [];
      for (const e of employees) {
        const old = db.closings.findIndex((c) => c.companyId === companyId && c.employeeId === e.id && +c.periodStart === +start);
        if (old >= 0) { db.adjustments = db.adjustments.filter((a) => a.timeClosingId !== db.closings[old].id); db.closings.splice(old, 1); }
        const row = { id: id('cl'), companyId, employeeId: e.id, periodStart: start, periodEnd: end, status: 'DRAFT', salaryBase: e.gross, grossPay: e.gross, netPay: netOf(e.gross), inssDiscount: e.gross * 0.08, irrfDiscount: 0, fgtsAmount: e.gross * 0.08 };
        db.closings.push(row); out.push(row);
      }
      return out;
    }),
    adjust: vi.fn(async (_c: string, actor: any, closingId: string, dto: any) => {
      const row = db.closings.find((c) => c.id === closingId)!;
      db.adjustments.push({ id: id('adj'), timeClosingId: closingId, field: dto.field, newValue: dto.newValue, reason: dto.reason, changedBy: actor.sub, createdAt: new Date(db.seq) });
      if (dto.field === 'salaryBase') { row.grossPay = Number(dto.newValue); row.netPay = netOf(row.grossPay); }
      return row;
    }),
    submitReview: vi.fn(async (_c: string, cid: string) => { db.closings.find((c) => c.id === cid)!.status = 'IN_REVIEW'; }),
    approve: vi.fn(async (_c: string, cid: string) => { db.closings.find((c) => c.id === cid)!.status = 'APPROVED'; }),
    close: vi.fn(async (_c: string, _a: any, cid: string) => { db.closings.find((c) => c.id === cid)!.status = 'CLOSED'; }),
    reopen: vi.fn(async (_c: string, _a: any, cid: string) => { db.closings.find((c) => c.id === cid)!.status = 'DRAFT'; }),
  };
  const payroll: any = {
    create: vi.fn(async (companyId: string, dto: any) => {
      const created = dto.employeeIds.map((employeeId: string) => { const row = { id: id('pr'), companyId, employeeId, referenceMonth: 10, referenceYear: 2026, status: 'DRAFT', items: [] as any[] }; db.payrolls.push(row); return row; });
      return { created, failed: [] };
    }),
    update: vi.fn(async (_c: string, pid: string, dto: any) => { const row = db.payrolls.find((p) => p.id === pid)!; if (dto.items) row.items = dto.items; return row; }),
    reopen: vi.fn(async (_c: string, pid: string) => { db.payrolls.find((p) => p.id === pid)!.status = 'DRAFT'; }),
    approve: vi.fn(async (_c: string, pid: string) => { db.payrolls.find((p) => p.id === pid)!.status = 'APPROVED'; }),
    markPaid: vi.fn(async (_c: string, pid: string) => { db.payrolls.find((p) => p.id === pid)!.status = 'PAID'; }),
  };
  const mail: any = { send: vi.fn(async (to: string, content: any) => { db.mails.push({ to, subject: content.subject }); return { sent: true }; }) };
  const notifications: any = { createSystemNotice: vi.fn(async (companyId: string, input: any) => { db.notices.push({ companyId, ...input }); return { count: 2 }; }) };

  const service = new AccountingPeriodService(prisma, closing, payroll, mail, notifications);
  const access = new AccountingAccessService({
    accountingClient: { findFirst: vi.fn(async ({ where }: any) => (where.companyId === A && where.responsibleId === 'acc-1' ? { id: 'l1' } : null)), findMany: vi.fn(async () => []) },
  } as any);
  const accounting = new AccountingController({} as any, {} as any, {} as any, {} as any, {} as any, access, service);
  const rhController = new PayrollPeriodsController(service);
  return { db, prisma, service, closing, payroll, mail, notifications, accounting, rhController };
}

const actions = (db: any) => db.audit.map((row: any) => row.action);

describe('fluxo do mês: contador -> RH', () => {
  it('calcula fechamentos e folhas de todos os funcionários e deixa CALCULATED com totais', async () => {
    const { service, db, payroll } = build();
    const view = await service.calculate(accountant, A, MONTH);
    expect(view.status).toBe('CALCULATED');
    expect(db.closings).toHaveLength(2);
    expect(payroll.create).toHaveBeenCalledWith(A, expect.objectContaining({ employeeIds: ['e1', 'e2'], periodStart: '2026-10-01', periodEnd: '2026-10-31' }));
    expect(view.totals).toMatchObject({ gross: 7000, net: 5950, discounts: 1050, employees: 2 });
    expect(view.employees.map((e) => e.name)).toEqual(['Ana', 'Bia']);
    expect(view.employees[0]).toMatchObject({ gross: 3000, discounts: 450, net: 2550, hasManualAdjustment: false });
  });

  it('percorre o fluxo completo preservando o ajuste manual no recálculo', async () => {
    const { service, db, closing } = build();
    await service.calculate(accountant, A, MONTH);
    const ana = db.closings.find((c) => c.employeeId === 'e1')!;
    await closing.adjust(A, accountant, ana.id, { field: 'salaryBase', newValue: '3500', reason: 'Reajuste' });

    let view = await service.publish(accountant, A, MONTH);
    expect(view.status).toBe('PUBLISHED');
    expect(db.closings.every((c) => c.status === 'APPROVED')).toBe(true);
    expect(db.payrolls.every((p) => p.status === 'APPROVED')).toBe(true);

    view = await service.returnToAccountant(rh, A, MONTH, 'Conferir o salário da Bia');
    expect(view.status).toBe('RETURNED');
    expect(view.returnComment).toBe('Conferir o salário da Bia');
    expect(db.closings.every((c) => c.status === 'DRAFT')).toBe(true);

    view = await service.calculate(accountant, A, MONTH);
    expect(view.status).toBe('CALCULATED');
    expect(view.reappliedAdjustments).toBe(1);
    const anaEmployee = view.employees.find((e) => e.employeeId === 'e1')!;
    expect(anaEmployee).toMatchObject({ gross: 3500, hasManualAdjustment: true });
    expect(view.employees.find((e) => e.employeeId === 'e2')!.hasManualAdjustment).toBe(false);

    expect((await service.publish(accountant, A, MONTH)).status).toBe('PUBLISHED');
    expect((await service.release(rh, A, MONTH)).status).toBe('RELEASED');
    view = await service.markPaid(rh, A, MONTH);
    expect(view.status).toBe('PAID');
    expect(db.payrolls.every((p) => p.status === 'PAID')).toBe(true);
    expect(db.closings.every((c) => c.status === 'CLOSED')).toBe(true);
    expect(actions(db)).toEqual([
      'ACCOUNTING_PERIOD_CALCULATED', 'ACCOUNTING_PERIOD_PUBLISHED', 'ACCOUNTING_PERIOD_RETURNED', 'ACCOUNTING_PERIOD_CALCULATED',
      'ACCOUNTING_PERIOD_PUBLISHED', 'ACCOUNTING_PERIOD_RELEASED', 'ACCOUNTING_PERIOD_PAID',
    ]);
  });

  it('discardManual descarta os ajustes e recalcula do zero', async () => {
    const { service, db, closing, payroll } = build();
    await service.calculate(accountant, A, MONTH);
    await closing.adjust(A, accountant, db.closings[0].id, { field: 'salaryBase', newValue: '9999', reason: 'x' });
    db.payrolls[0].items = [{ type: 'BONUS', description: 'Bônus' }];
    const view = await service.calculate(accountant, A, MONTH, true);
    expect(view.reappliedAdjustments).toBe(0);
    expect(view.totals.gross).toBe(7000);
    expect(view.employees.every((e) => !e.hasManualAdjustment || e.employeeId === 'e1')).toBe(true);
    expect(payroll.update).toHaveBeenLastCalledWith(A, expect.any(String), { items: [] });
  });

  it('recalcular sem discardManual mantém os lançamentos manuais da folha', async () => {
    const { service, payroll } = build();
    await service.calculate(accountant, A, MONTH);
    await service.calculate(accountant, A, MONTH);
    expect(payroll.update).toHaveBeenCalledWith(A, expect.any(String), {});
  });

  it('publicar notifica ADMIN e RH da empresa no sino e por e-mail', async () => {
    const { service, notifications, mail } = build();
    await service.calculate(accountant, A, MONTH);
    await service.publish(accountant, A, MONTH);
    expect(notifications.createSystemNotice).toHaveBeenCalledWith(A, expect.objectContaining({ targetRoles: ['ADMIN', 'RH'] }));
    expect(mail.send).toHaveBeenCalledTimes(2);
  });

  it('devolver notifica o contador responsável (sino na empresa dele e e-mail)', async () => {
    const { service, db } = build();
    await service.calculate(accountant, A, MONTH);
    await service.publish(accountant, A, MONTH);
    await service.returnToAccountant(rh, A, MONTH, 'Faltou a hora extra');
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]).toMatchObject({ companyId: 'acc-co', recipients: { create: [{ userId: 'acc-1', status: 'UNREAD' }] } });
    expect(db.notifications[0].message).toContain('Faltou a hora extra');
    expect(db.mails.at(-1)).toMatchObject({ to: 'c@x.test' });
  });
});

describe('transições inválidas (409 em português)', () => {
  it('publicar sem calcular', async () => {
    const { service } = build();
    await expect(service.publish(accountant, A, MONTH)).rejects.toThrow(/ainda não foi calculada/);
    await expect(service.publish(accountant, A, MONTH)).rejects.toBeInstanceOf(ConflictException);
  });

  it('publicar duas vezes e recalcular competência publicada', async () => {
    const { service } = build();
    await service.calculate(accountant, A, MONTH);
    await service.publish(accountant, A, MONTH);
    await expect(service.publish(accountant, A, MONTH)).rejects.toThrow(/Só é possível publicar uma competência calculada ou devolvida/);
    await expect(service.calculate(accountant, A, MONTH)).rejects.toThrow(/não pode ser recalculada/);
    await expect(service.calculate(accountant, A, MONTH)).rejects.toBeInstanceOf(ConflictException);
  });

  it('liberar e pagar fora de ordem; devolver depois de liberada', async () => {
    const { service } = build();
    await service.calculate(accountant, A, MONTH);
    await service.publish(accountant, A, MONTH);
    await expect(service.markPaid(rh, A, MONTH)).rejects.toThrow(/Não é possível registrar o pagamento/);
    await service.release(rh, A, MONTH);
    await expect(service.release(rh, A, MONTH)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.returnToAccountant(rh, A, MONTH, 'tarde demais')).rejects.toThrow(/Não é possível devolver/);
    await service.markPaid(rh, A, MONTH);
    await expect(service.markPaid(rh, A, MONTH)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.calculate(accountant, A, MONTH)).rejects.toBeInstanceOf(ConflictException);
  });

  it('liberar uma competência devolvida', async () => {
    const { service } = build();
    await service.calculate(accountant, A, MONTH);
    await service.publish(accountant, A, MONTH);
    await service.returnToAccountant(rh, A, MONTH, 'ajustar');
    await expect(service.release(rh, A, MONTH)).rejects.toThrow(/devolvida pelo RH/);
  });

  it('devolução exige comentário e competência precisa estar no formato AAAA-MM', async () => {
    const { service } = build();
    await service.calculate(accountant, A, MONTH);
    await service.publish(accountant, A, MONTH);
    await expect(service.returnToAccountant(rh, A, MONTH, '   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.returnToAccountant(rh, A, MONTH, '   ')).rejects.toThrow(/comentário/);
    expect(() => parseCompetence('2026-13')).toThrow(/Competência inválida/);
    await expect(service.viewForAccountant(A, 'outubro')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('isolamento', () => {
  it('contador sem vínculo com a empresa recebe 404 nas três rotas', async () => {
    const { accounting, db } = build();
    await expect(accounting.getPeriod(accountant, B, MONTH)).rejects.toBeInstanceOf(NotFoundException);
    await expect(accounting.calculatePeriod(accountant, B, MONTH, {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(accounting.publishPeriod(accountant, B, MONTH)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.closings).toHaveLength(0);
  });

  it('contador vinculado calcula e publica pelas rotas; DEV e CEO também passam', async () => {
    const { accounting } = build();
    expect((await accounting.calculatePeriod(accountant, A, MONTH, { discardManual: false })).status).toBe('CALCULATED');
    expect((await accounting.publishPeriod(accountant, A, MONTH)).status).toBe('PUBLISHED');
    expect((await accounting.getPeriod({ sub: 'dev', role: 'DEV' } as any, A, MONTH)).status).toBe('PUBLISHED');
  });

  it('RH de outra empresa recebe 404 e não altera a competência', async () => {
    const { service, rhController, db } = build();
    await service.calculate(accountant, A, MONTH);
    await service.publish(accountant, A, MONTH);
    await expect(rhController.get(B, MONTH)).rejects.toBeInstanceOf(NotFoundException);
    await expect(rhController.giveBack(B, rhB, MONTH, { comment: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(rhController.release(B, rhB, MONTH)).rejects.toBeInstanceOf(NotFoundException);
    await expect(rhController.paid(B, rhB, MONTH)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.periods[0].status).toBe('PUBLISHED');
  });

  it('RH não enxerga competência ainda não publicada (404)', async () => {
    const { service, rhController } = build();
    await expect(rhController.get(A, MONTH)).rejects.toBeInstanceOf(NotFoundException);
    await service.calculate(accountant, A, MONTH);
    await expect(rhController.get(A, MONTH)).rejects.toThrow(/ainda não publicou/);
    await service.publish(accountant, A, MONTH);
    expect((await rhController.get(A, MONTH)).status).toBe('PUBLISHED');
  });

  it('rotas do RH aceitam só DEV, ADMIN e RH', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PayrollPeriodsController)).toEqual(['DEV', 'ADMIN', 'RH']);
    expect(Reflect.getMetadata(ROLES_KEY, AccountingController)).toEqual(['DEV', 'CEO', 'CONTABIL']);
  });
});

describe('holerite do funcionário', () => {
  const closingRow = (periodEnd: string) => ({ id: 'c1', periodStart: new Date('2026-10-01T00:00:00.000Z'), periodEnd: new Date(`${periodEnd}T00:00:00.000Z`), status: 'APPROVED', grossPay: 3000, netPay: 2550, employee: { name: 'Ana' }, company: {} });
  const timeClosing = (periods: Array<{ month: string; status: string }>) => {
    const prisma: any = {
      employee: { findFirst: vi.fn(async () => ({ id: 'e1' })) },
      timeClosing: { findMany: vi.fn(async () => [closingRow('2026-10-31')]) },
      accountingPeriod: { findMany: vi.fn(async () => periods) },
    };
    return new TimeClosingService(prisma, new PayrollCalculationService());
  };
  const me = { sub: 'u1', role: 'FUNCIONARIO', companyId: A } as any;

  it.each(['DRAFT', 'CALCULATED', 'PUBLISHED', 'RETURNED'])('fica oculto com a competência %s', async (status) => {
    const service = timeClosing([{ month: MONTH, status }]);
    expect(await service.listMyPayslips(A, me)).toEqual([]);
  });

  it('o PDF também é negado antes da liberação', async () => {
    const service = timeClosing([{ month: MONTH, status: 'PUBLISHED' }]);
    await expect(service.streamMyPayslip(A, me, 'c1', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each(['RELEASED', 'PAID'])('aparece com a competência %s', async (status) => {
    const service = timeClosing([{ month: MONTH, status }]);
    expect(await service.listMyPayslips(A, me)).toHaveLength(1);
  });

  it('empresa sem AccountingPeriod no mês continua vendo o holerite como antes', async () => {
    expect(await timeClosing([]).listMyPayslips(A, me)).toHaveLength(1);
    expect(await timeClosing([{ month: '2026-09', status: 'PUBLISHED' }]).listMyPayslips(A, me)).toHaveLength(1);
  });
});
