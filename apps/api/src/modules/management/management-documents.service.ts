import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { DocumentService } from '../documents/document.service';
import { AsoReferralPdfDto, LegalNoticePdfDto } from './dto/management-document.dto';

type GeneratedManagementDocument = {
  id: string;
  sha256: string;
  filename: string;
  title: string;
};

type CompanySnapshot = {
  name: string;
  legalName: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

type EmployeeSnapshot = {
  id: string;
  name: string;
  cpf: string | null;
  registration: string | null;
  birthDate: Date | null;
  position: string;
  department: string;
  admissionDate: Date;
};

const COMPANY_SELECT = {
  name: true,
  legalName: true,
  document: true,
  phone: true,
  email: true,
  street: true,
  streetNumber: true,
  neighborhood: true,
  city: true,
  state: true,
} as const;

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  cpf: true,
  registration: true,
  birthDate: true,
  position: true,
  department: true,
  admissionDate: true,
} as const;

@Injectable()
export class ManagementDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentService,
  ) {}

  async createAsoReferralFromRecord(
    companyId: string,
    actorId: string,
    recordId: string,
  ): Promise<GeneratedManagementDocument> {
    const record = await this.prisma.employeeAsoRecord.findFirst({
      where: { id: recordId, companyId },
      include: {
        company: { select: COMPANY_SELECT },
        employee: { select: EMPLOYEE_SELECT },
      },
    });
    if (!record) throw new NotFoundException('ASO não encontrado.');

    return this.generateAsoReferral(companyId, actorId, record.employee, record.company, {
      sourceId: record.id,
      asoType: record.asoType,
      clinicName: record.clinicName ?? undefined,
      clinicAddress: record.observation ?? undefined,
      examDate: record.examDate ?? undefined,
      observation: record.observation ?? undefined,
    });
  }

  async createAsoReferralPreview(
    companyId: string,
    actorId: string,
    input: AsoReferralPdfDto,
  ): Promise<GeneratedManagementDocument> {
    const [employee, company] = await Promise.all([
      this.findEmployee(companyId, input.employeeId),
      this.findCompany(companyId),
    ]);

    return this.generateAsoReferral(companyId, actorId, employee, company, {
      sourceId: employee.id,
      asoType: input.asoType ?? 'ADMISSIONAL',
      clinicName: input.clinicName,
      clinicAddress: input.clinicAddress,
      examDate: input.examDate ? new Date(input.examDate) : undefined,
      observation: input.observation,
      preview: true,
    });
  }

  async createLegalNoticeFromNotification(
    companyId: string,
    actorId: string,
    notificationId: string,
  ): Promise<GeneratedManagementDocument> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        companyId,
        type: { in: ['WARNING_NOTICE', 'SUSPENSION_NOTICE'] },
      },
      include: {
        company: { select: COMPANY_SELECT },
        recipients: {
          take: 1,
          include: {
            employee: { select: EMPLOYEE_SELECT },
            user: { include: { employee: { select: EMPLOYEE_SELECT } } },
          },
        },
      },
    });
    if (!notification) throw new NotFoundException('Notificação disciplinar não encontrada.');

    const recipient = notification.recipients[0];
    const employee = recipient?.employee ?? recipient?.user?.employee;
    if (!employee) throw new BadRequestException('A notificação não possui um funcionário destinatário.');

    const extra = this.jsonObject(notification.extraJson);
    return this.generateLegalNotice(companyId, actorId, employee, notification.company, {
      sourceId: notification.id,
      type: notification.type as 'WARNING_NOTICE' | 'SUSPENSION_NOTICE',
      title: notification.title,
      message: notification.message,
      legalReason: this.optionalText(extra.legalReason),
      occurrenceDate: this.optionalDate(extra.occurrenceDate),
      suspensionDays: this.optionalNumber(extra.suspensionDays),
    });
  }

  async createLegalNoticePreview(
    companyId: string,
    actorId: string,
    input: LegalNoticePdfDto,
  ): Promise<GeneratedManagementDocument> {
    const [employee, company] = await Promise.all([
      this.findEmployee(companyId, input.employeeId),
      this.findCompany(companyId),
    ]);

    return this.generateLegalNotice(companyId, actorId, employee, company, {
      sourceId: employee.id,
      type: input.type,
      title: input.title,
      message: input.message,
      legalReason: input.legalReason,
      occurrenceDate: input.occurrenceDate ? new Date(input.occurrenceDate) : undefined,
      suspensionDays: input.suspensionDays,
      preview: true,
    });
  }

  async createClosingReport(
    companyId: string,
    actorId: string,
    closingId: string,
  ): Promise<GeneratedManagementDocument> {
    const closing = await this.prisma.timeClosing.findFirst({
      where: { id: closingId, companyId },
      include: {
        company: { select: COMPANY_SELECT },
        employee: { select: EMPLOYEE_SELECT },
      },
    });
    if (!closing) throw new NotFoundException('Fechamento não encontrado.');

    const title = 'Memória de Cálculo da Folha';
    const periodKey = this.dateKey(closing.periodStart);
    const filename = `fechamento-${this.safeFilename(closing.employee.name)}-${periodKey}.pdf`;
    const generated = await this.documents.generateDocument(
      companyId,
      'PAYSLIP',
      `${title} - ${closing.employee.name} - ${periodKey}`,
      (doc: any) => {
        this.drawHeader(doc, title, `${closing.employee.name} | ${this.period(closing.periodStart, closing.periodEnd)}`, closing.company);
        this.drawSection(doc, 'Colaborador');
        this.drawFields(doc, [
          ['Nome', closing.employee.name],
          ['CPF', this.formatCpf(closing.employee.cpf)],
          ['Matrícula', closing.employee.registration ?? 'Não informada'],
          ['Cargo', closing.employee.position],
          ['Departamento', closing.employee.department],
          ['Status do fechamento', closing.status],
        ]);

        this.drawSection(doc, 'Jornada');
        this.drawFields(doc, [
          ['Horas normais', `${this.decimal(closing.normalHours)} h`],
          ['Horas extras 50%', `${this.decimal(closing.overtime50)} h`],
          ['Horas extras 100%', `${this.decimal(closing.overtime100)} h`],
          ['Adicional noturno', `${this.decimal(closing.nightShift)} h`],
          ['Faltas', `${closing.absenceMinutes} min`],
          ['Atrasos', `${closing.lateMinutes} min`],
          ['Saídas antecipadas', `${closing.earlyLeaveMinutes} min`],
          ['Dias úteis', String(closing.payableWorkdays)],
        ]);

        this.drawSection(doc, 'Proventos, descontos e encargos');
        this.drawFields(doc, [
          ['Salário base', this.money(closing.salaryBase)],
          [`Valor hora / ${closing.monthlyDivisor}`, this.money(closing.hourlyRate)],
          ['Horas extras 50%', this.money(closing.overtime50Value)],
          ['Horas extras 100%', this.money(closing.overtime100Value)],
          ['Adicional noturno', this.money(closing.nightShiftValue)],
          ['DSR', this.money(closing.dsrValue)],
          ['Desconto faltas', `- ${this.money(closing.absenceDiscount)}`],
          ['Desconto atrasos', `- ${this.money(closing.lateDiscount)}`],
          ['Desconto saída antecipada', `- ${this.money(closing.earlyLeaveDiscount)}`],
          ['INSS', `- ${this.money(closing.inssDiscount)}`],
          ['IRRF', `- ${this.money(closing.irrfDiscount)}`],
          ['FGTS patronal', this.money(closing.fgtsAmount)],
          ['Base de cálculo', this.money(closing.grossPay)],
          ['Líquido', this.money(closing.netPay)],
        ]);

        this.drawRuleBox(doc, `Regra de cálculo: ${closing.calculationVersion} | Snapshot tributário: ${closing.taxTableSnapshot ? 'registrado' : 'não registrado'}`);
        this.drawSignatures(doc, ['RH / Empregador', 'Contabilidade', 'Colaborador']);
        this.drawFooter(doc, 'TIME_CLOSING', closing.id, closing.calculationVersion);
      },
      actorId,
    );

    await this.attachMetadata(generated.id, {
      module: 'MANAGEMENT',
      documentKind: 'TIME_CLOSING',
      sourceId: closing.id,
      employeeId: closing.employeeId,
      periodStart: closing.periodStart.toISOString(),
      periodEnd: closing.periodEnd.toISOString(),
      status: closing.status,
      calculationVersion: closing.calculationVersion,
      immutableSnapshot: closing.status === 'CLOSED',
    });

    return { ...generated, filename, title };
  }

  async stream(
    result: GeneratedManagementDocument,
    actor: JwtUser,
    response: any,
  ): Promise<void> {
    const stored = await this.documents.getDocumentStream(actor, result.id);
    const target = response.raw ?? response;
    target.setHeader('Content-Type', 'application/pdf');
    target.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    target.setHeader('Content-Length', String(stored.size));
    target.setHeader('Cache-Control', 'private, no-store');
    target.setHeader('X-Document-Id', result.id);
    target.setHeader('X-Document-Sha256', result.sha256);
    target.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Document-Id, X-Document-Sha256');

    await new Promise<void>((resolve, reject) => {
      stored.stream.once('error', reject);
      target.once('error', reject);
      target.once('finish', resolve);
      stored.stream.pipe(target);
    });
  }

  private async generateAsoReferral(
    companyId: string,
    actorId: string,
    employee: EmployeeSnapshot,
    company: CompanySnapshot,
    data: {
      sourceId: string;
      asoType: string;
      clinicName?: string;
      clinicAddress?: string;
      examDate?: Date;
      observation?: string;
      preview?: boolean;
    },
  ): Promise<GeneratedManagementDocument> {
    const title = 'Encaminhamento para Exame Médico Ocupacional';
    const typeLabel = this.asoType(data.asoType);
    const filename = `encaminhamento-aso-${this.safeFilename(employee.name)}.pdf`;
    const generated = await this.documents.generateDocument(
      companyId,
      'OTHER',
      `${title} - ${employee.name}`,
      (doc: any) => {
        this.drawHeader(doc, title, `${employee.name} | ${typeLabel}`, company);
        this.drawParagraph(
          doc,
          `Encaminhamos o(a) colaborador(a) abaixo qualificado(a) para a realização de Exame Médico Ocupacional (${typeLabel}), conforme a NR-7.`,
        );
        this.drawParagraph(
          doc,
          'Solicitamos a avaliação clínica, os exames complementares aplicáveis e a emissão do respectivo Atestado de Saúde Ocupacional (ASO).',
        );
        this.drawSection(doc, 'Dados do empregador');
        this.drawFields(doc, [
          ['Razão social', company.legalName ?? company.name],
          ['CNPJ', company.document ?? 'Não informado'],
          ['Endereço', this.companyAddress(company)],
          ['Contato', [company.phone, company.email].filter(Boolean).join(' | ') || 'Não informado'],
        ]);
        this.drawSection(doc, 'Qualificação do colaborador');
        this.drawFields(doc, [
          ['Nome completo', employee.name],
          ['CPF', this.formatCpf(employee.cpf)],
          ['Data de nascimento', this.formatDate(employee.birthDate)],
          ['Cargo', employee.position],
          ['Departamento', employee.department],
          ['Admissão', this.formatDate(employee.admissionDate)],
        ]);
        this.drawSection(doc, 'Dados do encaminhamento');
        this.drawFields(doc, [
          ['Tipo de exame', typeLabel],
          ['Clínica', data.clinicName ?? 'A definir'],
          ['Endereço da clínica', data.clinicAddress ?? 'Não informado'],
          ['Data prevista', this.formatDate(data.examDate)],
        ]);
        if (data.observation) {
          this.drawSection(doc, 'Observações');
          this.drawParagraph(doc, data.observation);
        }
        this.drawSignatures(doc, ['Autorização RH / Empregador', 'Recebimento pela clínica', 'Assinatura do colaborador']);
        this.drawFooter(doc, 'ASO_REFERRAL', data.sourceId, 'NR7_2026_1');
      },
      actorId,
    );

    await this.attachMetadata(generated.id, {
      module: 'MANAGEMENT',
      documentKind: 'ASO_REFERRAL',
      sourceId: data.sourceId,
      employeeId: employee.id,
      asoType: data.asoType,
      preview: Boolean(data.preview),
      ruleVersion: 'NR7_2026_1',
    });

    return { ...generated, filename, title };
  }

  private async generateLegalNotice(
    companyId: string,
    actorId: string,
    employee: EmployeeSnapshot,
    company: CompanySnapshot,
    data: {
      sourceId: string;
      type: 'WARNING_NOTICE' | 'SUSPENSION_NOTICE';
      title?: string;
      message: string;
      legalReason?: string;
      occurrenceDate?: Date;
      suspensionDays?: number;
      preview?: boolean;
    },
  ): Promise<GeneratedManagementDocument> {
    const isSuspension = data.type === 'SUSPENSION_NOTICE';
    const title = isSuspension ? 'Termo de Suspensão Disciplinar' : 'Termo de Advertência Disciplinar';
    const filename = `${isSuspension ? 'suspensao' : 'advertencia'}-${this.safeFilename(employee.name)}.pdf`;
    const generated = await this.documents.generateDocument(
      companyId,
      'OTHER',
      `${title} - ${employee.name}`,
      (doc: any) => {
        this.drawHeader(doc, title, data.title ?? employee.name, company);
        this.drawSection(doc, 'Qualificação do colaborador');
        this.drawFields(doc, [
          ['Nome', employee.name],
          ['CPF', this.formatCpf(employee.cpf)],
          ['Matrícula', employee.registration ?? 'Não informada'],
          ['Cargo', employee.position],
          ['Departamento', employee.department],
          ['Data da ocorrência', this.formatDate(data.occurrenceDate)],
        ]);
        this.drawSection(doc, 'Fundamentação e fato');
        this.drawParagraph(
          doc,
          `Pelo presente documento, comunicamos a aplicação de ${isSuspension ? 'suspensão' : 'advertência'} disciplinar ao(à) colaborador(a) identificado(a), em razão da ocorrência descrita abaixo.`,
        );
        if (data.legalReason) this.drawRuleBox(doc, `Motivo / fundamento: ${data.legalReason}`);
        this.drawParagraph(doc, data.message);
        if (isSuspension) {
          this.drawRuleBox(doc, `Período de suspensão: ${data.suspensionDays ?? 1} dia(s).`);
        }
        this.drawParagraph(
          doc,
          'A reincidência em condutas semelhantes poderá resultar em medidas disciplinares mais severas, observadas a legislação vigente, a gradação das penalidades e as circunstâncias do caso.',
        );
        this.drawSignatures(doc, ['Assinatura do colaborador', 'Empregador / RH', 'Testemunha 1', 'Testemunha 2']);
        this.drawFooter(doc, data.type, data.sourceId, 'DISCIPLINARY_2026_1');
      },
      actorId,
    );

    await this.attachMetadata(generated.id, {
      module: 'MANAGEMENT',
      documentKind: data.type,
      sourceId: data.sourceId,
      employeeId: employee.id,
      occurrenceDate: data.occurrenceDate?.toISOString() ?? null,
      suspensionDays: isSuspension ? data.suspensionDays ?? 1 : null,
      preview: Boolean(data.preview),
      ruleVersion: 'DISCIPLINARY_2026_1',
    });

    return { ...generated, filename, title };
  }

  private async findEmployee(companyId: string, employeeId: string): Promise<EmployeeSnapshot> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: EMPLOYEE_SELECT,
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');
    return employee;
  }

  private async findCompany(companyId: string): Promise<CompanySnapshot> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_SELECT,
    });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    return company;
  }

  private async attachMetadata(documentId: string, metadata: Record<string, unknown>) {
    await this.prisma.generatedDocument.update({
      where: { id: documentId },
      data: { metadata: metadata as any },
    });
  }

  private drawHeader(doc: any, title: string, subtitle: string, company: CompanySnapshot) {
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(title, { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(subtitle, { align: 'center' });
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#0f766e').lineWidth(1.5).stroke();
    doc.moveDown(0.7);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(company.legalName ?? company.name);
    doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
      .text(`CNPJ: ${company.document ?? 'Não informado'} | ${this.companyAddress(company)}`);
    doc.moveDown(0.6);
  }

  private drawSection(doc: any, title: string) {
    this.ensureSpace(doc, 55);
    doc.moveDown(0.6);
    doc.roundedRect(50, doc.y, 495, 20, 3).fill('#ecfdf5');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f766e').text(title.toUpperCase(), 58, doc.y - 15, { width: 479 });
    doc.moveDown(0.7);
  }

  private drawFields(doc: any, fields: Array<[string, string]>) {
    for (const [label, value] of fields) {
      this.ensureSpace(doc, 24);
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(label, 58, y, { width: 145 });
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(this.cleanText(value), 205, y, { width: 330 });
      doc.moveDown(0.35);
    }
  }

  private drawParagraph(doc: any, text: string) {
    this.ensureSpace(doc, 60);
    doc.font('Helvetica').fontSize(9.5).fillColor('#334155')
      .text(this.cleanText(text), 58, doc.y, { width: 479, align: 'justify', lineGap: 3 });
    doc.moveDown(0.5);
  }

  private drawRuleBox(doc: any, text: string) {
    this.ensureSpace(doc, 45);
    const height = Math.max(34, doc.heightOfString(this.cleanText(text), { width: 455 }) + 16);
    const y = doc.y;
    doc.roundedRect(58, y, 479, height, 4).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155')
      .text(this.cleanText(text), 70, y + 8, { width: 455 });
    doc.y = y + height + 8;
  }

  private drawSignatures(doc: any, labels: string[]) {
    this.ensureSpace(doc, 115);
    doc.moveDown(2.5);
    const width = 230;
    labels.forEach((label, index) => {
      if (index > 0 && index % 2 === 0) doc.moveDown(3.2);
      const x = index % 2 === 0 ? 55 : 310;
      const y = doc.y;
      doc.moveTo(x, y).lineTo(x + width, y).strokeColor('#334155').lineWidth(0.7).stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(label, x, y + 5, { width, align: 'center' });
      if (index % 2 === 1) doc.y = y;
    });
    doc.moveDown(2);
  }

  private drawFooter(doc: any, kind: string, sourceId: string, ruleVersion: string) {
    this.ensureSpace(doc, 35);
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text(
      `Documento oficial gerado pelo Innovation RH | Origem: ${kind}/${sourceId} | Regra: ${ruleVersion} | Emissão: ${this.formatDateTime(new Date())}`,
      { align: 'center' },
    );
  }

  private ensureSpace(doc: any, required: number) {
    if (doc.y + required > doc.page.height - 55) doc.addPage();
  }

  private companyAddress(company: CompanySnapshot) {
    return [
      company.street,
      company.streetNumber,
      company.neighborhood,
      company.city,
      company.state,
    ].filter(Boolean).join(', ') || 'Endereço não informado';
  }

  private period(start: Date, end: Date) {
    return `${this.formatDate(start)} a ${this.formatDate(end)}`;
  }

  private formatDate(value?: Date | null) {
    if (!value || Number.isNaN(value.getTime())) return 'Não informada';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(value);
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(value);
  }

  private formatCpf(value?: string | null) {
    const digits = (value ?? '').replace(/\D/g, '');
    if (digits.length !== 11) return value || 'Não informado';
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  private money(value: unknown) {
    return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private decimal(value: unknown) {
    return Number(value ?? 0).toFixed(2);
  }

  private dateKey(value: Date) {
    return value.toISOString().slice(0, 7);
  }

  private safeFilename(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'documento';
  }

  private cleanText(value: unknown) {
    return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  }

  private asoType(value: string) {
    const labels: Record<string, string> = {
      ADMISSIONAL: 'Admissional',
      DEMISSIONAL: 'Demissional',
      PERIODICO: 'Periódico',
      RETORNO_AO_TRABALHO: 'Retorno ao trabalho',
      MUDANCA_DE_FUNCAO: 'Mudança de função',
      COMPLEMENTAR: 'Complementar',
    };
    return labels[value] ?? value.replace(/_/g, ' ');
  }

  private jsonObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private optionalText(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private optionalNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private optionalDate(value: unknown) {
    if (typeof value !== 'string' && !(value instanceof Date)) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
