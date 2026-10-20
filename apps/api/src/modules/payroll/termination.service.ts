import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { SimulateTerminationDto } from './dto/termination.dto';
import { calculateTermination } from './termination.calculator';
import { calculateThirteenth } from './thirteenth.calculator';

@Injectable()
export class TerminationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: PayrollCalculationService,
  ) {}

  private async employee(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true, name: true, salary: true, dependents: true, admissionDate: true, terminationDate: true },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');
    const salary = Number(employee.salary);
    if (!Number.isFinite(salary) || salary <= 0) {
      throw new BadRequestException(`${employee.name} está sem salário cadastrado. Informe o salário no cadastro do funcionário.`);
    }
    let raw: unknown = employee.dependents;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { raw = null; }
    }
    return { ...employee, salary, dependents: Array.isArray(raw) ? raw.length : 0 };
  }

  async simulate(companyId: string, dto: SimulateTerminationDto) {
    const employee = await this.employee(companyId, dto.employeeId);
    const taxContext = await this.calculator.resolveTaxContext(new Date(`${dto.terminationDate.slice(0, 10)}T12:00:00Z`));
    try {
      const result = calculateTermination({
        ...dto,
        salary: employee.salary,
        admissionDate: employee.admissionDate,
        dependents: employee.dependents,
        taxContext,
      });
      return { employee: { id: employee.id, name: employee.name }, ...result, simulation: true };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  async thirteenth(companyId: string, employeeId: string, year: number) {
    const employee = await this.employee(companyId, employeeId);
    const taxContext = await this.calculator.resolveTaxContext(new Date(Date.UTC(year, 11, 20, 12)));
    const result = calculateThirteenth({
      year,
      salary: employee.salary,
      admissionDate: employee.admissionDate,
      terminationDate: employee.terminationDate,
      dependents: employee.dependents,
      taxContext,
    });
    return { employee: { id: employee.id, name: employee.name }, ...result };
  }
}
