import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformLedgerService } from '../accounting/platform-ledger.service';
import { getQueueToken } from '@nestjs/bull';
import { PrismaService } from '../../database/prisma.service';
import { TimeClosingService } from '../time-track/time-closing.service';
import { FiscalAdjustmentsService } from './fiscal-adjustments.service';
import { PlatformFinanceService } from './platform-finance.service';
import { PlatformAuditService } from '../platform-audit/platform-audit.service';
import { FinanceController } from './finance.controller';
import { buildMonthlyReport, reportToCsv, taxRatePercent, cycleMonths } from './platform-revenue-report';
import { PlatformRevenueReportService } from './platform-revenue-report.service';

type Row = Record<string, any>;
const matches = (row: Row, where: Row = {}): boolean => Object.entries(where).every(([key, cond]) => {
  const value = row[key];
  if (cond === undefined) return true;
  if (cond === null) return value === null || value === undefined;
  if (cond instanceof Date || typeof cond !== 'object') return value === cond;
  return Object.entries(cond as Row).every(([op, arg]) => {
    if (op === 'in') return (arg as any[]).includes(value);
    if (op === 'not') return arg === null ? value !== null && value !== undefined : value !== arg;
    if (op === 'gte') return value !== null && value !== undefined && value >= arg;
    if (op === 'lt') return value !== null && value !== undefined && value < arg;
    if (op === 'lte') return value !== null && value !== undefined && value <= arg;
    return true;
  });
});
const table = (rows: Row[]) => ({
  findMany: vi.fn(async ({ where }: any = {}) => rows.filter((row) => matches(row, where))),
  update: vi.fn(async ({ where, data }: any) => { Object.assign(rows.find((row) => row.id === where.id)!, data); return {}; }),
});

const D = (s: string) => new Date(s);
const inv = (over: Row): Row => ({ companyId: 'c1', planId: 'p1', provider: 'ASAAS', description: 'Mensalidade', amount: 100, status: 'PAID', paidAt: D('2026-09-10T15:00:00Z'),
  refundedAmount: 0, refundStatus: null, invoiceStatus: 'AUTHORIZED', invoiceNumber: '1', gatewayNetValue: 97, asaasPaymentId: `pay_${over.id}`, deletedAt: null, ...over });

function make(data: { invoices?: Row[]; refunds?: Row[]; adjustments?: Row[]; plans?: Row[] }, asaas: Row = { isConfigured: () => false }) {
  const prisma: any = {
    platformInvoice: table(data.invoices ?? []),
    paymentRefund: { findMany: vi.fn(async ({ where }: any) => (data.refunds ?? []).filter((r) => matches(r, { status: where.status, confirmedAt: where.confirmedAt, invoiceId: where.invoiceId }) && (!where.invoice || (data.invoices ?? []).some((i) => i.id === r.invoiceId)))) },
    invoiceAdjustment: table(data.adjustments ?? []),
    platformPlan: table(data.plans ?? [{ id: 'p1', name: 'Completo', cycle: 'MONTHLY', commitmentMonths: 1 }, { id: 'p2', name: 'Anual', cycle: 'YEARLY', commitmentMonths: 12 }]),
  };
  return { prisma, service: new PlatformRevenueReportService(prisma, asaas as any) };
}

