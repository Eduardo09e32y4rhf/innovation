import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AccountingAccessService } from '../../common/accounting-access';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { TimeZoneService } from '../../common/services/timezone.service';
import { TimeOccurrencesController } from '../time-track/time-occurrences.controller';
import { TimeTrackController } from '../time-track/time-track.controller';
import { AccountingController } from './accounting.controller';
import { AccountingHubService } from './accounting-hub.service';
import { AccountingOfficeService } from './accounting-office.service';
import { AccountingTimeSheetService, resolveMonthSaoPaulo } from './accounting-time-sheet.service';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const EMP_A = '33333333-3333-4333-8333-333333333333';
const EMP_B = '44444444-4444-4444-8444-444444444444';
const ID_B = '55555555-5555-4555-8555-555555555555'; // recurso (fechamento/folha/tarefa/doc/fee) da empresa B
const accountant = { sub: 'acc-1', role: 'CONTABIL', companyId: 'own', email: 'c@x.test' } as any;
const dev = { sub: 'dev-1', role: 'DEV', companyId: 'own', email: 'd@x.test' } as any;
const ceo = { sub: 'ceo-1', role: 'CEO', companyId: 'own', email: 'e@x.test' } as any;

const fakePrisma = () => {
  const links = [{ id: 'l1', companyId: A, responsibleId: 'acc-1' }, { id: 'l2', companyId: B, responsibleId: 'other-accountant' }];
  const recordB = { id: ID_B, companyId: B, status: 'DRAFT', grossSalary: 1, netSalary: 1 };
  const prisma: any = {
    accountingClient: {
      findFirst: vi.fn(async ({ where }: any) => links.find((l) => l.companyId === where.companyId && l.responsibleId === where.responsibleId) ?? null),
      findMany: vi.fn(async ({ where }: any = {}) => links.filter((l) => !where?.responsibleId || l.responsibleId === where.responsibleId)),
      findUnique: vi.fn(async () => null),
    },
    company: { findUnique: vi.fn(async ({ where }: any) => ({ id: where.id, name: `Empresa ${where.id}`, document: null, logoUrl: null })), findMany: vi.fn(async () => []) },
    timeClosing: { findUnique: vi.fn(async () => recordB), findMany: vi.fn(async () => []), groupBy: vi.fn(async () => []) },
    payroll: { findFirst: vi.fn(async () => ({ ...recordB, employee: { name: 'x', dependents: null } })), findMany: vi.fn(async () => []), groupBy: vi.fn(async () => []) },
    accountingTask: { findUnique: vi.fn(async () => recordB), findMany: vi.fn(async () => []), groupBy: vi.fn(async () => []), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    accountingDocRequest: { findUnique: vi.fn(async () => recordB), findMany: vi.fn(async () => []), groupBy: vi.fn(async () => []), createMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    accountingFee: { findUnique: vi.fn(async () => recordB), findMany: vi.fn(async () => []), update: vi.fn() },
    accountingChecklistItem: { groupBy: vi.fn(async () => []), findMany: vi.fn(async () => []), upsert: vi.fn() },
    platformInvoice: { findMany: vi.fn(async () => []) }, paymentRefund: { findMany: vi.fn(async () => []) }, invoiceAdjustment: { findMany: vi.fn(async () => []) },
    employee: { findMany: vi.fn(async () => []), findFirst: vi.fn(async ({ where }: any) => (where.id === EMP_A && where.companyId === A ? { id: EMP_A, name: 'Ana', position: 'Op' } : null)) },
    timeOccurrence: { findMany: vi.fn(async () => []) },
    overtimeBank: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => ({ balanceMinutes: 90 })) },
    auditLog: { create: vi.fn() },
  };
  return prisma;
};

function build() {
  const prisma = fakePrisma();
  const access = new AccountingAccessService(prisma);
  const rules: any = { list: vi.fn(async () => ({ rules: [] })) };
  const closing: any = { adjust: vi.fn(), generate: vi.fn(async () => []), submitReview: vi.fn(), approve: vi.fn(), conference: vi.fn(async () => ({ employees: [] })) };
  const hub = new AccountingHubService(prisma, {} as any, closing, rules, access);
  const office = new AccountingOfficeService(prisma, access);
  const tracks: any = { list: vi.fn(async () => []), listEmployeeMonth: vi.fn(async () => []) };
  const sheets = new AccountingTimeSheetService(prisma, access, tracks, closing, new TimeZoneService());
  const ledger: any = { month: vi.fn(async () => ({})) };
  const controller = new AccountingController(hub, rules, office, ledger, sheets, access, {} as any);
  return { prisma, access, controller, closing, tracks, sheets };
}

