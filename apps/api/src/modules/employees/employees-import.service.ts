import { Injectable, BadRequestException } from '@nestjs/common';
import { MultipartFile } from '@fastify/multipart';
import { EmployeesRepository } from './employees.repository';

@Injectable()
export class EmployeesImportService {
  constructor(private readonly repository: EmployeesRepository) {}

  async processImport(file: MultipartFile): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const buffer = await file.toBuffer();
      const content = buffer.toString('utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      for (let i = 1; i < lines.length; i++) {
        try {
          const [name, email, document, role] = lines[i].split(',').map((s) => s.trim());
          if (!name || !email) {
            errors.push(`Line ${i + 1}: missing required fields`);
            continue;
          }
          // TODO: implement actual import logic
          imported++;
        } catch (err: any) {
          errors.push(`Line ${i + 1}: ${err.message}`);
        }
      }
    } catch (err: any) {
      throw new BadRequestException(`Failed to process file: ${err.message}`);
    }

    return { imported, errors };
  }

  async generateTemplate(): Promise<string> {
    const header = 'name,email,document,role';
    const example = 'John Doe,john@example.com,12345678900,FUNCIONARIO';
    return `${header}\n${example}\n`;
  }
}