import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import type { JwtUser } from '../../common/types/auth.types';
import { SupportStorageService } from '../support/support-storage.service';
import { VacationsRepository } from './vacations.repository';

export const VACATION_RECEIPT_VERSION = 'VACATION_RECEIPT_V1';

@Injectable()
export class VacationReceiptService {
  constructor(
    private readonly repository: VacationsRepository,
    private readonly storage: SupportStorageService,
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

  private buildPdf(input: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 44,
        info: {
          Title: `Aviso e recibo de ferias - ${input.identifier}`,
          Author: input.company.legalName || input.company.name,
          Subject: `Ferias ${input.competence}`,
          Keywords: `ferias,recibo,${input.identifier},${VACATION_RECEIPT_VERSION}`,
          CreationDate: input.issuedAt,
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const width = doc.page.width - 88;
      const address = input.company.address || [
        input.company.street,
        input.company.streetNumber,
        input.company.neighborhood,
        input.company.city,
        input.company.state,
        input.company.zipCode,
      ].filter(Boolean).join(', ');

      doc.rect(0, 0, doc.page.width, 112).fill('#0f766e');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
        .text(input.company.legalName || input.company.name, 44, 32, { width });
      doc.font('Helvetica').fontSize(8.5)
        .text([input.company.document, address, input.company.email, input.company.phone].filter(Boolean).join(' | '), 44, 61, {
          width,
        });
      doc.font('Helvetica-Bold').fontSize(8)
        .text(`DOCUMENTO ${input.identifier}`, 44, 91, { width, align: 'right' });

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(17)
        .text('AVISO E RECIBO DE FERIAS', 44, 136, { width, align: 'center' });
      doc.fillColor('#64748b').font('Helvetica').fontSize(9)
        .text(`Competencia ${input.competence} | Versao ${VACATION_RECEIPT_VERSION}`, 44, 162, {
          width,
          align: 'center',
        });

      this.sectionTitle(doc, 'DADOS DO COLABORADOR', 194, width);
      this.infoRow(doc, 218, [
        ['Nome', input.vacation.employee.name],
        ['Matricula', input.vacation.employee.registration || input.vacation.employee.id.slice(0, 8).toUpperCase()],
      ], width);
      this.infoRow(doc, 258, [
        ['CPF', input.vacation.employee.cpf || 'Nao informado'],
        ['Admissao', this.formatDate(input.vacation.employee.admissionDate)],
      ], width);
      this.infoRow(doc, 298, [
        ['Cargo', input.vacation.employee.position],
        ['Departamento', input.vacation.employee.department],
      ], width);

      this.sectionTitle(doc, 'PERIODO DE FERIAS', 346, width);
      this.infoRow(doc, 370, [
        ['Periodo aquisitivo', input.vacation.acquisitionPeriod],
        ['Dias de gozo', String(input.vacation.daysUsed)],
      ], width);
      this.infoRow(doc, 410, [
        ['Inicio', this.formatDate(input.vacation.startDate)],
        ['Termino', this.formatDate(input.vacation.endDate)],
      ], width);

      this.sectionTitle(doc, 'DEMONSTRATIVO OFICIAL', 458, width);
      const tableTop = 483;
      const soldRows = input.vacation.soldDays > 0 ? 2 : 0;
      const tableHeight = 98 + soldRows * 24;
      doc.rect(44, tableTop, width, tableHeight).strokeColor('#cbd5e1').stroke();
      let rowY = tableTop + 10;
      this.amountRow(doc, rowY, 'Remuneracao mensal cadastrada', input.salary, width);
      rowY += 24;
      this.amountRow(doc, rowY, `Remuneracao de ferias (${input.vacation.daysUsed} dias)`, input.vacationPay, width);
      rowY += 24;
      this.amountRow(doc, rowY, 'Adicional constitucional de 1/3', input.constitutionalThird, width);
      if (input.vacation.soldDays > 0) {
        rowY += 24;
        this.amountRow(doc, rowY, `Abono pecuniario (${input.vacation.soldDays} dias)`, input.soldDaysPay, width);
        rowY += 24;
        this.amountRow(doc, rowY, 'Adicional de 1/3 sobre o abono', input.soldDaysThird, width);
      }

      const totalTop = tableTop + tableHeight + 14;
      doc.roundedRect(44, totalTop, width, 58, 8).fill('#ecfdf5');
      doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(9).text('TOTAL BRUTO CALCULADO', 60, totalTop + 12);
      doc.fontSize(14).text(this.currency(input.calculatedGross), 60, totalTop + 10, {
        width: width - 32,
        align: 'right',
      });
      doc.fontSize(9).text('VALOR LIQUIDO PAGO', 60, totalTop + 36);
      doc.fontSize(14).text(this.currency(input.paidAmount), 60, totalTop + 33, {
        width: width - 32,
        align: 'right',
      });

      const declarationTop = totalTop + 73;
      doc.fillColor('#334155').font('Helvetica').fontSize(8.5)
        .text(
          `Recebi da empresa a importancia liquida de ${this.currency(input.paidAmount)}, referente as ferias acima ` +
          `descritas, paga em ${this.formatDate(input.payment.paidAt)} por ${input.payment.paymentMethod || 'forma nao informada'}.`,
          44,
          declarationTop,
          { width, align: 'justify', lineGap: 2 },
        );

      const signatureY = declarationTop + 58;
      doc.strokeColor('#94a3b8').moveTo(64, signatureY).lineTo(250, signatureY).stroke();
      doc.moveTo(345, signatureY).lineTo(531, signatureY).stroke();
      doc.fillColor('#334155').fontSize(8)
        .text('Assinatura do colaborador', 64, signatureY + 7, { width: 186, align: 'center' })
        .text('Empregador / RH', 345, signatureY + 7, { width: 186, align: 'center' });

      doc.fillColor('#64748b').fontSize(7)
        .text(
          `Emitido em ${this.formatDateTime(input.issuedAt)} por ${input.issuer}. Identificador ${input.identifier}. ` +
          'O hash SHA-256 integra o registro digital imutavel.',
          44,
          792,
          { width, align: 'center' },
        );
      doc.end();
    });
  }

  private sectionTitle(doc: PDFKit.PDFDocument, title: string, y: number, width: number) {
    doc.roundedRect(44, y, width, 18, 4).fill('#f1f5f9');
    doc.fillColor('#0f766e').font('Helvetica-Bold').fontSize(8).text(title, 52, y + 5);
  }

  private infoRow(doc: PDFKit.PDFDocument, y: number, values: Array<[string, string]>, width: number) {
    const columnWidth = width / values.length;
    values.forEach(([label, value], index) => {
      const x = 44 + columnWidth * index;
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text(label.toUpperCase(), x, y, {
        width: columnWidth - 12,
      });
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9).text(value, x, y + 12, {
        width: columnWidth - 12,
        ellipsis: true,
      });
    });
  }

  private amountRow(doc: PDFKit.PDFDocument, y: number, label: string, amount: number, width: number) {
    doc.fillColor('#0f172a').font('Helvetica').fontSize(9).text(label, 56, y, { width: width - 170 });
    doc.font('Helvetica-Bold').text(this.currency(amount), 44, y, { width: width - 12, align: 'right' });
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
    return Math.round((value + Number.EPSILON) * 100) / 100;
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
