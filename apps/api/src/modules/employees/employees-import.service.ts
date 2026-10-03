import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { randomUUID, randomBytes } from 'node:crypto';
import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { encryptTemporaryPassword } from '../../common/crypto/temporary-password';

const SHEET_NAME = 'Funcionários';
const HEADERS = ['Nome', 'CPF', 'E-mail', 'Departamento', 'Cargo', 'Data de admissão', 'Matrícula', 'Telefone', 'Perfil de acesso', 'Criar acesso'] as const;
const REQUIRED_HEADERS = ['Nome', 'CPF', 'Departamento', 'Cargo', 'Data de admissão'] as const;
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
  accessProfile?: string | null;
  createAccess?: 'SIM' | 'NÃO' | null;
};

type ImportError = { row: number; column: string; message: string };
type ImportResult = { employeeId: string; success: true; temporaryPassword?: string } | { employeeId?: string; row: number; success: false; error: string };

@Injectable()
export class EmployeesImportService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(SHEET_NAME);
    sheet.addRow(Array.from(HEADERS));
    sheet.columns = [
      { width: 30 }, { width: 15 }, { width: 30 }, { width: 22 },
      { width: 22 }, { width: 20 }, { width: 18 }, { width: 18 },
      { width: 22 }, { width: 15 }
    ];
    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async validate(companyId: string, file: { filename: string; mimetype: string; buffer: Buffer }) {
    this.assertFile(file);

    const isCSV = file.filename.toLowerCase().endsWith('.csv');
    const isCaseSensitiveCheck = file.mimetype === 'text/csv' || file.filename.toLowerCase().endsWith('.csv');

    const matrix = isCSV
      ? this.parseCSV(file.buffer)
      : await this.parseXLSX(file.buffer);

    if (!matrix.length) throw new BadRequestException('A planilha está vazia.');
    if (matrix.length - 1 > MAX_ROWS) throw new BadRequestException(`O limite é de ${MAX_ROWS} linhas.`);

    const headers = (matrix[0] ?? []).map((value) => String(value).trim());
    const headerIndices = this.mapHeaders(headers);
    if (headerIndices.length === 0) {
      throw new BadRequestException(`Cabeçalhos inválidos. Use pelo menos: ${REQUIRED_HEADERS.join(', ')}.`);
    }

    const rawRows = matrix.slice(1).filter((row) => row.some((value) => String(value).trim() !== ''));
    if (!rawRows.length) throw new BadRequestException('A planilha está vazia.');

    const errors: ImportError[] = [];
    const rows: ImportRow[] = [];
    const cpfRows = new Map<string, number>();
    const registrationRows = new Map<string, number>();

    rawRows.forEach((values, index) => {
      const rowNumber = index + 2;
      const extractValue = (header: string) => {
        const idx = headers.indexOf(header);
        return idx >= 0 ? String(values[idx] || '').trim() : '';
      };

      const name = extractValue('Nome');
      const cpf = extractValue('CPF').replace(/\D/g, '');
      const email = extractValue('E-mail').toLowerCase();
      const department = extractValue('Departamento');
      const position = extractValue('Cargo');
      const admissionDate = this.parseDate(extractValue('Data de admissão'));
      const registration = extractValue('Matrícula');
      const phone = extractValue('Telefone').replace(/\D/g, '');
      const accessProfile = extractValue('Perfil de acesso') || null;
      const createAccess = extractValue('Criar acesso')?.toUpperCase().includes('SIM') ? 'SIM' : (extractValue('Criar acesso')?.toUpperCase().includes('NÃO') ? 'NÃO' : null);

      if (!name) errors.push({ row: rowNumber, column: 'Nome', message: 'Nome é obrigatório.' });
      if (!this.isValidCpf(cpf)) errors.push({ row: rowNumber, column: 'CPF', message: 'CPF inválido.' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ row: rowNumber, column: 'E-mail', message: 'E-mail inválido.' });
      if (!department) errors.push({ row: rowNumber, column: 'Departamento', message: 'Departamento é obrigatório.' });
      if (!position) errors.push({ row: rowNumber, column: 'Cargo', message: 'Cargo é obrigatório.' });
      if (!admissionDate) errors.push({ row: rowNumber, column: 'Data de admissão', message: 'Use uma data válida no formato DD/MM/AAAA.' });

      if (cpf) {
        const first = cpfRows.get(cpf);
        if (first) {
          errors.push({ row: rowNumber, column: 'CPF', message: `CPF repetido no arquivo (primeira ocorrência na linha ${first}).` });
        } else {
          cpfRows.set(cpf, rowNumber);
        }
      }
      if (registration) {
        const key = registration.toLocaleLowerCase('pt-BR');
        const first = registrationRows.get(key);
        if (first) {
          errors.push({ row: rowNumber, column: 'Matrícula', message: `Matrícula repetida no arquivo (primeira ocorrência na linha ${first}).` });
        } else {
          registrationRows.set(key, rowNumber);
        }
      }

      if (name && this.isValidCpf(cpf) && department && position && admissionDate) {
        rows.push({
          name,
          cpf,
          email: email || null,
          department,
          position,
          admissionDate,
          registration: registration || null,
          phone: phone || null,
          accessProfile: accessProfile || null,
          createAccess: createAccess || null,
        });
      }
    });

    // Checar CPF duplicado entre empresas (global)
    const globalCpfs = await this.prisma.employee.findMany({
      where: { cpf: { in: [...cpfRows.keys()] } },
      select: { cpf: true },
    });
    for (const item of globalCpfs) {
      if (item.cpf && cpfRows.has(item.cpf)) {
        errors.push({ row: cpfRows.get(item.cpf)!, column: 'CPF', message: 'CPF já cadastrado em outra empresa.' });
      }
    }

    // Checar duplicatas na empresa
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
      if (item.cpf && cpfRows.has(item.cpf)) errors.push({ row: cpfRows.get(item.cpf)!, column: 'CPF', message: 'CPF já cadastrado nesta empresa.' });
      const key = item.registration?.toLocaleLowerCase('pt-BR');
      if (key && registrationRows.has(key)) errors.push({ row: registrationRows.get(key)!, column: 'Matrícula', message: 'Matrícula já cadastrada nesta empresa.' });
    }

    // Importação parcial: sempre criar token, mesmo com erros
    const importToken = randomUUID();
    const errorsByRow = new Map<number, ImportError[]>();
    errors.forEach((err) => {
      if (!errorsByRow.has(err.row)) errorsByRow.set(err.row, []);
      errorsByRow.get(err.row)!.push(err);
    });

    const invalidRowNumbers = new Set(errors.map((error) => error.row));
    const validRows = rows.filter((_, idx) => !invalidRowNumbers.has(idx + 2));
    const invalidRows = rawRows
      .map((_, idx) => idx + 2)
      .filter((rowNum) => invalidRowNumbers.has(rowNum))
      .map((rowNum) => ({
        row: rowNum,
        values: rawRows[rowNum - 2],
        errors: errorsByRow.get(rowNum) || [],
      }));

    await this.cache.set(`employees-import:${importToken}`, { companyId, rows: validRows, invalidRows }, TOKEN_TTL_MS);

    return {
      valid: errors.length === 0,
      importToken,
      totalRows: rawRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      preview: validRows.slice(0, 20),
      errors,
      invalidRowsData: invalidRows,
    };
  }

  async confirm(companyId: string, userId: string, importToken: string) {
    const key = `employees-import:${importToken}`;
    const payload = await this.cache.get<{ companyId: string; rows: ImportRow[]; invalidRows: any[] }>(key);
    if (!payload || payload.companyId !== companyId) throw new BadRequestException('Importação expirada ou inválida.');
    if (!payload.rows.length) throw new BadRequestException('Nenhuma linha válida para importar.');

    const results: ImportResult[] = [];

    const created = await this.prisma.$transaction(async (tx) => {
      let count = 0;
      for (const row of payload.rows) {
        try {
          const employee = await tx.employee.create({
            data: {
              companyId,
              ...row,
              status: 'ACTIVE',
            },
          });
          count++;

          // Criar ASO admissional
          await tx.employeeAsoRecord.create({
            data: {
              companyId,
              employeeId: employee.id,
              asoType: 'ADMISSIONAL',
              status: 'PENDING',
            } as any,
          });

          // Criar acesso se solicitado
          let temporaryPassword: string | null = null;
          if (row.createAccess === 'SIM' && row.email) {
            const role = this.resolveAccessRole(row.accessProfile);
            temporaryPassword = this.generateTemporaryPassword();
            const passwordHash = await bcrypt.hash(temporaryPassword, 12);

            const existingUser = await tx.user.findUnique({ where: { email: row.email } });
            if (!existingUser) {
              const newUser = await tx.user.create({
                data: {
                  companyId,
                  name: row.name,
                  email: row.email,
                  role: role as any,
                  passwordHash,
                  forcePasswordChange: true,
                  isActive: true,
                },
              });

              await tx.temporaryCredential.create({
                data: {
                  userId: newUser.id,
                  encryptedValue: encryptTemporaryPassword(temporaryPassword),
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              });

              await tx.employee.update({
                where: { id: employee.id },
                data: { userId: newUser.id },
              });
            }
          }

          results.push({
            employeeId: employee.id,
            success: true,
            temporaryPassword: temporaryPassword || undefined,
          });
        } catch (error: any) {
          results.push({
            row: payload.rows.indexOf(row) + 2,
            success: false,
            error: error.message || 'Erro ao importar funcionário',
          });
        }
      }
      return count;
    });

    await this.cache.del(key);
    return {
      imported: created,
      totalProcessed: payload.rows.length + (payload.invalidRows?.length || 0),
      invalidRows: payload.invalidRows?.length || 0,
      results,
    };
  }

  private assertFile(file: { filename: string; mimetype: string; buffer: Buffer }) {
    const isCSV = file.filename.toLowerCase().endsWith('.csv');
    const isXLSX = file.filename.toLowerCase().endsWith('.xlsx');

    if (!isCSV && !isXLSX) throw new BadRequestException('Envie somente arquivo .csv ou .xlsx.');
    if (file.filename.toLowerCase().endsWith('.xlsm') || file.filename.toLowerCase().endsWith('.xls')) throw new BadRequestException('Arquivos .xls e .xlsm não são permitidos.');

    if (!file.buffer.length || file.buffer.length > MAX_BYTES) throw new BadRequestException('O arquivo deve ter no máximo 2 MB.');

    // Validar assinatura do arquivo
    if (isXLSX && (file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b)) throw new BadRequestException('Assinatura do arquivo XLSX inválida.');
  }

  private parseCSV(buffer: Buffer): string[][] {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').filter((line) => line.trim());
    return lines.map((line) => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"') {
          if (inQuotes && next === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === ',' || char === ';') && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current);
      return values;
    });
  }

  private async parseXLSX(buffer: Buffer): Promise<string[][]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      if (workbook.worksheets.length !== 1 || workbook.worksheets[0].name !== SHEET_NAME) {
        throw new BadRequestException('A planilha deve conter somente a aba Funcionários.');
      }

      const sheet = workbook.worksheets[0];
      this.assertNoActiveContent(sheet);

      const matrix: string[][] = [];
      sheet.eachRow((row) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        const stringValues = Array.from({ length: 10 }).map((_, i) => {
          const val = values[i];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') {
            if ('result' in val) return String(val.result);
            if ('richText' in val) return (val as any).richText.map((rt: any) => rt.text).join('');
            if (val instanceof Date) {
              const d = String(val.getUTCDate()).padStart(2, '0');
              const m = String(val.getUTCMonth() + 1).padStart(2, '0');
              const y = val.getUTCFullYear();
              return `${d}/${m}/${y}`;
            }
          }
          return String(val);
        });
        matrix.push(stringValues);
      });

      return matrix;
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Arquivo XLSX malformado.');
    }
  }

  private assertNoActiveContent(sheet: ExcelJS.Worksheet) {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.type === ExcelJS.ValueType.Formula) throw new BadRequestException(`Fórmulas não são permitidas (${cell.address}).`);
        if (cell.type === ExcelJS.ValueType.Hyperlink) throw new BadRequestException(`Links externos não são permitidos (${cell.address}).`);
      });
    });
  }

  private mapHeaders(headers: string[]): number[] {
    return headers.map((header, idx) => (REQUIRED_HEADERS.includes(header as any) || HEADERS.includes(header as any) ? idx : -1)).filter((idx) => idx >= 0);
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

  private generateTemporaryPassword() {
    return `Aa1!${randomBytes(18).toString('hex')}`;
  }

  private resolveAccessRole(role?: string | null) {
    const ALLOWED = ['FUNCIONARIO', 'GESTOR', 'RH', 'ADMIN', 'CONSULTA'];
    if (role && ALLOWED.includes(role)) return role;
    return 'FUNCIONARIO';
  }
}
