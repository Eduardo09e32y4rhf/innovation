import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as xlsx from 'xlsx';
import { randomUUID } from 'crypto';

@Injectable()
export class EmployeesImportService {
  private readonly logger = new Logger(EmployeesImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  generateTemplate(): Buffer {
    const ws_name = 'Funcionários';
    const ws_data = [
      ['Nome Completo*', 'CPF*', 'E-mail', 'Departamento', 'Cargo', 'Matrícula', 'Data de Admissão (DD/MM/AAAA)', 'Telefone'],
      ['João da Silva', '12345678900', 'joao@email.com', 'TI', 'Desenvolvedor', '001', '01/01/2026', '11999999999'],
    ];
    const ws = xlsx.utils.aoa_to_sheet(ws_data);

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 30 }, // Nome
      { wch: 15 }, // CPF
      { wch: 30 }, // E-mail
      { wch: 20 }, // Departamento
      { wch: 20 }, // Cargo
      { wch: 15 }, // Matrícula
      { wch: 30 }, // Admissão
      { wch: 15 }, // Telefone
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, ws_name);

    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async importEmployees(companyId: string, fileBuffer: Buffer) {
    let workbook;
    try {
      workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    } catch (err) {
      throw new BadRequestException('Falha ao ler o arquivo Excel. Verifique se o formato é válido (.xlsx).');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet) as Record<string, string>[];

    if (!data || data.length === 0) {
      throw new BadRequestException('A planilha está vazia.');
    }

    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      // Ignorar a linha de exemplo (se for exatamente igual ao exemplo gerado)
      if (row['Nome Completo*'] === 'João da Silva' && row['CPF*'] === '12345678900') {
        continue;
      }

      const name = String(row['Nome Completo*'] || row['Nome'] || '').trim();
      let cpf = String(row['CPF*'] || row['CPF'] || '').replace(/[^\d]/g, '');
      const email = String(row['E-mail'] || row['Email'] || '').trim();
      const department = String(row['Departamento'] || '').trim();
      const position = String(row['Cargo'] || '').trim();
      const registration = String(row['Matrícula'] || '').trim();
      const admissionStr = String(row['Data de Admissão (DD/MM/AAAA)'] || row['Admissão'] || '').trim();
      const phone = String(row['Telefone'] || '').replace(/[^\d+]/g, '');

      if (!name) {
        errors.push(`Linha ${i + 2}: Nome Completo é obrigatório.`);
        continue;
      }
      if (!cpf || cpf.length !== 11) {
        errors.push(`Linha ${i + 2}: CPF inválido ou ausente (${name}).`);
        continue;
      }

      let admissionDate = new Date();
      if (admissionStr) {
        const parts = admissionStr.split('/');
        if (parts.length === 3) {
          admissionDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          const parsed = new Date(admissionStr);
          if (!isNaN(parsed.getTime())) {
            admissionDate = parsed;
          }
        }
      }

      try {
        await this.prisma.$transaction(async (tx: any) => {
          // Check for existing employee in same company with same CPF
          const existing = await tx.employee.findFirst({
            where: { companyId, cpf },
          });

          if (existing) {
            throw new Error('CPF já cadastrado nesta empresa.');
          }

          // Se tiver email, cria ou vincula o usuário
          let userId = null;
          if (email) {
            let user = await tx.user.findUnique({ where: { email } });
            if (!user) {
              user = await tx.user.create({
                data: {
                  email,
                  name,
                  password: randomUUID(), // Require password reset
                  profile: 'FUNCIONARIO',
                  companyId,
                },
              });
            }
            userId = user.id;
          }

          await tx.employee.create({
            data: {
              companyId,
              userId,
              name,
              cpf,
              email: email || `${cpf}@example.com`,
              department,
              position: position || 'Não definido',
              registration,
              admissionDate,
              phone: phone || null,
              status: 'ACTIVE',
            },
          });
        });
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Linha ${i + 2} (${name}): ${msg}`);
      }
    }

    return {
      message: `Processamento concluído.`,
      imported,
      errors,
    };
  }
}
