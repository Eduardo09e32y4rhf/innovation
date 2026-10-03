import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { createPdfSink, safeFileName, sendPdf } from '../../common/pdf/pdf-response';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { TimeClosingService } from '../time-track/time-closing.service';
import { AdjustClosingDto, CorrectPayrollDto } from './accounting.dto';
import { AccountingRulesService } from './accounting-rules.service';

const num = (value: unknown) => Number(value ?? 0);
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function resolveMonth(month?: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  const now = new Date();
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const monthNumber = match ? Number(match[2]) : now.getUTCMonth() + 1;
  return {
    year, month: monthNumber, key: `${year}-${String(monthNumber).padStart(2, '0')}`,
    start: new Date(Date.UTC(year, monthNumber - 1, 1)), end: new Date(Date.UTC(year, monthNumber, 1)), last: new Date(Date.UTC(year, monthNumber, 0)),
  };
}

@Injectable()
export class AccountingHubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payroll: PayrollCalculationService,
    private readonly closing: TimeClosingService,
    private readonly rules: AccountingRulesService,
  ) {}

  private async assertCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, document: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    return company;
  }

  /** Visão da competência: todas as empresas (plataforma) ou o detalhe de uma empresa. */
  async overview(month?: string, companyId?: string) {
    const period = resolveMonth(month);
    const rules = await this.rules.list(period.last);
    const ruleVersions = Object.fromEntries(rules.rules.map((rule) => [rule.type, rule.current?.version ?? null]));

    if (companyId) {
      const company = await this.assertCompany(companyId);
      const [closings, payrolls] = await Promise.all([
        this.prisma.timeClosing.findMany({
          where: { companyId, periodStart: { gte: period.start, lt: period.end } },
          select: { id: true, status: true, periodStart: true, periodEnd: true, grossPay: true, netPay: true, inssDiscount: true, irrfDiscount: true, fgtsAmount: true, overtime50: true, overtime100: true, nightShift: true, calculationVersion: true, updatedAt: true, employee: { select: { name: true, position: true } } },
          orderBy: [{ status: 'asc' }, { employee: { name: 'asc' } }],
          take: 500,
        }),
        this.prisma.payroll.findMany({
          where: { companyId, referenceYear: period.year, referenceMonth: period.month, deletedAt: null },
          select: { id: true, status: true, baseSalary: true, overtimeAmount: true, nightShiftAmount: true, grossSalary: true, inssAmount: true, irrfAmount: true, fgtsAmount: true, netSalary: true, calculationVersion: true, updatedAt: true, employee: { select: { name: true, position: true } } },
          orderBy: { employee: { name: 'asc' } },
          take: 500,
        }),
      ]);
      const sum = (rows: any[], key: string) => round(rows.reduce((total, row) => total + num(row[key]), 0));
      return {
        scope: 'COMPANY', period: { year: period.year, month: period.month, key: period.key }, company, ruleVersions,
        totals: {
          closings: closings.length,
          gross: sum(closings, 'grossPay'), net: sum(closings, 'netPay'), inss: sum(closings, 'inssDiscount'), irrf: sum(closings, 'irrfDiscount'), fgts: sum(closings, 'fgtsAmount'),
          payrolls: payrolls.length, payrollGross: sum(payrolls, 'grossSalary'), payrollNet: sum(payrolls, 'netSalary'),
        },
        closings: closings.map((row) => ({ ...row, grossPay: num(row.grossPay), netPay: num(row.netPay), inssDiscount: num(row.inssDiscount), irrfDiscount: num(row.irrfDiscount), fgtsAmount: num(row.fgtsAmount) })),
        payrolls: payrolls.map((row) => ({ ...row, baseSalary: num(row.baseSalary), overtimeAmount: num(row.overtimeAmount), nightShiftAmount: num(row.nightShiftAmount), grossSalary: num(row.grossSalary), inssAmount: num(row.inssAmount), irrfAmount: num(row.irrfAmount), fgtsAmount: num(row.fgtsAmount), netSalary: num(row.netSalary) })),
      };
    }

    const [companies, closings, payrolls] = await Promise.all([
      this.prisma.company.findMany({ select: { id: true, name: true, document: true, status: true }, orderBy: { name: 'asc' }, take: 1000 }),
      this.prisma.timeClosing.groupBy({ by: ['companyId', 'status'], where: { periodStart: { gte: period.start, lt: period.end } }, _count: true, _sum: { grossPay: true, netPay: true, inssDiscount: true, irrfDiscount: true, fgtsAmount: true } }),
      this.prisma.payroll.groupBy({ by: ['companyId', 'status'], where: { referenceYear: period.year, referenceMonth: period.month, deletedAt: null }, _count: true, _sum: { grossSalary: true, netSalary: true } }),
    ]);
    const rows = companies.map((company) => {
      const cl = closings.filter((row) => row.companyId === company.id);
      const pr = payrolls.filter((row) => row.companyId === company.id);
      const countStatus = (rows: any[], statuses: string[]) => rows.filter((row) => statuses.includes(row.status)).reduce((total, row) => total + row._count, 0);
      return {
        ...company,
        closings: cl.reduce((total, row) => total + row._count, 0),
        closingsPending: countStatus(cl, ['DRAFT', 'IN_REVIEW']),
        gross: round(cl.reduce((total, row) => total + num(row._sum.grossPay), 0)),
        net: round(cl.reduce((total, row) => total + num(row._sum.netPay), 0)),
        inss: round(cl.reduce((total, row) => total + num(row._sum.inssDiscount), 0)),
        irrf: round(cl.reduce((total, row) => total + num(row._sum.irrfDiscount), 0)),
        fgts: round(cl.reduce((total, row) => total + num(row._sum.fgtsAmount), 0)),
        payrolls: pr.reduce((total, row) => total + row._count, 0),
        payrollsPending: countStatus(pr, ['DRAFT', 'PROCESSING']),
      };
    });
    return {
      scope: 'GLOBAL', period: { year: period.year, month: period.month, key: period.key }, ruleVersions,
      totals: {
        companies: rows.length,
        withClosings: rows.filter((row) => row.closings > 0).length,
        closings: rows.reduce((total, row) => total + row.closings, 0),
        closingsPending: rows.reduce((total, row) => total + row.closingsPending, 0),
        payrollsPending: rows.reduce((total, row) => total + row.payrollsPending, 0),
        gross: round(rows.reduce((total, row) => total + row.gross, 0)), net: round(rows.reduce((total, row) => total + row.net, 0)),
        inss: round(rows.reduce((total, row) => total + row.inss, 0)), irrf: round(rows.reduce((total, row) => total + row.irrf, 0)), fgts: round(rows.reduce((total, row) => total + row.fgts, 0)),
      },
      companies: rows,
    };
  }

  /** Recalcula INSS/IRRF/FGTS/líquido de uma folha com as regras vigentes na competência. */
  private async recalcPayrollRow(tx: any, payroll: any) {
    const reference = new Date(Date.UTC(payroll.referenceYear, payroll.referenceMonth - 1, 1));
    const ctx = await this.payroll.resolveTaxContext(reference);
    const dependentsData = payroll.employee?.dependents as unknown;
    const dependents = Array.isArray(dependentsData) ? dependentsData.length : 0;
    const gross = round(num(payroll.baseSalary) + num(payroll.overtimeAmount) + num(payroll.nightShiftAmount));
    const result = this.payroll.applyTaxes(gross, dependents, ctx);
    const updated = await tx.payroll.update({
      where: { id: payroll.id },
      data: {
        grossSalary: result.grossPay, inssAmount: result.inssDiscount, irrfAmount: result.irrfDiscount, fgtsAmount: result.fgtsAmount, netSalary: result.netPay,
        calculationVersion: [PayrollCalculationService.VERSION, ctx.inss.version, ctx.irrf.version, ctx.fgts ? `FGTS:${ctx.fgts.version}` : null, ctx.params ? `PARAMS:${ctx.params.version}` : null].filter(Boolean).join('|'),
        taxTableSnapshot: JSON.parse(JSON.stringify(ctx)),
      },
    });
    for (const [type, amount] of [['BASE_SALARY', num(payroll.baseSalary)], ['INSS', result.inssDiscount], ['IRRF', result.irrfDiscount], ['FGTS', result.fgtsAmount]] as const) {
      await tx.payrollItem.updateMany({ where: { payrollId: payroll.id, type }, data: { amount } });
    }
    return { updated, result, builtin: ctx.builtin ?? [] };
  }

  private async loadEditablePayroll(id: string) {
    const payroll = await this.prisma.payroll.findFirst({ where: { id, deletedAt: null }, include: { employee: { select: { name: true, dependents: true } } } });
    if (!payroll) throw new NotFoundException('Folha não encontrada.');
    if (!['DRAFT', 'PROCESSING'].includes(payroll.status)) throw new BadRequestException('Somente folhas em rascunho ou processamento podem ser recalculadas ou corrigidas.');
    return payroll;
  }

  async recalculatePayroll(actor: JwtUser, id: string) {
    const payroll = await this.loadEditablePayroll(id);
    const out = await this.prisma.$transaction(async (tx) => {
      const recalculated = await this.recalcPayrollRow(tx, payroll);
      await tx.auditLog.create({ data: { companyId: payroll.companyId, userId: actor.sub, action: 'ACCOUNTING_PAYROLL_RECALCULATED', entity: 'Payroll', entityId: id, metadata: { net: recalculated.result.netPay } } });
      return recalculated;
    });
    return { id, ...out.result, builtinRules: out.builtin };
  }

  /** Correção só de proventos; os impostos são sempre recalculados pelas regras (nunca digitados à mão). */
  async correctPayroll(actor: JwtUser, id: string, dto: CorrectPayrollDto) {
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('Informe o motivo da correção.');
    const changes = Object.fromEntries(Object.entries({ baseSalary: dto.baseSalary, overtimeAmount: dto.overtimeAmount, nightShiftAmount: dto.nightShiftAmount }).filter(([, value]) => value !== undefined));
    if (!Object.keys(changes).length) throw new BadRequestException('Informe ao menos um valor para corrigir.');
    const payroll = await this.loadEditablePayroll(id);
    return this.prisma.$transaction(async (tx) => {
      const next = await tx.payroll.update({
        where: { id },
        data: { ...changes, observations: `${payroll.observations ? `${payroll.observations}\n` : ''}[${new Date().toISOString()}] ${reason}` },
        include: { employee: { select: { name: true, dependents: true } } },
      });
      const recalculated = await this.recalcPayrollRow(tx, next);
      await tx.auditLog.create({ data: { companyId: payroll.companyId, userId: actor.sub, action: 'ACCOUNTING_PAYROLL_CORRECTED', entity: 'Payroll', entityId: id, metadata: { reason, changes } } });
      return { id, ...recalculated.result };
    });
  }

  async adjustClosing(actor: JwtUser, id: string, dto: AdjustClosingDto) {
    const closing = await this.prisma.timeClosing.findUnique({ where: { id }, select: { companyId: true } });
    if (!closing) throw new NotFoundException('Fechamento não encontrado.');
    return this.closing.adjust(closing.companyId, actor, id, { field: dto.field, newValue: String(dto.newValue), reason: dto.reason });
  }

  /** Recalcula os fechamentos em rascunho da empresa com as regras atuais. */
  async recalculateClosings(actor: JwtUser, companyId: string, month: string) {
    await this.assertCompany(companyId);
    const period = resolveMonth(month);
    const last = `${period.key}-${String(period.last.getUTCDate()).padStart(2, '0')}`;
    const generated = await this.closing.generate(companyId, { ...actor, companyId, role: 'ADMIN' }, { periodStart: `${period.key}-01`, periodEnd: last, month: period.month, year: period.year } as any);
    return { generated: Array.isArray(generated) ? generated.length : 0 };
  }

  /** Relatório contábil em PDF (todas as empresas ou uma empresa) com a versão das regras usadas. */
  async reportPdf(actor: JwtUser, month: string | undefined, companyId: string | undefined, res: any) {
    const data = await this.overview(month, companyId);
    const sink = createPdfSink();
    const pdfkit = await import('pdfkit');
    const doc = new pdfkit.default({ margin: 40, size: 'A4', bufferPages: true });
    doc.pipe(sink.stream);

    const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const title = data.scope === 'COMPANY' ? `Relatório contábil — ${(data as any).company.name}` : 'Relatório contábil — todas as empresas';
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a').text(title, { align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Competência ${data.period.key} • gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date())} por ${actor.name ?? actor.email}`, { align: 'center' });
    doc.moveDown(0.8);

    const t = data.totals as any;
    const boxes = [['Bruto', money(t.gross)], ['INSS', money(t.inss)], ['IRRF', money(t.irrf)], ['FGTS', money(t.fgts)], ['Líquido', money(t.net)]];
    const top = doc.y;
    boxes.forEach(([label, value], index) => {
      const x = 40 + index * 103;
      doc.roundedRect(x, top, 98, 44, 6).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(label, x + 8, top + 8);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(value, x + 8, top + 22, { width: 84 });
    });
    doc.y = top + 58;

    const columns = data.scope === 'COMPANY'
      ? [['Funcionário', 160], ['Status', 70], ['Bruto', 70], ['INSS', 60], ['IRRF', 60], ['FGTS', 55], ['Líquido', 70]]
      : [['Empresa', 190], ['Fech.', 40], ['Pend.', 40], ['Bruto', 70], ['INSS', 55], ['IRRF', 55], ['Líquido', 65]];
    const rows: string[][] = data.scope === 'COMPANY'
      ? (data as any).closings.map((row: any) => [row.employee?.name ?? '-', row.status, money(row.grossPay), money(row.inssDiscount), money(row.irrfDiscount), money(row.fgtsAmount), money(row.netPay)])
      : (data as any).companies.filter((row: any) => row.closings > 0).map((row: any) => [row.name, String(row.closings), String(row.closingsPending), money(row.gross), money(row.inss), money(row.irrf), money(row.net)]);

    const drawHeader = () => {
      let x = 40;
      doc.rect(40, doc.y - 3, 515, 16).fill('#f1f5f9');
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8);
      const y = doc.y;
      for (const [label, width] of columns) { doc.text(String(label), x + 3, y, { width: Number(width) - 6, lineBreak: false }); x += Number(width); }
      doc.y = y + 16;
    };
    drawHeader();
    doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
    for (const row of rows) {
      if (doc.y > 760) { doc.addPage(); drawHeader(); doc.font('Helvetica').fontSize(8).fillColor('#0f172a'); }
      const y = doc.y; let x = 40;
      row.forEach((cell, index) => { doc.text(cell, x + 3, y, { width: Number(columns[index][1]) - 6, lineBreak: false, ellipsis: true }); x += Number(columns[index][1]); });
      doc.y = y + 13;
    }
    if (!rows.length) doc.fillColor('#64748b').text('Nenhum fechamento na competência.', 40, doc.y + 6);

    doc.moveDown(1.2);
    const versions = Object.entries(data.ruleVersions).map(([type, version]) => `${type}: ${version ?? 'padrão embutido'}`).join('  •  ');
    doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(`Regras vigentes — ${versions}. Valores calculados pelo motor de folha com as regras cadastradas na Contabilidade.`, 40, doc.y, { width: 515 });

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i += 1) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#94a3b8').text(`Página ${i + 1} de ${pages.count}`, 40, 810, { align: 'center', width: 515 });
    }
    doc.end();
    sendPdf(res, await sink.done, `relatorio-contabil-${safeFileName(data.scope === 'COMPANY' ? (data as any).company.name : 'plataforma')}-${data.period.key}.pdf`);
  }
}
