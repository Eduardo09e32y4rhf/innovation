import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { randomUUID } from 'node:crypto';
import * as xlsx from 'xlsx';
import { PrismaService } from '../../database/prisma.service';

const SHEET_NAME = 'Funcionários';
const HEADERS = ['Nome', 'CPF', 'E-mail', 'Departamento', 'Cargo', 'Data de admissão', 'Matrícula', 'Telefone'] as const;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 2_000;
const TOKEN_TTL_MS = 15 * 60 * 1000;

type ImportRow = {
  name: string;
  cpf: string;
  email: string | null;
  department: string;
  position: string;
  admissionDate: Date;
  registration: string | null;
  phone: string | null;
};

type ImportError = { row: number; column: string; message: string };

@Injectable()
export class EmployeesImportService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  generateTemplate(): Buffer {
    const sheet = xlsx.utils.aoa_to_sheet([Array.from(HEADERS)]);
    sheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true });
  }

  async validate(companyId: string, file: { filename: string; mimetype: string; buffer: Buffer }) {
    this.assertFile(file);
    const workbook = this.readWorkbook(file.buffer);
    if (workbook.SheetNames.length !== 1 || workbook.SheetNames[0] !== SHEET_NAME) {
      throw new BadRequestException('A planilha deve conter somente a aba Funcionários.');
    }
    if ((workbook as any).vbaraw) throw new BadRequestException('Planilhas com macros não são permitidas.');

    const sheet = workbook.Sheets[SHEET_NAME];
    this.assertNoActiveContent(sheet);
    const matrix = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
    const headers = (matrix[0] ?? []).map((value) => String(value).trim());
    if (headers.length !== HEADERS.length || HEADERS.some((header, index) => headers[index] !== header)) {
      throw new BadRequestException(`Cabeçalhos inválidos. Use exatamente: ${HEADERS.join(', ')}.`);
    }

    const rawRows = matrix.slice(1).filter((row) => row.some((value) => String(value).trim() !== ''));
    if (!rawRows.length) throw new BadRequestException('A planilha está vazia.');
    if (rawRows.length > MAX_ROWS) throw new BadRequestException(`O limite é de ${MAX_ROWS} linhas.`);

    const errors: ImportError[] = [];
    const rows: ImportRow[] = [];
    const cpfRows = new Map<string, number>();
    const registrationRows = new Map<string, number>();

    rawRows.forEach((values, index) => {
      const rowNumber = index + 2;
      const name = String(values[0]).trim();
      const cpf = String(values[1]).replace(/\D/g, '');
      const email = String(values[2]).trim().toLowerCase();
      const department = String(values[3]).trim();
      const position = String(values[4]).trim();
      const admissionDate = this.parseDate(String(values[5]).trim());
      const registration = String(values[6]).trim();
      const phone = String(values[7]).replace(/\D/g, '');

      if (!name) errors.push({ row: rowNumber, column: 'Nome', message: 'Nome é obrigatório.' });
      if (!this.isValidCpf(cpf)) errors.push({ row: rowNumber, column: 'CPF', message: 'CPF inválido.' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ row: rowNumber, column: 'E-mail', message: 'E-mail inválido.' });
      if (!department) errors.push({ row: rowNumber, column: 'Departamento', message: 'Departamento é obrigatório.' });
      if (!position) errors.push({ row: rowNumber, column: 'Cargo', message: 'Cargo é obrigatório.' });
      if (!admissionDate) errors.push({ row: rowNumber, column: 'Data de admissão', message: 'Use uma data válida no formato DD/MM/AAAA.' });

      if (cpf) {
        const first = cpfRows.get(cpf);
        if (first) errors.push({ row: rowNumber, column: 'CPF', message: `CPF repetido no arquivo (primeira ocorrência na linha ${first}).` });
        else cpfRows.set(cpf, rowNumber);
      }
      if (registration) {
        const key = registration.toLocaleLowerCase('pt-BR');
        const first = registrationRows.get(key);
        if (first) errors.push({ row: rowNumber, column: 'Matrícula', message: `Matrícula repetida no arquivo (primeira ocorrência na linha ${first}).` });
        else registrationRows.set(key, rowNumber);
      }

      if (name && this.isValidCpf(cpf) && department && position && admissionDate) {
        rows.push({ name, cpf, email: email || null, department, position, admissionDate, registration: registration || null, phone: phone || null });
      }
    });

    const existing = await this.prisma.employee.findMany({
      where: {
        companyId,
        OR: [
          { cpf: { in: [...cpfRows.keys()] } },
          ...[...registrationRows.keys()].map((registration) => ({ registration: { equals: registration, mode: 'insensitive' as const } })),
        ],
      },
      select: { cpf: true, registration: true },
    });
    for (const item of existing) {
      if (item.cpf && cpfRows.has(item.cpf)) errors.push({ row: cpfRows.get(item.cpf)!, column: 'CPF', message: 'CPF já cadastrado.' });
      const key = item.registration?.toLocaleLowerCase('pt-BR');
      if (key && registrationRows.has(key)) errors.push({ row: registrationRows.get(key)!, column: 'Matrícula', message: 'Matrícula já cadastrada.' });
    }

    const valid = errors.length === 0 && rows.length === rawRows.length;
    let importToken: string | null = null;
    if (valid) {
      importToken = randomUUID();
      await this.cache.set(`employees-import:${importToken}`, { companyId, rows }, TOKEN_TTL_MS);
    }

    return {
      valid,
      importToken,
      totalRows: rawRows.length,
      validRows: valid ? rows.length : Math.max(0, rawRows.length - new Set(errors.map((error) => error.row)).size),
      invalidRows: new Set(errors.map((error) => error.row)).size,
      preview: rows.slice(0, 20),
      errors,
    };
  }

  async confirm(companyId: string, userId: string, importToken: string) {
    const key = `employees-import:${importToken}`;
    const payload = await this.cache.get<{ companyId: string; rows: ImportRow[] }>(key);
    if (!payload || payload.companyId !== companyId) throw new BadRequestException('Importação expirada ou inválida.');
    if (!payload.rows.length || payload.rows.length > MAX_ROWS) throw new BadRequestException('Importação sem linhas válidas.');

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.employee.createMany({
        data: payload.rows.map((row) => ({ ...row, companyId, status: 'ACTIVE' })),
      });
      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          action: 'EMPLOYEES_IMPORTED',
          entity: 'Employee',
          metadata: { imported: created.count },
        },
      });
      return created;
    });
    await this.cache.del(key);
    return { imported: result.count, errors: [] };
  }

  private assertFile(file: { filename: string; mimetype: string; buffer: Buffer }) {
    if (!file.filename.toLowerCase().endsWith('.xlsx')) throw new BadRequestException('Envie somente arquivo .xlsx.');
    if (file.filename.toLowerCase().endsWith('.xlsm') || file.filename.toLowerCase().endsWith('.xls')) throw new BadRequestException('Arquivos .xls e .xlsm não são permitidos.');
    if (file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') throw new BadRequestException('Tipo MIME inválido para .xlsx.');
    if (!file.buffer.length || file.buffer.length > MAX_BYTES) throw new BadRequestException('O arquivo deve ter no máximo 2 MB.');
    if (file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) throw new BadRequestException('Assinatura do arquivo XLSX inválida.');
  }

  private readWorkbook(buffer: Buffer): xlsx.WorkBook {
    try {
      return xlsx.read(buffer, { type: 'buffer', bookVBA: true, cellFormula: true, cellHTML: false, cellNF: false });
    } catch {
      throw new BadRequestException('Arquivo XLSX malformado.');
    }
  }

  private assertNoActiveContent(sheet: xlsx.WorkSheet) {
    for (const [address, cell] of Object.entries(sheet)) {
      if (address.startsWith('!')) continue;
      if ((cell as xlsx.CellObject).f) throw new BadRequestException(`Fórmulas não são permitidas (${address}).`);
      if ((cell as any).l) throw new BadRequestException(`Links externos não são permitidos (${address}).`);
    }
  }

  private parseDate(value: string): Date | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
    return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[1]) ? date : null;
  }

  private isValidCpf(cpf: string) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
    const digits = cpf.split('').map(Number);
    const calculate = (length: number) => {
      const sum = digits.slice(0, length).reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return calculate(9) === digits[9] && calculate(10) === digits[10];
  }
}