/** Todas as rotas de /accounting que tocam dados de uma empresa, chamadas com a empresa B (que o contador NÃO atende). */
const routesForB = (c: AccountingController, u: any): Array<[string, () => Promise<unknown>]> => [
  ['GET overview?companyId', async () => c.overview(u, { companyId: B, month: '2026-10' } as any)],
  ['GET platform-ledger?companyId', async () => c.platformLedger(u, { companyId: B } as any)],
  ['GET report/pdf?companyId', async () => c.report(u, { companyId: B } as any, {})],
  ['POST closings/recalculate', async () => c.recalculateClosings(u, { companyId: B, month: '2026-10' } as any)],
  ['PATCH closings/:id/adjust', async () => c.adjustClosing(u, ID_B, { field: 'overtime50', newValue: 1, reason: 'x' } as any)],
  ['POST closings/:id/workflow', async () => c.closingWorkflow(u, ID_B, { action: 'APPROVE' } as any)],
  ['POST payroll/:id/workflow', async () => c.payrollWorkflow(u, ID_B, { action: 'APPROVE' } as any)],
  ['POST payroll/:id/recalculate', async () => c.recalculatePayroll(u, ID_B)],
  ['PUT payroll/:id', async () => c.correctPayroll(u, ID_B, { baseSalary: 1, reason: 'x' } as any)],
  ['GET office/clients/:companyId', async () => c.getClient(u, B)],
  ['PUT office/clients/:companyId', async () => c.saveClient(u, B, { monthlyFee: 1 } as any)],
  ['GET office/clients/:companyId/checklist', async () => c.checklist(u, B, {} as any)],
  ['PUT office/clients/:companyId/checklist', async () => c.toggleChecklist(u, B, { month: '2026-10', itemKey: 'EXTRATOS', done: true } as any)],
  ['GET office/tasks?companyId', async () => c.listTasks(u, undefined, B)],
  ['POST office/tasks', async () => c.createTask(u, { companyId: B, title: 't' } as any)],
  ['PATCH office/tasks/:id', async () => c.updateTask(u, ID_B, { status: 'DONE' } as any)],
  ['DELETE office/tasks/:id', async () => c.deleteTask(u, ID_B)],
  ['GET office/docs?companyId', async () => c.listDocs(u, undefined, B)],
  ['POST office/docs', async () => c.createDocs(u, { companyId: B, month: '2026-10', items: [{ title: 'x' }] } as any)],
  ['PATCH office/docs/:id', async () => c.updateDoc(u, ID_B, { status: 'RECEIVED' } as any)],
  ['DELETE office/docs/:id', async () => c.deleteDoc(u, ID_B)],
  ['PATCH office/fees/:id', async () => c.payFee(u, ID_B, { paid: true } as any)],
  ['GET companies/:companyId/time-sheets', async () => c.companyTimeSheets(u, B, { month: '2026-10' })],
  ['GET companies/:companyId/employees/:employeeId/time-sheet', async () => c.employeeTimeSheet(u, B, EMP_B, { month: '2026-10' })],
];

