import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { roundMoney } from '../../common/utils/money';
import { createHash } from 'crypto';
import { PDF, PdfReport, type PdfCell } from '../../common/pdf/pdf-report';
import type { JwtUser } from '../../common/types/auth.types';
import { SupportStorageService } from '../support/support-storage.service';
import { VacationsRepository } from './vacations.repository';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { vacationTaxableGross } from './vacation-tax-base';

export const VACATION_RECEIPT_VERSION = 'VACATION_RECEIPT_V2';

@Injectable()
export class VacationReceiptService {
  constructor(
    private readonly repository: VacationsRepository,
    private readonly storage: SupportStorageService,
    @Optional() private readonly payroll: PayrollCalculationService = new PayrollCalculationService(),
  ) {}

  async generate(companyId: string, actor: JwtUser, vacation: any) {
    if (vacation.status !== 'APPROVED' && vacation.status !== 'COMPLETED') {
      throw new BadRequestException('O recibo oficial so pode ser emitido para ferias aprovadas ou concluidas.');
    }

    const salary = Number(vacation.employee?.salary);
    if (!Number.isFinite(salary) || salary <= 0) {
      throw new BadRequestException('Cadastre um salario valido para emitir o recibo oficial de ferias.');
    }

    const paidPayment = [...(vacation.payments ?? [])]
      .filter((payment: any) => payment.status === 'PAID' && payment.paidAt)
      .sort((left: any, right: any) => new Date(right.paidAt).getTime() - new Date(left.paidAt).getTime())[0];
    if (!paidPayment) {
      throw new BadRequestException('Registre o pagamento das ferias antes de emitir o recibo oficial.');
    }

    const company = await this.repository.findCompany(companyId);
    if (!company) throw new NotFoundException('Empresa nao encontrada.');

    const competence = this.competence(vacation.startDate);
    const identifier = `FER-${competence.replace('-', '')}-${vacation.id.slice(0, 8).toUpperCase()}`;
    const issuedAt = new Date();
    const issuer = actor.name?.trim() || actor.email;
    const vacationPay = this.roundCurrency((salary / 30) * vacation.daysUsed);
    const constitutionalThird = this.roundCurrency(vacationPay / 3);
    const soldDaysPay = this.roundCurrency((salary / 30) * (vacation.soldDays ?? 0));
    const soldDaysThird = this.roundCurrency(soldDaysPay / 3);
    const calculatedGross = this.roundCurrency(vacationPay + constitutionalThird + soldDaysPay + soldDaysThird);
    // INSS/IRRF incidem so sobre ferias gozadas + 1/3, em separado do salario do mes;
    // abono pecuniario (CLT art. 143) e seu 1/3 sao isentos (Lei 8.212 art. 28 §9 "e" 6; AD PGFN 6/2006).
    const taxableGross = vacationTaxableGross(salary, vacation.daysUsed);
    const dependents = this.countDependents(vacation.employee?.dependents);
    const taxContext = await this.payroll.resolveTaxContext(new Date(vacation.startDate));
    const taxes = this.payroll.applyTaxes(taxableGross, dependents, taxContext);
    const inssDiscount = taxes.inssDiscount;
    const irrfDiscount = taxes.irrfDiscount;
    const exemptAmount = this.roundCurrency(soldDaysPay + soldDaysThird);
    const calculatedNet = this.roundCurrency(calculatedGross - inssDiscount - irrfDiscount);
    const paidAmount = Number(paidPayment.amount);
    const buffer = await this.buildPdf({
      identifier,
      competence,
      issuedAt,
      issuer,
      company,
      vacation,
      payment: paidPayment,
      salary,
      vacationPay,
      constitutionalThird,
      soldDaysPay,
      soldDaysThird,
      calculatedGross,
      taxableGross,
      exemptAmount,
      dependents,
      inssDiscount,
      irrfBase: taxes.irrfBase,
      irrfDiscount,
      calculatedNet,
      paidAmount,
    });
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const storageKey = `vacation-receipt-${companyId}-${vacation.id}-${sha256.slice(0, 12)}.pdf`;

    await this.storage.saveFile(storageKey, buffer);
    let document: { id: string };
    try {
      document = await this.repository.createGeneratedDocument({
        companyId,
        title: `Recibo de ferias ${identifier}`,
        storageKey,
        sha256,
        sizeBytes: buffer.length,
        createdBy: actor.sub,
        metadata: {
          documentKind: 'VACATION_RECEIPT',
          version: VACATION_RECEIPT_VERSION,
          identifier,
          competence,
          vacationId: vacation.id,
          employeeId: vacation.employeeId,
          paymentId: paidPayment.id,
          issuedAt: issuedAt.toISOString(),
          issuer,
          calculation: {
            salarySource: 'EMPLOYEE_REGISTERED_SALARY',
            salary,
            daysUsed: vacation.daysUsed,
            soldDays: vacation.soldDays ?? 0,
            vacationPay,
            constitutionalThird,
            soldDaysPay,
            soldDaysThird,
            calculatedGross,
            taxableGross,
            exemptAmount,
            dependents,
            inssDiscount,
            irrfBase: taxes.irrfBase,
            irrfDiscount,
            calculatedNet,
            taxTables: { inss: taxContext.inss.version, irrf: taxContext.irrf.version },
            paidAmount,
          },
        },
      });
    } catch (error) {
      await this.storage.deleteFile(storageKey);
      throw error;
    }

    return {
      buffer,
      documentId: document.id,
      sha256,
      version: VACATION_RECEIPT_VERSION,
      filename: `recibo-ferias-${this.slugify(vacation.employee.name)}-${competence}.pdf`,
    };
  }

