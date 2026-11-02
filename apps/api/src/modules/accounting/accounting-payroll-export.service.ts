import { Injectable } from '@nestjs/common';
import { buildCsv } from '../../common/utils/csv';
import { fmt, PDF, PdfReport } from '../../common/pdf/pdf-report';
import { safeFileName, sendPdf } from '../../common/pdf/pdf-response';
import type { JwtUser } from '../../common/types/auth.types';
import { ITEM_TYPE_LABEL } from '../payroll/clt-discounts';
import { buildFiscalSummary } from '../payroll/payroll-fiscal-summary';
import { AccountingPayrollDataService } from './accounting-payroll-data.service';

const dec = (value: unknown) => (Number(value) || 0).toFixed(2).replace('.', ',');
const nature = (type: string, isDeduction: boolean) => (type === 'FGTS' ? 'Encargo' : isDeduction ? 'Desconto' : 'Provento');

/** Exportação da folha do mês da empresa: CSV (um registro por funcionário e um por item, mais o resumo fiscal) e PDF. */
@Injectable()
export class AccountingPayrollExportService {
  constructor(private readonly data: AccountingPayrollDataService) {}

  async csv(actor: JwtUser, companyId: string, month: string) {
    const { c, company, payrolls } = await this.data.loadMonth(actor, companyId, month);
    const header = ['Registro', 'Funcionário', 'Cargo', 'Competência', 'Situação', 'Tipo do item', 'Descrição', 'Natureza', 'Manual', 'Motivo', 'Alterado em', 'Valor (R$)', 'Bruto (R$)', 'INSS (R$)', 'IRRF (R$)', 'FGTS (R$)', 'Líquido (R$)'];
    const rows: unknown[][] = [];
    for (const p of payrolls) {
      rows.push(['FUNCIONARIO', p.employee.name, p.employee.position ?? '', c.key, p.status, '', '', '', '', '', '', '', dec(p.grossSalary), dec(p.inssAmount), dec(p.irrfAmount), dec(p.fgtsAmount), dec(p.netSalary)]);
      for (const i of p.items) {
        rows.push(['ITEM', p.employee.name, p.employee.position ?? '', c.key, p.status, ITEM_TYPE_LABEL[i.type] ?? i.type, i.description, nature(i.type, i.isDeduction), i.isManual ? 'Sim' : 'Não', i.manualReason ?? '', i.editedAt ? fmt.dateTime(i.editedAt) : '', dec(i.amount), '', '', '', '', '']);
      }
    }
    const s = buildFiscalSummary(payrolls);
    const sum = (label: string, value: number, note = '') => ['RESUMO FISCAL', company.name, '', c.key, '', '', label, note, '', '', '', dec(value), '', '', '', '', ''];
    rows.push(
      sum('Bruto total', s.gross), sum('Salário líquido a pagar', s.netToPay), sum('Total de descontos', s.totalDiscounts),
      ...s.discountsByType.map((d) => sum(`Desconto: ${d.label}`, d.amount)),
      sum('FGTS (encargo)', s.charges.fgts), sum('INSS patronal (estimado)', s.charges.employerInss, `${s.charges.employerInssRate * 100}% sobre o bruto`),
      sum('Custo total da empresa', s.companyCost),
    );
    return { content: buildCsv(header, rows), filename: `folha-${safeFileName(company.name)}-${c.key}.csv` };
  }

  async pdf(actor: JwtUser, companyId: string, month: string, res: any) {
    const { c, company, payrolls } = await this.data.loadMonth(actor, companyId, month);
    const validation = await this.data.validate(actor, companyId, month);
    const s = buildFiscalSummary(payrolls);
    const right = 'right' as const;
    const report = await PdfReport.create({
      title: 'Folha de pagamento', subtitle: `Competência ${c.key.split('-').reverse().join('/')}`,
      brand: { name: company.name, document: company.document, logoUrl: company.logoUrl },
      footerNote: `Emitido por ${actor.name ?? actor.email}`, footerId: 'Folha de pagamento',
      chip: validation.valid ? { label: 'Folha válida', tone: 'ok' } : { label: `${validation.errors} inconsistência(s)`, tone: 'bad' },
    });

    report.section('Resumo fiscal');
    report.stats([['Bruto', fmt.money(s.gross)], ['Descontos', fmt.money(s.totalDiscounts)], ['Líquido a pagar', fmt.money(s.netToPay)], ['Encargos', fmt.money(s.charges.total)], ['Custo da empresa', fmt.money(s.companyCost)]]);
    report.table(
      [{ label: 'Descontos por tipo', width: 335 }, { label: 'Valor', width: 180, align: right }],
      s.discountsByType.map((d) => [d.label, fmt.money(d.amount)]),
      { fontSize: 8, emptyText: 'Sem descontos.', totals: [{ text: 'Total de descontos', bold: true }, { text: fmt.money(s.totalDiscounts), bold: true, align: right }] },
    );
    report.table(
      [{ label: 'Encargos da empresa', width: 335 }, { label: 'Valor', width: 180, align: right }],
      [['FGTS', fmt.money(s.charges.fgts)], [`INSS patronal estimado (${s.charges.employerInssRate * 100}% do bruto; RAT e terceiros não incluídos)`, fmt.money(s.charges.employerInss)]],
      { fontSize: 8 },
    );

    report.section('Funcionários', 'resumo da competência');
    report.table(
      [{ label: 'Funcionário', width: 150 }, { label: 'Bruto', width: 68, align: right }, { label: 'INSS', width: 56, align: right }, { label: 'IRRF', width: 56, align: right }, { label: 'FGTS', width: 56, align: right }, { label: 'Líquido', width: 68, align: right }, { label: 'Situação', width: 61 }],
      payrolls.map((p) => [p.employee.name, fmt.money(p.grossSalary), fmt.money(p.inssAmount), fmt.money(p.irrfAmount), fmt.money(p.fgtsAmount), { text: fmt.money(p.netSalary), bold: true }, p.status]),
      { fontSize: 8, emptyText: 'Nenhuma folha na competência.' },
    );

    report.section('Itens da folha', 'proventos, descontos e encargos linha a linha');
    report.table(
      [{ label: 'Funcionário', width: 120 }, { label: 'Item', width: 170 }, { label: 'Natureza', width: 60 }, { label: 'Manual', width: 40 }, { label: 'Valor', width: 125, align: right }],
      payrolls.flatMap((p) => p.items.map((i) => [p.employee.name, `${ITEM_TYPE_LABEL[i.type] ?? i.type}${i.description && i.description !== ITEM_TYPE_LABEL[i.type] ? ` · ${i.description}` : ''}`, nature(i.type, i.isDeduction), i.isManual ? 'Sim' : '', fmt.money(i.amount)])),
      { fontSize: 7, emptyText: 'Sem itens.' },
    );

    report.section('Conferência');
    report.paragraph(validation.issues.length ? `${validation.errors} erro(s) e ${validation.warnings} alerta(s):` : 'Nenhuma inconsistência encontrada.', { size: 9, bold: true });
    for (const issue of validation.issues.slice(0, 40)) report.paragraph(`${issue.severity === 'ERROR' ? 'Erro' : 'Alerta'} · ${issue.name}: ${issue.message}`, { size: 8, color: issue.severity === 'ERROR' ? PDF.color.bad : PDF.color.warn });
    sendPdf(res, await report.finish(), `folha-${safeFileName(company.name)}-${c.key}.pdf`);
  }
}
