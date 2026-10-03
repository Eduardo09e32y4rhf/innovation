import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PayrollStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { PayrollRepository } from './payroll.repository';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PayrollService {
  constructor(
    private readonly repo: PayrollRepository,
    private readonly prisma: PrismaService,
    private readonly officialCalculator: PayrollCalculationService,
  ) {}

  list(companyId: string, year?: number, month?: number) {
    return this.repo.findAll(companyId, year, month);
  }

  async get(companyId: string, id: string) {
    const payroll = await this.repo.findOne(companyId, id);
    if (!payroll) throw new NotFoundException('Folha de pagamento não encontrada.');
    return payroll;
  }

  async calculate(companyId: string, dto: CreatePayrollDto) {
    // 1. Busca o funcionário garantindo que pertence à empresa
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, id: dto.employeeId },
      select: { id: true, name: true, salary: true, dependents: true },
    });

    if (!employee) throw new NotFoundException('Funcionário não encontrado.');

    // 2. Verifica duplicidade
    const existing = await this.repo.existsForPeriod(
      companyId,
      dto.employeeId,
      dto.referenceMonth,
      dto.referenceYear,
    );
    if (existing) {
      throw new ConflictException(
        `Já existe uma folha de pagamento para este funcionário no período ${dto.referenceMonth}/${dto.referenceYear}.`,
      );
    }

    // 3. Salário base
    const baseSalary = round2(Number(employee.salary ?? 0));
    const grossSalary = baseSalary; // pode ser expandido futuramente (horas extras, adicional noturno, etc.)

    // 4. Número de dependentes extraído do JSON do funcionário
    const dependentsData = employee.dependents as Array<{ name?: string }> | null;
    const dependentCount = Array.isArray(dependentsData) ? dependentsData.length : 0;

    // 5. O mesmo motor versionado usado pelo fechamento oficial.
    const taxContext = await this.officialCalculator.resolveTaxContext(new Date(Date.UTC(dto.referenceYear, dto.referenceMonth - 1, 1)));
    const calculation = this.officialCalculator.calculate({
      salary: grossSalary,
      weeklyMinutes: 2640,
      overtime50Minutes: 0,
      overtime100Minutes: 0,
      nightShiftMinutes: 0,
      absenceMinutes: 0,
      payableWorkdays: 22,
      paidRestDays: 0,
      dependents: dependentCount,
      taxContext,
    });
    const inssAmount = calculation.inssDiscount;
    const irrfAmount = calculation.irrfDiscount;
    const fgtsAmount = calculation.fgtsAmount;
    const netSalary = calculation.netPay;

    // 6. Monta os itens discriminados
    const items: Array<{
      companyId: string;
      type: import('@prisma/client').PayrollItemType;
      description: string;
      amount: number;
      isDeduction: boolean;
    }> = [
      {
        companyId,
        type: 'BASE_SALARY',
        description: 'Salário Base',
        amount: baseSalary,
        isDeduction: false,
      },
      {
        companyId,
        type: 'INSS',
        description: 'Contribuição INSS',
        amount: inssAmount,
        isDeduction: true,
      },
      {
        companyId,
        type: 'IRRF',
        description: 'Imposto de Renda Retido na Fonte',
        amount: irrfAmount,
        isDeduction: true,
      },
      {
        companyId,
        type: 'FGTS',
        description: `FGTS (${((taxContext.fgts?.rate ?? 0.08) * 100).toFixed(2).replace('.', ',')}% — encargo patronal)`,
        amount: fgtsAmount,
        isDeduction: false,
      },
    ];

    // 7. Persiste
    return this.repo.create(companyId, {
      employeeId: dto.employeeId,
      referenceMonth: dto.referenceMonth,
      referenceYear: dto.referenceYear,
      baseSalary,
      grossSalary,
      netSalary,
      inssAmount,
      irrfAmount,
      fgtsAmount,
      calculationVersion: calculation.calculationVersion,
      taxTableSnapshot: JSON.parse(JSON.stringify(taxContext)),
      observations: dto.observations,
      items,
    });
  }

  async approve(companyId: string, id: string, actorId: string) {
    await this.get(companyId, id);
    await this.repo.updateStatus(companyId, id, PayrollStatus.APPROVED, {
      approvedBy: actorId,
      approvedAt: new Date(),
    });
    return this.get(companyId, id);
  }

  async markPaid(companyId: string, id: string) {
    await this.get(companyId, id);
    await this.repo.updateStatus(companyId, id, PayrollStatus.PAID, { paidAt: new Date() });
    return this.get(companyId, id);
  }

  async delete(companyId: string, id: string) {
    await this.get(companyId, id);
    await this.repo.softDelete(companyId, id);
    return { message: 'Folha de pagamento removida com sucesso.' };
  }
}