  private async buildPdf(input: any): Promise<Buffer> {
    const { company, vacation } = input;
    const address = company.address || [company.street, company.streetNumber, company.neighborhood, company.city, company.state, company.zipCode].filter(Boolean).join(', ');
    const report = await PdfReport.create({
      title: 'Aviso e recibo de férias', number: input.identifier, subtitle: `Competência ${String(input.competence).split('-').reverse().join('/')}`,
      brand: { name: company.legalName || company.name, document: company.document, logoUrl: company.logoUrl },
      footerNote: `Emitido por ${input.issuer}. O hash SHA-256 integra o registro digital imutável.`, footerId: `${input.identifier} · ${VACATION_RECEIPT_VERSION}`, generatedAt: input.issuedAt,
    });
    if (address || company.email || company.phone) report.paragraph([address, company.email, company.phone].filter(Boolean).join(' · '), { size: 8.5, color: PDF.color.mut });

    report.section('Dados do colaborador');
    report.fields([
      ['Nome', vacation.employee.name], ['Matrícula', vacation.employee.registration || vacation.employee.id.slice(0, 8).toUpperCase()],
      ['CPF', vacation.employee.cpf || 'Não informado'], ['Admissão', this.formatDate(vacation.employee.admissionDate)],
      ['Cargo', vacation.employee.position || '-'], ['Departamento', vacation.employee.department || '-'],
    ], 2);

    report.section('Período de férias');
    report.fields([
      ['Período aquisitivo', vacation.acquisitionPeriod || '-'], ['Dias de gozo', String(vacation.daysUsed)],
      ['Início', this.formatDate(vacation.startDate)], ['Término', this.formatDate(vacation.endDate)],
    ]);

    report.section('Demonstrativo oficial');
    const rows: PdfCell[][] = [
      ['Remuneração mensal cadastrada', { text: this.currency(input.salary), bold: true }],
      [`Remuneração de férias (${vacation.daysUsed} dias)`, { text: this.currency(input.vacationPay), bold: true }],
      ['Adicional constitucional de 1/3', { text: this.currency(input.constitutionalThird), bold: true }],
    ];
    if (vacation.soldDays > 0) {
      rows.push([`Abono pecuniário (${vacation.soldDays} dias)`, { text: this.currency(input.soldDaysPay), bold: true }]);
      rows.push(['Adicional de 1/3 sobre o abono', { text: this.currency(input.soldDaysThird), bold: true }]);
    }
    report.table([{ label: 'Proventos', width: 395 }, { label: 'Valor', width: 120, align: 'right' }], rows, { totals: ['Total de proventos', this.currency(input.calculatedGross)] });

    const discounts: PdfCell[][] = [
      [`INSS sobre férias + 1/3 (base ${this.currency(input.taxableGross)})`, { text: this.currency(input.inssDiscount), bold: true }],
      [`IRRF sobre férias + 1/3 (base ${this.currency(input.irrfBase)}; ${input.dependents} dependente(s))`, { text: this.currency(input.irrfDiscount), bold: true }],
    ];
    report.table([{ label: 'Descontos', width: 395 }, { label: 'Valor', width: 120, align: 'right' }], discounts, { totals: ['Total de descontos', this.currency(this.roundCurrency(input.inssDiscount + input.irrfDiscount))] });
    if (input.exemptAmount > 0) {
      report.paragraph(`Abono pecuniário e respectivo 1/3 (${this.currency(input.exemptAmount)}) isentos de INSS e IRRF.`, { size: 8.5, color: PDF.color.mut });
    }
    report.total('Valor líquido calculado', this.currency(input.calculatedNet));
    if (Math.abs(input.paidAmount - input.calculatedNet) >= 0.01) {
      report.paragraph(`Atenção: valor pago registrado (${this.currency(input.paidAmount)}) difere do líquido calculado.`, { size: 8.5, color: PDF.color.mut });
    }

    report.paragraph(
      `Recebi da empresa a importância líquida de ${this.currency(input.paidAmount)}, referente às férias acima descritas, paga em ${this.formatDate(input.payment.paidAt)} por ${input.payment.paymentMethod || 'forma não informada'}.`,
      { size: 9 },
    );
    report.signatures([{ label: 'Assinatura do colaborador', sub: vacation.employee.name }, { label: 'Empregador / RH' }]);
    return report.finish();
  }
  private countDependents(value: unknown): number {
    let parsed = value;
    if (typeof value === 'string') {
      try { parsed = JSON.parse(value); } catch { return 0; }
    }
    return Array.isArray(parsed) ? parsed.length : 0;
  }

  private currency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private formatDate(value: Date | string) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(value);
  }

  private competence(value: Date | string) {
    const date = new Date(value);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private roundCurrency(value: number) {
    return roundMoney(value);
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'colaborador';
  }
}
