import { BadRequestException } from '@nestjs/common';
import { PayrollCalculationService } from './payroll-calculation.service';
import { TimeClosingService } from './time-closing.service';
import { vi } from 'vitest';

describe('TimeClosingService', () => {
  it('bloqueia fechamento quando a ficha nao possui salario', async () => {
    const prisma: any = {
      employee: { findMany: vi.fn().mockResolvedValue([{ id: 'employee-1', name: 'Sem Salario', salary: null }]) },
      company: { findUnique: vi.fn().mockResolvedValue({ payrollStartDay: 1 }) },
    };
    const service = new TimeClosingService(prisma, new PayrollCalculationService());
    await expect(service.generate('company-1', {} as any, { month: 7, year: 2026 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});