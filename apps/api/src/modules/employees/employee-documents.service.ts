import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PDF, PdfReport } from '../../common/pdf/pdf-report';
import type { JwtUser } from '../../common/types/auth.types';
import { DocumentService } from '../documents/document.service';
import { EmployeesRepository } from './employees.repository';

type EmployeeDocumentKind = 'POINT_SHEET' | 'OCCURRENCES' | 'EMPLOYEE_RECORD';

const DOCUMENT_VERSION = 'EMPLOYEE_DOCS_2026_1';
const KIND_TITLE: Record<EmployeeDocumentKind, string> = { POINT_SHEET: 'Espelho de ponto', OCCURRENCES: 'Ficha de ocorrências', EMPLOYEE_RECORD: 'Ficha de registro' };

@Injectable()
export class EmployeeDocumentsService {
  constructor(
    private readonly repository: EmployeesRepository,
    private readonly documents: DocumentService,
  ) {}

  async generate(
    companyId: string,
    actor: JwtUser,
    employeeId: string,
    kind: EmployeeDocumentKind,
    month?: string,
  ) {
    const period = kind === 'EMPLOYEE_RECORD' ? undefined : this.parseMonth(month);
    const data = await this.repository.getOfficialDocumentData(companyId, employeeId, period);
    if (!data) throw new NotFoundException('Funcionario nao encontrado.');

    const monthLabel = period ? this.monthLabel(period.start) : undefined;
    const title = this.documentTitle(kind, data.employee.name, monthLabel);
    const filename = this.filename(kind, data.employee.name, month);

    const report = await PdfReport.create({
      title: KIND_TITLE[kind], subtitle: monthLabel ? `Competência ${monthLabel}` : undefined,
      brand: { name: data.company?.legalName || data.company?.name || 'Empresa', document: data.company?.document, logoUrl: data.company?.logoUrl },
      footerNote: `Emitido por ${actor.name || actor.email}`, footerId: DOCUMENT_VERSION,
    });
    this.drawEmployeeSummary(report, data.employee, data.manager?.name);
    if (kind === 'POINT_SHEET') this.drawPointSheet(report, data);
    if (kind === 'OCCURRENCES') this.drawOccurrences(report, data);
    if (kind === 'EMPLOYEE_RECORD') this.drawEmployeeRecord(report, data.employee);
    report.signatures([{ label: 'Assinatura do colaborador', sub: data.employee.name }, { label: 'Assinatura do RH / empregador' }]);
    const generated = await this.documents.storePdf(companyId, 'REPORT', title, await report.finish(), actor.sub);

    const stored = await this.documents.getDocumentStream({ ...actor, companyId }, generated.id);
    return {
      ...stored,
      filename,
      documentId: generated.id,
      sha256: generated.sha256,
      version: DOCUMENT_VERSION,
    };
  }
  private parseMonth(month?: string) {
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException('Informe o periodo no formato YYYY-MM.');
    }
    const [year, monthNumber] = month.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, monthNumber - 1, 1)),
      end: new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999)),
    };
  }

  private documentTitle(kind: EmployeeDocumentKind, employeeName: string, monthLabel?: string) {
    if (kind === 'POINT_SHEET') return `Espelho de ponto - ${employeeName} - ${monthLabel}`;
    if (kind === 'OCCURRENCES') return `Ficha de ocorrencias - ${employeeName} - ${monthLabel}`;
    return `Ficha de registro - ${employeeName}`;
  }

  private filename(kind: EmployeeDocumentKind, employeeName: string, month?: string) {
    const slug = employeeName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const prefix =
      kind === 'POINT_SHEET' ? 'espelho-ponto' : kind === 'OCCURRENCES' ? 'ficha-ocorrencias' : 'ficha-registro';
    return `${prefix}-${slug || 'funcionario'}${month ? `-${month}` : ''}.pdf`;
  }

  private drawEmployeeSummary(report: PdfReport, employee: any, managerName?: string) {
    report.section('Identificação do colaborador');
    report.fields([
      ['Nome', this.value(employee.name)], ['Matrícula', this.value(employee.registration)], ['CPF', this.value(employee.cpf)], ['Status', this.value(employee.status)],
      ['Cargo', this.value(employee.position)], ['Departamento', this.value(employee.department)], ['Gestor', this.value(managerName)], ['Admissão', this.date(employee.admissionDate)],
    ]);
  }

  private drawPointSheet(report: PdfReport, data: any) {
    let totalWorked = 0;
    let totalBalance = 0;
    let overtime50 = 0;
    let overtime100 = 0;
    let late = 0;
    let earlyLeave = 0;
    for (const row of data.timeTracks) {
      totalWorked += row.totalWorked || 0;
      totalBalance += row.dailyBalance || 0;
      overtime50 += row.overtime50Minutes || 0;
      overtime100 += row.overtime100Minutes || 0;
      late += row.lateMinutes || 0;
      earlyLeave += row.earlyLeaveMinutes || 0;
    }
    report.section('Registros oficiais de ponto');
    report.table(
      [{ label: 'Data', width: 58 }, { label: 'Entrada', width: 50 }, { label: 'Intervalo', width: 88 }, { label: 'Saída', width: 50 }, { label: 'Trabalhado', width: 65 }, { label: 'Saldo', width: 60 }, { label: 'Ocorrência', width: 144 }],
      data.timeTracks.map((row: any) => {
        const balance = Number(row.dailyBalance || 0);
        return [
          this.date(row.date), this.time(row.entry), `${this.time(row.lunchStart)} / ${this.time(row.lunchReturn)}`, this.time(row.exit), this.minutes(row.totalWorked),
          { text: this.signedMinutes(row.dailyBalance), bold: balance !== 0, color: balance < 0 ? PDF.color.bad : balance > 0 ? PDF.color.ok : PDF.color.mut },
          { text: this.value(row.incidentType || row.manualReason || row.observation), color: PDF.color.mut },
        ];
      }),
      { fontSize: 8, emptyText: 'Nenhum registro de ponto na competência.' },
    );
    report.section('Resumo oficial do período');
    report.fields([
      ['Dias com registro', String(data.timeTracks.length)], ['Horas trabalhadas', this.minutes(totalWorked)], ['Saldo do período', this.signedMinutes(totalBalance)], ['Fechamento', data.closing?.status || 'NÃO FECHADO'],
      ['Hora extra 50%', this.minutes(overtime50)], ['Hora extra 100%', this.minutes(overtime100)], ['Atrasos', this.minutes(late)], ['Saídas antecipadas', this.minutes(earlyLeave)],
    ]);
    report.paragraph(`Regra de cálculo: ${data.closing?.calculationVersion || 'dados de ponto vigentes'}.`, { size: 8, color: PDF.color.mut });
  }

  private drawOccurrences(report: PdfReport, data: any) {
    const explicitDates = new Set<string>();
    const rows: string[][] = [];
    for (const occurrence of data.occurrences) {
      explicitDates.add(this.dateKey(occurrence.date));
      rows.push([this.date(occurrence.date), this.value(occurrence.type), String(occurrence.minutes || 0), this.value(occurrence.status), this.value(occurrence.reason || occurrence.observation)]);
    }
    for (const row of data.timeTracks) {
      if (!row.incidentType || explicitDates.has(this.dateKey(row.date))) continue;
      rows.push([
        this.date(row.date), String(row.incidentType), String((row.lateMinutes || 0) + (row.earlyLeaveMinutes || 0) + (row.absenceMinutes || 0)),
        row.manualStatus || 'CALCULADO', row.manualReason || row.observation || 'Ocorrência calculada pelo motor oficial de ponto',
      ]);
    }
    report.section('Ocorrências');
    report.table(
      [{ label: 'Data', width: 62 }, { label: 'Tipo', width: 115 }, { label: 'Minutos', width: 55, align: 'right' }, { label: 'Status', width: 80 }, { label: 'Motivo / observação', width: 203 }],
      rows, { fontSize: 8, emptyText: 'Nenhuma ocorrência registrada na competência.' },
    );
    report.section('Referência do fechamento');
    report.fields([
      ['Status', data.closing?.status || 'NÃO FECHADO'], ['Atrasos', this.minutes(data.closing?.lateMinutes)], ['Saídas antecipadas', this.minutes(data.closing?.earlyLeaveMinutes)], ['Ausências', this.minutes(data.closing?.absenceMinutes)],
    ]);
    report.paragraph(`Versão da regra: ${data.closing?.calculationVersion || 'dados de ponto vigentes'}.`, { size: 8, color: PDF.color.mut });
  }

  private drawEmployeeRecord(report: PdfReport, employee: any) {
    const sections: Array<[string, Array<[string, unknown]>]> = [
      ['Dados pessoais', [
        ['Nascimento', this.date(employee.birthDate)], ['Gênero', employee.gender], ['Estado civil', employee.maritalStatus], ['Nacionalidade', employee.nationality],
        ['Naturalidade', employee.birthplace], ['Escolaridade', employee.education], ['Mãe', employee.motherName], ['Pai', employee.fatherName],
        ['E-mail', employee.email], ['Telefone', employee.phone], ['Telefone alternativo', employee.secondaryPhone],
      ]],
      ['Documentos', [
        ['RG', employee.rg], ['Emissor / UF', [employee.rgIssuer, employee.rgState].filter(Boolean).join('/')], ['PIS / PASEP', employee.pis], ['Título eleitoral', employee.voterTitle],
        ['Zona / Seção', [employee.voterZone, employee.voterSection].filter(Boolean).join(' / ')], ['Reservista', employee.reservist], ['CNH', employee.cnh], ['Categoria CNH', employee.cnhCategory],
      ]],
      ['Endereço', [
        ['CEP', employee.cep], ['Logradouro', employee.street], ['Número', employee.streetNumber], ['Complemento', employee.addressComplement],
        ['Bairro', employee.neighborhood], ['Cidade / UF', [employee.city, employee.state].filter(Boolean).join(' / ')],
      ]],
      ['Contrato e jornada', [
        ['Tipo de contrato', employee.contractType], ['Salário', this.money(employee.salary)], ['Unidade', employee.unit], ['Escala', employee.customWorkScale || employee.workScale],
        ['Carga diária', employee.dailyWorkload], ['Entrada padrão', employee.standardEntry], ['Início do intervalo', employee.standardLunchStart], ['Fim do intervalo', employee.standardLunchReturn],
        ['Saída padrão', employee.standardExit], ['Desligamento', this.date(employee.terminationDate)],
      ]],
      ['Dados bancários', [
        ['Banco', employee.bankName], ['Código', employee.bankCode], ['Agência', employee.bankAgency], ['Conta', employee.bankAccount], ['Tipo de conta', employee.bankAccountType],
      ]],
    ];
    for (const [title, values] of sections) {
      report.section(title);
      report.fields(values.map(([label, value]) => [label, this.value(value)] as [string, string]), 3);
    }
    const dependents = this.dependents(employee.dependents);
    if (dependents.length) {
      report.section('Dependentes');
      report.table(
        [{ label: 'Nome', width: 190 }, { label: 'CPF', width: 115 }, { label: 'Nascimento', width: 95 }, { label: 'Parentesco', width: 115 }],
        dependents.map((dependent) => [dependent.nome || dependent.name || '-', dependent.cpf || '-', this.date(dependent.dataNascimento || dependent.birthDate), dependent.parentesco || dependent.relationship || '-']),
        { fontSize: 8 },
      );
    }
    if (employee.observations) {
      report.section('Observações');
      report.paragraph(String(employee.observations));
    }
  }
  private date(value?: Date | string | null) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  private dateTime(value: Date) {
    return value.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  private dateKey(value: Date | string) {
    return new Date(value).toISOString().slice(0, 10);
  }

  private monthLabel(value: Date) {
    const label = value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  private time(value?: Date | string | null) {
    if (!value) return '--:--';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '--:--'
      : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  }

  private minutes(value?: number | null) {
    const total = Math.max(0, Number(value || 0));
    return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
  }

  private signedMinutes(value?: number | null) {
    const total = Number(value || 0);
    return `${total > 0 ? '+' : total < 0 ? '-' : ''}${this.minutes(Math.abs(total))}`;
  }

  private money(value?: unknown) {
    if (value === null || value === undefined || value === '') return '-';
    const number = Number(value);
    return Number.isFinite(number)
      ? number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '-';
  }

  private dependents(value: unknown): any[] {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private value(value: unknown) {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  }
}