describe('contador só acessa as empresas que atende', () => {
  const { controller } = build();
  const names = routesForB(controller, accountant).map(([n]) => n);

  it.each(names)('contador da empresa A recebe 404 em %s da empresa B', async (name) => {
    const ctx = build();
    const call = routesForB(ctx.controller, accountant).find(([n]) => n === name)![1];
    await expect(call()).rejects.toBeInstanceOf(NotFoundException);
    // nada foi gravado/alterado
    expect(ctx.prisma.timeClosing.findMany).not.toHaveBeenCalled();
    expect(ctx.closing.adjust).not.toHaveBeenCalled();
    expect(ctx.prisma.accountingFee.update).not.toHaveBeenCalled();
    expect(ctx.prisma.accountingTask.update).not.toHaveBeenCalled();
    expect(ctx.prisma.accountingTask.create).not.toHaveBeenCalled();
    expect(ctx.prisma.accountingDocRequest.update).not.toHaveBeenCalled();
    expect(ctx.prisma.accountingChecklistItem.upsert).not.toHaveBeenCalled();
  });

  it('a resposta 404 de empresa sem acesso é igual à de empresa inexistente (não revela existência)', async () => {
    const ctx = build();
    ctx.prisma.company.findUnique.mockResolvedValue(null);
    const noAccess = await ctx.controller.getClient(accountant, B).catch((e) => e);
    const missing = await ctx.controller.getClient(dev, '99999999-9999-4999-8999-999999999999').catch((e) => e);
    expect(noAccess.getStatus()).toBe(404);
    expect(noAccess.message).toBe(missing.message);
  });

  it('listas globais ficam restritas às empresas do contador', async () => {
    const ctx = build();
    await ctx.controller.overview(accountant, {} as any);
    expect(ctx.prisma.company.findMany.mock.calls[0][0].where).toEqual({ id: { in: [A] } });
    await ctx.controller.listFees(accountant, {} as any);
    expect(ctx.prisma.accountingFee.findMany.mock.calls[0][0].where.companyId).toEqual({ in: [A] });
    await ctx.controller.listDocs(accountant);
    expect(ctx.prisma.accountingDocRequest.findMany.mock.calls[0][0].where.companyId).toEqual({ in: [A] });
    await ctx.controller.officeDashboard(accountant, {} as any);
    expect(ctx.prisma.accountingClient.findMany.mock.calls.at(-1)![0].where).toEqual({ companyId: { in: [A] } });
  });

  it('contador acessa a própria empresa A', async () => {
    const ctx = build();
    await expect(ctx.controller.companyTimeSheets(accountant, A, { month: '2026-10' })).resolves.toMatchObject({ company: { id: A }, period: { key: '2026-10' } });
    await expect(ctx.controller.employeeTimeSheet(accountant, A, EMP_A, { month: '2026-10' })).resolves.toMatchObject({ employee: { id: EMP_A } });
  });

  it('funcionário de outra empresa na rota da empresa A também dá 404', async () => {
    const ctx = build();
    await expect(ctx.controller.employeeTimeSheet(accountant, A, EMP_B, { month: '2026-10' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DEV e CEO enxergam tudo', () => {
  it.each([['DEV', dev], ['CEO', ceo]])('%s lê a folha de ponto de qualquer empresa', async (_n, user) => {
    const ctx = build();
    await expect(ctx.controller.companyTimeSheets(user, B, { month: '2026-10' })).resolves.toMatchObject({ company: { id: B } });
    await expect(ctx.controller.getClient(user, B)).resolves.toBeTruthy();
    await ctx.controller.overview(user, {} as any);
    expect(ctx.prisma.company.findMany.mock.calls[0][0].where).toBeUndefined();
  });

  it('outros perfis (ex.: ADMIN) não passam pelo helper', async () => {
    const { access } = build();
    await expect(access.assertAccountantCanAccess({ sub: 'x', role: 'ADMIN' } as any, A)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('mês no fuso America/Sao_Paulo (virada)', () => {
  const tz = new TimeZoneService();
  it('dia 1º 00:30 em São Paulo (03:30Z) já é o novo mês', () => {
    expect(resolveMonthSaoPaulo(tz, undefined, new Date('2026-10-01T03:30:00Z')).key).toBe('2026-10');
    expect(resolveMonthSaoPaulo(tz, undefined, new Date('2026-10-01T02:50:00Z')).key).toBe('2026-09'); // 23:50 de 30/09 em SP
  });
  it('último dia 23:50 em São Paulo (já é o dia 1º em UTC) continua no mês', () => {
    expect(resolveMonthSaoPaulo(tz, undefined, new Date('2026-11-01T02:50:00Z')).key).toBe('2026-10');
    const p = resolveMonthSaoPaulo(tz, '2026-10');
    expect(p.start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
  it('mês inválido -> 400', () => {
    expect(() => resolveMonthSaoPaulo(tz, '2026-13')).toThrow(/Mes invalido/);
  });

  it('batida 00:30 do dia 1º e 23:50 do último dia ficam nos dias certos, com horário de São Paulo', async () => {
    const ctx = build();
    ctx.tracks.listEmployeeMonth.mockResolvedValue([
      { date: new Date('2026-10-01T00:00:00Z'), entry: new Date('2026-10-01T03:30:00Z'), lunchStart: null, lunchReturn: null, exit: new Date('2026-10-01T12:00:00Z'), totalWorked: 510, dailyBalance: 30, overtime50Minutes: 30, overtime100Minutes: 0, nightShiftMinutes: 30, lateMinutes: 0, earlyLeaveMinutes: 0, absenceMinutes: 0, incidentType: null, overtimeApprovalStatus: 'APPROVED', overtimeHandling: 'PAYMENT', manualReason: null, manualStatus: 'approved', observation: null, latitude: -1, longitude: -2 },
      { date: new Date('2026-10-31T00:00:00Z'), entry: new Date('2026-10-31T21:00:00Z'), lunchStart: null, lunchReturn: null, exit: new Date('2026-11-01T02:50:00Z'), totalWorked: 350, dailyBalance: -10, overtime50Minutes: 0, overtime100Minutes: 0, nightShiftMinutes: 0, lateMinutes: 10, earlyLeaveMinutes: 0, absenceMinutes: 0, incidentType: 'atraso', overtimeApprovalStatus: 'PENDING', overtimeHandling: 'PAYMENT', manualReason: 'esqueceu', manualStatus: 'pending', observation: null, latitude: -1, longitude: -2 },
    ]);
    const sheet: any = await ctx.sheets.employeeSheet(accountant, A, EMP_A, '2026-10');
    expect(ctx.tracks.listEmployeeMonth).toHaveBeenCalledWith(A, EMP_A, new Date('2026-10-01T00:00:00Z'), new Date('2026-11-01T00:00:00Z'), 0, 62);
    expect(sheet.days.map((d: any) => d.date)).toEqual(['2026-10-01', '2026-10-31']);
    expect(sheet.days[0].punches.entry).toBe('00:30');
    expect(sheet.days[1].punches.exit).toBe('23:50');
    expect(sheet.days[1].manualAdjustment).toEqual({ reason: 'esqueceu', status: 'pending' });
    expect(sheet.totals).toMatchObject({ workedMinutes: 860, overtime50Minutes: 30, lateMinutes: 10, hourBankBalanceMinutes: 90 });
    expect(JSON.stringify(sheet)).not.toMatch(/latitude|longitude/);
  });

  it('resumo da empresa soma os números gravados pelo ponto e traz status do fechamento e banco de horas', async () => {
    const ctx = build();
    ctx.prisma.employee.findMany.mockResolvedValue([{ id: EMP_A, name: 'Ana', position: 'Op' }, { id: 'e2', name: 'Bia', position: null }]);
    ctx.tracks.list.mockResolvedValue([
      { employeeId: EMP_A, totalWorked: 480, overtime50Minutes: 60, overtime100Minutes: 30, nightShiftMinutes: 20, lateMinutes: 5, absenceMinutes: 0, dailyBalance: 90, incidentType: 'atraso' },
      { employeeId: EMP_A, totalWorked: 0, overtime50Minutes: 0, overtime100Minutes: 0, nightShiftMinutes: 0, lateMinutes: 0, absenceMinutes: 480, dailyBalance: -480, incidentType: 'falta' },
    ]);
    ctx.prisma.timeClosing.findMany.mockResolvedValue([{ employeeId: EMP_A, status: 'APPROVED', periodStart: new Date(), periodEnd: new Date() }]);
    ctx.prisma.overtimeBank.findMany.mockResolvedValue([{ employeeId: EMP_A, balanceMinutes: 120 }]);
    const out: any = await ctx.controller.companyTimeSheets(accountant, A, { month: '2026-10' });
    expect(out.employees[0]).toMatchObject({ name: 'Ana', workedMinutes: 480, overtime50Minutes: 60, overtime100Minutes: 30, nightShiftMinutes: 20, absenceDays: 1, lateMinutes: 5, hourBankBalanceMinutes: 120, closingStatus: 'APPROVED' });
    expect(out.employees[1]).toMatchObject({ name: 'Bia', closingStatus: 'NO_CLOSING', workedMinutes: 0 });
  });
});

describe('contador continua sem rota de escrita no ponto', () => {
  const rolesOf = (cls: any, key: string) => Reflect.getMetadata(ROLES_KEY, cls.prototype[key]) ?? Reflect.getMetadata(ROLES_KEY, cls) ?? [];
  const methods = (cls: any) => Object.getOwnPropertyNames(cls.prototype).filter((k) => k !== 'constructor');

  it('time-track e time-occurrences não liberam CONTABIL em nenhuma rota', () => {
    for (const cls of [TimeTrackController, TimeOccurrencesController]) {
      for (const key of methods(cls)) expect(rolesOf(cls, key), `${cls.name}.${key}`).not.toContain('CONTABIL');
    }
  });

  it('as rotas novas da contabilidade são apenas GET', () => {
    for (const key of ['companyTimeSheets', 'employeeTimeSheet']) {
      const method = Reflect.getMetadata('method', AccountingController.prototype[key as 'companyTimeSheets']);
      expect(method).toBe(0); // RequestMethod.GET
    }
  });

  it('o serviço de folha de ponto só usa leituras (nenhuma escrita no prisma)', async () => {
    const ctx = build();
    await ctx.sheets.companySheets(accountant, A, '2026-10');
    await ctx.sheets.employeeSheet(accountant, A, EMP_A, '2026-10');
    const writes = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];
    for (const model of Object.values(ctx.prisma) as any[]) for (const w of writes) if (model?.[w]) expect(model[w]).not.toHaveBeenCalled();
  });
});