describe('relatório mensal da receita da plataforma', () => {
  const base = {
    invoices: [
      inv({ id: 'a', amount: 100, gatewayNetValue: 96.5 }),
      inv({ id: 'b', companyId: 'c2', planId: 'p2', amount: 1200, gatewayNetValue: 1180, paidAt: D('2026-09-15T15:00:00Z') }),
    ],
  };

  it('soma recebimentos, taxas do gateway, impostos estimados e receita líquida', async () => {
    const { service } = make(base);
    const r = await service.monthly('2026-09');
    expect(r.totals).toMatchObject({ grossReceipts: 1300, refunds: 0, gatewayFees: 23.5, estimatedTaxes: 78, netRevenue: 1198.5 });
    expect(r.tax).toMatchObject({ ratePercent: 6, estimate: true });
    expect(r.tax.warning).toMatch(/Estimativa/);
  });

  it('fecha com o razão (platform-ledger): bruto, devoluções e líquido', async () => {
    const data = { ...base, refunds: [{ id: 'r1', invoiceId: 'a', amount: 40, confirmedAt: D('2026-09-20T12:00:00Z'), status: 'CONFIRMED' }] };
    data.invoices = [{ ...base.invoices[0], refundedAmount: 40 }, base.invoices[1]];
    const { service, prisma } = make(data);
    const r = await service.monthly('2026-09');
    const ledger = await new PlatformLedgerService(prisma).month('2026-09');
    expect(r.totals.grossReceipts).toBe(ledger.total.grossReceipts);
    expect(r.totals.refunds).toBe(ledger.total.refunds);
    expect(r.totals.grossReceipts - r.totals.refunds).toBeCloseTo(ledger.total.netRevenue, 2);
    expect(r.ledger.reconciles).toBe(true);
  });

  it('a soma das linhas por plano é igual aos totais', async () => {
    const { service } = make(base);
    const r = await service.monthly('2026-09');
    const sum = (key: 'grossReceipts' | 'gatewayFees' | 'estimatedTaxes' | 'netRevenue' | 'mrr') => Math.round(r.byPlan.reduce((acc, row) => acc + row[key] * 100, 0)) / 100;
    for (const key of ['grossReceipts', 'gatewayFees', 'estimatedTaxes', 'netRevenue', 'mrr'] as const) expect(sum(key)).toBe(r.totals[key]);
    expect(r.byPlan.map((row) => row.planName)).toEqual(['Anual', 'Completo']);
  });

  it('devolução reduz a receita no mês em que foi confirmada (imposto só sobre o que ficou)', async () => {
    const { service } = make({ invoices: [inv({ id: 'a', refundedAmount: 100, gatewayNetValue: 97 })], refunds: [{ id: 'r1', invoiceId: 'a', amount: 100, confirmedAt: D('2026-10-05T12:00:00Z'), status: 'CONFIRMED' }] });
    const oct = await service.monthly('2026-10');
    expect(oct.totals).toMatchObject({ grossReceipts: 0, refunds: 100, estimatedTaxes: 0, netRevenue: -100 });
    expect((await service.monthly('2026-09')).totals.grossReceipts).toBe(100);
  });

  it('taxa do gateway usa o líquido gravado; sem o dado, avisa e não inventa taxa', async () => {
    const { service } = make({ invoices: [inv({ id: 'a', gatewayNetValue: null, provider: 'MERCADOPAGO', asaasPaymentId: null })] });
    const r = await service.monthly('2026-09');
    expect(r.totals.gatewayFees).toBe(0);
    expect(r.gateway).toEqual({ receiptsWithoutNetValue: 1, complete: false });
  });

  it('preenche o líquido que falta consultando o Asaas e grava na fatura', async () => {
    const getCharge = vi.fn(async () => ({ netValue: 95.01 }));
    const { service, prisma } = make({ invoices: [inv({ id: 'a', gatewayNetValue: null })] }, { isConfigured: () => true, getCharge });
    const r = await service.monthly('2026-09');
    expect(getCharge).toHaveBeenCalledWith('pay_a');
    expect(prisma.platformInvoice.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { gatewayNetValue: 95.01 } });
    expect(r.totals.gatewayFees).toBe(4.99);
    expect(r.gateway.complete).toBe(true);
  });

  it('falha na consulta ao Asaas não derruba o relatório', async () => {
    const { service } = make({ invoices: [inv({ id: 'a', gatewayNetValue: null })] }, { isConfigured: () => true, getCharge: vi.fn(async () => { throw new Error('timeout'); }) });
    const r = await service.monthly('2026-09');
    expect(r.totals.grossReceipts).toBe(100);
    expect(r.gateway.complete).toBe(false);
  });

  it('MRR normaliza o ciclo: anual R$ 1.200 vale R$ 100 por mês', async () => {
    const { service } = make(base);
    const r = await service.monthly('2026-09');
    expect(r.totals.mrr).toBe(200);
    expect(r.byPlan.find((row) => row.planId === 'p2')?.mrr).toBe(100);
    expect(r.totals.activeCustomers).toBe(2);
    expect(cycleMonths({ cycle: 'QUARTERLY' })).toBe(3);
    expect(cycleMonths({ cycle: 'CUSTOM', commitmentMonths: 2 })).toBe(2);
  });

  it('clientes novos, cancelados e churn do mês', async () => {
    const { service } = make({
      invoices: [
        inv({ id: 'old1', companyId: 'o1', paidAt: D('2026-08-05T15:00:00Z') }), inv({ id: 'old1b', companyId: 'o1', paidAt: D('2026-09-05T15:00:00Z') }),
        inv({ id: 'old2', companyId: 'o2', paidAt: D('2026-08-06T15:00:00Z') }), inv({ id: 'old2b', companyId: 'o2', paidAt: D('2026-09-06T15:00:00Z') }),
        inv({ id: 'new1', companyId: 'n1', paidAt: D('2026-09-12T15:00:00Z') }),
      ],
      adjustments: [
        { id: 'x1', type: 'SUBSCRIPTION_CANCELED', companyId: 'o2', createdAt: D('2026-09-20T12:00:00Z'), metadata: { mode: 'NOW' }, invoiceId: null },
        { id: 'x2', type: 'SUBSCRIPTION_CANCELED', companyId: 'o1', createdAt: D('2026-09-21T12:00:00Z'), metadata: { mode: 'END_OF_CYCLE' }, invoiceId: null },
        { id: 'x3', type: 'SUBSCRIPTION_CANCELED', companyId: 'trial', createdAt: D('2026-09-22T12:00:00Z'), metadata: { mode: 'NOW' }, invoiceId: null },
      ],
    });
    const r = await service.monthly('2026-09');
    expect(r.totals).toMatchObject({ newCustomers: 1, canceledCustomers: 1, customersAtStart: 2, churnRatePercent: 50, activeCustomers: 2 });
  });

  it('mês na virada: pagamento às 23h30 do último dia (Brasília) fica no mês, e 00:10 do dia 1 no seguinte', async () => {
    const { service } = make({ invoices: [
      inv({ id: 'late', companyId: 'c1', paidAt: D('2026-10-01T02:30:00Z') }), // 30/09 23:30 em Brasília
      inv({ id: 'next', companyId: 'c2', paidAt: D('2026-10-01T03:10:00Z') }), // 01/10 00:10 em Brasília
    ] });
    expect((await service.monthly('2026-09')).totals.grossReceipts).toBe(100);
    expect((await service.monthly('2026-10')).totals.grossReceipts).toBe(100);
    expect((await service.monthly('2026-09')).totals.newCustomers).toBe(1);
  });

  it('rejeita mês inválido', async () => {
    const { service } = make({});
    await expect(service.monthly('2026-13')).rejects.toThrow('AAAA-MM');
  });

  it('alíquota vem de PLATFORM_TAX_RATE_PERCENT, padrão 6, ignora valor inválido', () => {
    expect(taxRatePercent(undefined)).toBe(6);
    expect(taxRatePercent('4,5')).toBe(4.5);
    expect(taxRatePercent('abc')).toBe(6);
    expect(taxRatePercent('150')).toBe(6);
    const r = buildMonthlyReport({ month: '2026-09', start: D('2026-09-01T03:00:00Z'), end: D('2026-10-01T03:00:00Z'), entries: [], entryInvoices: [], paidUntilEnd: [], cancellations: [], plans: [], taxRate: 2 });
    expect(r.tax.ratePercent).toBe(2);
  });

  it('CSV: BOM UTF-8, separador ;, vírgula decimal e mesmos números do JSON', async () => {
    const { service } = make({ invoices: [inv({ id: 'a', amount: 100.5, gatewayNetValue: 97.25 })], plans: [{ id: 'p1', name: '=Plano;"X"', cycle: 'MONTHLY', commitmentMonths: 1 }] });
    const { filename, content } = await service.monthlyCsv('2026-09');
    const json = await service.monthly('2026-09');
    expect(filename).toBe('receita-plataforma-2026-09.csv');
    expect(content.charCodeAt(0)).toBe(0xfeff);
    expect(content).toContain('Receita bruta recebida;100,50');
    expect(content).toContain(`Taxas do gateway;3,25`);
    expect(content).toContain(`Receita liquida;${json.totals.netRevenue.toFixed(2).replace('.', ',')}`);
    expect(content).toContain('"\'=Plano;""X"""');
    expect(content).not.toMatch(/\d\.\d\d;/);
  });

  it('CSV do controller sai com cabeçalhos de download (Nest + Fastify real)', async () => {
    const { service } = make({ invoices: [inv({ id: 'a' })] });
    const types = [PlatformFinanceService, PrismaService, TimeClosingService, FiscalAdjustmentsService, PlatformRevenueReportService, Object];
    Reflect.defineMetadata('design:paramtypes', types, FinanceController);
    const moduleRef = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        { provide: PlatformFinanceService, useValue: {} }, { provide: PrismaService, useValue: {} }, { provide: TimeClosingService, useValue: {} },
        { provide: FiscalAdjustmentsService, useValue: {} }, { provide: PlatformRevenueReportService, useValue: service },
        { provide: getQueueToken('asaas-webhook'), useValue: {} }, { provide: PlatformAuditService, useValue: { record: async () => undefined, log: async () => undefined } },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    try {
      const res = await app.inject({ method: 'GET', url: '/finance/platform/reports/monthly.csv?month=2026-09' });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toBe(`attachment; filename="receita-plataforma-2026-09.csv"; filename*=UTF-8''receita-plataforma-2026-09.csv`);
      expect(res.body.startsWith('\ufeff')).toBe(true);
    } finally {
      await app.close();
    }
  });
});

describe('relatório mensal: perfis', () => {
  const guard = new RolesGuard({ getAllAndOverride: (_k: string, [h, c]: any[]) => Reflect.getMetadata(ROLES_KEY, h) ?? Reflect.getMetadata(ROLES_KEY, c) } as any);
  const ctx = (handler: any, role: string): any => ({ getHandler: () => handler, getClass: () => FinanceController, switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) });
  const proto = FinanceController.prototype;

  for (const handler of ['monthlyReport', 'monthlyReportCsv'] as const) {
    it(`${handler}: DEV, CEO e CONTABIL leem`, () => {
      for (const role of ['DEV', 'CEO', 'CONTABIL']) expect(guard.canActivate(ctx(proto[handler], role))).toBe(true);
    });
    it(`${handler}: FUNCIONARIO, ADMIN de empresa e COMERCIAL recebem 403`, () => {
      for (const role of ['FUNCIONARIO', 'ADMIN', 'COMERCIAL']) expect(() => guard.canActivate(ctx(proto[handler], role))).toThrow(ForbiddenException);
    });
  }
});
