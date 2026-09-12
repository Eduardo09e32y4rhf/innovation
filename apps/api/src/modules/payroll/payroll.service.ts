import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PayrollStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { PayrollRepository } from './payroll.repository';

// ---------------------------------------------------------------------------
// Tabelas de tributação 2024
// ---------------------------------------------------------------------------

interface InssRange {
  upTo: number;
  rate: number;
}

const INSS_RANGES_2024: InssRange[] = [
  { upTo: 1412.0, rate: 0.075 },
  { upTo: 2666.68, rate: 0.09 },
  { upTo: 4000.03, rate: 0.12 },
  { upTo: 7786.02, rate: 0.14 },
];
const INSS_CAP_2024 = 908.86;

interface IrrfRange {
  upTo: number;
  rate: number;
  deduction: number;
}

const IRRF_RANGES_2024: IrrfRange[] = [
  { upTo: 2259.2, rate: 0, deduction: 0 },
  { upTo: 2826.65, rate: 0.075, deduction: 169.44 },
  { upTo: 3751.05, rate: 0.15, deduction: 381.44 },
  { upTo: 4664.68, rate: 0.225, deduction: 662.77 },
  { upTo: Infinity, rate: 0.275, deduction: 896.0 },
];

const IRRF_DEDUCTION_PER_DEPENDENT = 220.0;
const FGTS_RATE = 0.08;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcula o INSS progressivo 2024.
 * Cada faixa incide apenas sobre a parcela do salário dentro dela.
 */
function calculateInss(grossSalary: number): number {
  if (grossSalary <= 0) return 0;

  let inss = 0;
  let previous = 0;

  for (const range of INSS_RANGES_2024) {
    if (grossSalary <= previous) break;
    const base = Math.min(grossSalary, range.upTo) - previous;
    inss += base * range.rate;
    previous = range.upTo;
    if (grossSalary <= range.upTo) break;
  }

  return round2(Math.min(inss, INSS_CAP_2024));
}

/**
 * Calcula o IRRF progressivo 2024 usando alíquota efetiva (tabela progressiva).
 * Base de cálculo = salário bruto - INSS - (R$ 220 * nº de dependentes)
 */
function calculateIrrf(grossSalary: number, inssAmount: number, dependentCount: number): number {
  const baseIrrf = grossSalary - inssAmount - IRRF_DEDUCTION_PER_DEPENDENT * dependentCount;
  if (baseIrrf <= 0) return 0;

  for (const range of IRRF_RANGES_2024) {
    if (baseIrrf <= range.upTo) {
      const irrf = baseIrrf * range.rate - range.deduction;
      return round2(Math.max(0, irrf));
    }
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PayrollService {
  constructor(
    private readonly repo: PayrollRepository,
    private readonly prisma: PrismaService,
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

    // 5. Cálculos
    const inssAmount = calculateInss(grossSalary);
    const irrfAmount = calculateIrrf(grossSalary, inssAmount, dependentCount);
    const fgtsAmount = round2(grossSalary * FGTS_RATE);
    const netSalary = round2(grossSalary - inssAmount - irrfAmount);

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
        description: 'FGTS (8% — encargo patronal)',
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
