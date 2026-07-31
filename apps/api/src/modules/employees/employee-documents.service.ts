import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { DocumentService } from '../documents/document.service';
import { EmployeesRepository } from './employees.repository';

type EmployeeDocumentKind = 'POINT_SHEET' | 'OCCURRENCES' | 'EMPLOYEE_RECORD';

const DOCUMENT_VERSION = 'EMPLOYEE_DOCS_2026_1';

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

    const generated = await this.documents.generateDocument(
      companyId,
      'REPORT',
      title,
      (doc: any) => {
        this.drawHeader(doc, data.company, title, actor, monthLabel);
        this.drawEmployeeSummary(doc, data.employee, data.manager?.name);

        if (kind === 'POINT_SHEET') this.drawPointSheet(doc, data);
        if (kind === 'OCCURRENCES') this.drawOccurrences(doc, data);
        if (kind === 'EMPLOYEE_RECORD') this.drawEmployeeRecord(doc, data.employee);

        this.drawSignatures(doc);
        this.drawFooter(doc);
      },
      actor.sub,
    );

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

  private drawHeader(doc: any, company: any, title: string, actor: JwtUser, monthLabel?: string) {
    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(company?.legalName || company?.name || 'Empresa', { align: 'left' })
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#475569')
      .text(this.companyLine(company))
      .moveDown(0.8)
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(17)
      .text(title)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text(
        `Emitido em ${this.dateTime(new Date())} por ${actor.name || actor.email} | Versao ${DOCUMENT_VERSION}${
          monthLabel ? ` | Competencia ${monthLabel}` : ''
        }`,
      )
      .moveDown(1);
    this.rule(doc);
  }

  private drawEmployeeSummary(doc: any, employee: any, managerName?: string) {
    this.sectionTitle(doc, 'Identificacao do colaborador');
    this.keyValueGrid(doc, [
      ['Nome', employee.name],
      ['Matricula', employee.registration],
      ['CPF', employee.cpf],
      ['Cargo', employee.position],
      ['Departamento', employee.department],
      ['Gestor', managerName],
      ['Admissao', this.date(employee.admissionDate)],
      ['Status', employee.status],
    ]);
  }

  private drawPointSheet(doc: any, data: any) {
    this.sectionTitle(doc, 'Registros oficiais de ponto');
    this.tableHeader(doc, ['Data', 'Entrada', 'Intervalo', 'Saida', 'Trabalhado', 'Saldo', 'Ocorrencia'], [58, 48, 82, 48, 62, 52, 120]);

    let totalWorked = 0;
    let totalBalance = 0;
    let overtime50 = 0;
    let overtime100 = 0;
    let late = 0;
    let earlyLeave = 0;

    for (const row of data.timeTracks) {
      this.ensurePage(doc, 42);
      totalWorked += row.totalWorked || 0;
      totalBalance += row.dailyBalance || 0;
      overtime50 += row.overtime50Minutes || 0;
      overtime100 += row.overtime100Minutes || 0;
      late += row.lateMinutes || 0;
      earlyLeave += row.earlyLeaveMinutes || 0;
      this.tableRow(
        doc,
        [
          this.date(row.date),
          this.time(row.entry),
          `${this.time(row.lunchStart)} / ${this.time(row.lunchReturn)}`,
          this.time(row.exit),
          this.minutes(row.totalWorked),
          this.signedMinutes(row.dailyBalance),
          row.incidentType || row.manualReason || row.observation || '-',
        ],
        [58, 48, 82, 48, 62, 52, 120],
      );
    }

    if (!data.timeTracks.length) this.emptyRow(doc, 'Nenhum registro de ponto na competencia.');

    this.sectionTitle(doc, 'Resumo oficial do periodo');
    this.keyValueGrid(doc, [
      ['Dias com registro', String(data.timeTracks.length)],
      ['Horas trabalhadas', this.minutes(totalWorked)],
      ['Saldo do periodo', this.signedMinutes(totalBalance)],
      ['Hora extra 50%', this.minutes(overtime50)],
      ['Hora extra 100%', this.minutes(overtime100)],
      ['Atrasos', this.minutes(late)],
      ['Saidas antecipadas', this.minutes(earlyLeave)],
      ['Fechamento', data.closing?.status || 'NAO FECHADO'],
      ['Regra de calculo', data.closing?.calculationVersion || 'DADOS DE PONTO VIGENTES'],
    ]);
  }

  private drawOccurrences(doc: any, data: any) {
    this.sectionTitle(doc, 'Ocorrencias persistidas');
    this.tableHeader(doc, ['Data', 'Tipo', 'Minutos', 'Status', 'Motivo / observacao'], [65, 110, 55, 75, 165]);

    const explicitDates = new Set<string>();
    for (const occurrence of data.occurrences) {
      this.ensurePage(doc, 42);
      explicitDates.add(this.dateKey(occurrence.date));
      this.tableRow(
        doc,
        [
          this.date(occurrence.date),
          occurrence.type,
          String(occurrence.minutes || 0),
          occurrence.status,
          occurrence.reason || occurrence.observation || '-',
        ],
        [65, 110, 55, 75, 165],
      );
    }

    for (const row of data.timeTracks) {
      if (!row.incidentType || explicitDates.has(this.dateKey(row.date))) continue;
      this.ensurePage(doc, 42);
      this.tableRow(
        doc,
        [
          this.date(row.date),
          row.incidentType,
          String((row.lateMinutes || 0) + (row.earlyLeaveMinutes || 0) + (row.absenceMinutes || 0)),
          row.manualStatus || 'CALCULADO',
          row.manualReason || row.observation || 'Ocorrencia calculada pelo motor oficial de ponto',
        ],
        [65, 110, 55, 75, 165],
      );
    }

    if (!data.occurrences.length && !data.timeTracks.some((row: any) => row.incidentType)) {
      this.emptyRow(doc, 'Nenhuma ocorrencia registrada na competencia.');
    }

    this.sectionTitle(doc, 'Referencia do fechamento');
    this.keyValueGrid(doc, [
      ['Status', data.closing?.status || 'NAO FECHADO'],
      ['Versao da regra', data.closing?.calculationVersion || 'DADOS DE PONTO VIGENTES'],
      ['Atrasos', this.minutes(data.closing?.lateMinutes)],
      ['Saidas antecipadas', this.minutes(data.closing?.earlyLeaveMinutes)],
      ['Ausencias', this.minutes(data.closing?.absenceMinutes)],
    ]);
  }

  private drawEmployeeRecord(doc: any, employee: any) {
    const sections: Array<[string, Array<[string, unknown]>]> = [
      [
        'Dados pessoais',
        [
          ['Nascimento', this.date(employee.birthDate)],
          ['Genero', employee.gender],
          ['Estado civil', employee.maritalStatus],
          ['Nacionalidade', employee.nationality],
          ['Naturalidade', employee.birthplace],
          ['Escolaridade', employee.education],
          ['Mae', employee.motherName],
          ['Pai', employee.fatherName],
          ['E-mail', employee.email],
          ['Telefone', employee.phone],
          ['Telefone alternativo', employee.secondaryPhone],
        ],
      ],
      [
        'Documentos',
        [
          ['RG', employee.rg],
          ['Emissor / UF', [employee.rgIssuer, employee.rgState].filter(Boolean).join('/')],
          ['PIS / PASEP', employee.pis],
          ['Titulo eleitoral', employee.voterTitle],
          ['Zona / Secao', [employee.voterZone, employee.voterSection].filter(Boolean).join(' / ')],
          ['Reservista', employee.reservist],
          ['CNH', employee.cnh],
          ['Categoria CNH', employee.cnhCategory],
        ],
      ],
      [
        'Endereco',
        [
          ['CEP', employee.cep],
          ['Logradouro', employee.street],
          ['Numero', employee.streetNumber],
          ['Complemento', employee.addressComplement],
          ['Bairro', employee.neighborhood],
          ['Cidade / UF', [employee.city, employee.state].filter(Boolean).join(' / ')],
        ],
      ],
      [
        'Contrato e jornada',
        [
          ['Tipo de contrato', employee.contractType],
          ['Salario', this.money(employee.salary)],
          ['Unidade', employee.unit],
          ['Escala', employee.customWorkScale || employee.workScale],
          ['Carga diaria', employee.dailyWorkload],
          ['Entrada padrao', employee.standardEntry],
          ['Inicio do intervalo', employee.standardLunchStart],
          ['Fim do intervalo', employee.standardLunchReturn],
          ['Saida padrao', employee.standardExit],
          ['Desligamento', this.date(employee.terminationDate)],
        ],
      ],
      [
        'Dados bancarios',
        [
          ['Banco', employee.bankName],
          ['Codigo', employee.bankCode],
          ['Agencia', employee.bankAgency],
          ['Conta', employee.bankAccount],
          ['Tipo de conta', employee.bankAccountType],
        ],
      ],
    ];

    for (const [title, values] of sections) {
      this.sectionTitle(doc, title);
      this.keyValueGrid(doc, values);
    }

    const dependents = this.dependents(employee.dependents);
    if (dependents.length) {
      this.sectionTitle(doc, 'Dependentes');
      this.tableHeader(doc, ['Nome', 'CPF', 'Nascimento', 'Parentesco'], [150, 105, 105, 110]);
      dependents.forEach((dependent) =>
        this.tableRow(
          doc,
          [
            dependent.nome || dependent.name || '-',
            dependent.cpf || '-',
            this.date(dependent.dataNascimento || dependent.birthDate),
            dependent.parentesco || dependent.relationship || '-',
          ],
          [150, 105, 105, 110],
        ),
      );
    }

    if (employee.observations) {
      this.sectionTitle(doc, 'Observacoes');
      doc.font('Helvetica').fontSize(9).fillColor('#334155').text(employee.observations);
    }
  }

  private drawSignatures(doc: any) {
    this.ensurePage(doc, 90);
    doc.moveDown(3);
    const y = doc.y;
    doc.strokeColor('#94a3b8').moveTo(55, y).lineTo(260, y).stroke();
    doc.moveTo(335, y).lineTo(540, y).stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#475569')
      .text('Assinatura do colaborador', 55, y + 7, { width: 205, align: 'center' })
      .text('Assinatura do RH / empregador', 335, y + 7, { width: 205, align: 'center' });
  }

  private drawFooter(doc: any) {
    const pages = doc.bufferedPageRange();
    for (let index = pages.start; index < pages.start + pages.count; index++) {
      doc.switchToPage(index);
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text(
          `Documento oficial gerado pelo backend | ${DOCUMENT_VERSION} | Pagina ${index + 1} de ${pages.count}`,
          50,
          doc.page.height - 35,
          { align: 'center', width: doc.page.width - 100 },
        );
    }
  }

  private sectionTitle(doc: any, title: string) {
    this.ensurePage(doc, 70);
    doc.moveDown(0.9).font('Helvetica-Bold').fontSize(10).fillColor('#0f766e').text(title.toUpperCase());
    doc.moveDown(0.35);
  }

  private keyValueGrid(doc: any, items: Array<[string, unknown]>) {
    const width = 235;
    for (let index = 0; index < items.length; index += 2) {
      this.ensurePage(doc, 38);
      const y = doc.y;
      this.keyValue(doc, items[index][0], items[index][1], 50, y, width);
      if (items[index + 1]) this.keyValue(doc, items[index + 1][0], items[index + 1][1], 310, y, width);
      doc.y = y + 30;
    }
  }

  private keyValue(doc: any, label: string, value: unknown, x: number, y: number, width: number) {
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748b').text(label.toUpperCase(), x, y, { width });
    doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(this.value(value), x, y + 10, { width });
  }

  private tableHeader(doc: any, labels: string[], widths: number[]) {
    this.ensurePage(doc, 48);
    const y = doc.y;
    doc.rect(50, y, widths.reduce((sum, width) => sum + width, 0), 22).fill('#0f172a');
    let x = 50;
    labels.forEach((label, index) => {
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff').text(label, x + 4, y + 7, {
        width: widths[index] - 8,
        ellipsis: true,
      });
      x += widths[index];
    });
    doc.y = y + 22;
  }

  private tableRow(doc: any, values: unknown[], widths: number[]) {
    const y = doc.y;
    const rowHeight = 30;
    doc.rect(50, y, widths.reduce((sum, width) => sum + width, 0), rowHeight).fill('#f8fafc');
    let x = 50;
    values.forEach((value, index) => {
      doc.font('Helvetica').fontSize(7).fillColor('#334155').text(this.value(value), x + 4, y + 6, {
        width: widths[index] - 8,
        height: rowHeight - 8,
        ellipsis: true,
      });
      x += widths[index];
    });
    doc.y = y + rowHeight + 1;
  }

  private emptyRow(doc: any, message: string) {
    this.ensurePage(doc, 38);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(message, 50, doc.y + 8, {
      width: 490,
      align: 'center',
    });
    doc.y += 32;
  }

  private ensurePage(doc: any, requiredHeight: number) {
    if (doc.y + requiredHeight <= doc.page.height - 55) return;
    doc.addPage();
  }

  private rule(doc: any) {
    doc.strokeColor('#cbd5e1').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.7);
  }

  private companyLine(company: any) {
    return [
      company?.document,
      company?.phone,
      company?.email,
      [company?.street, company?.streetNumber, company?.neighborhood, company?.city, company?.state, company?.zipCode]
        .filter(Boolean)
        .join(', '),
    ]
      .filter(Boolean)
      .join(' | ');
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
