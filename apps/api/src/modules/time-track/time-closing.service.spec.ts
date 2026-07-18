import { BadRequestException } from '@nestjs/common';
import { PayrollCalculationService } from './payroll-calculation.service';
import { TimeClosingService } from './time-closing.service';

describe('TimeClosingService', () => {
  it('bloqueia fechamento quando a ficha nao possui salario', async () => {
    const prisma: any = {
      employee: { findMany: jest.fn().mockResolvedValue([{ id: 'employee-1', name: 'Sem Salario', salary: null }]) },
    };
    const service = new TimeClosingService(prisma, new PayrollCalculationService());
    await expect(service.generate('company-1', {} as any, { month: 7, year: 2026 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});