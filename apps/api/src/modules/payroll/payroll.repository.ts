import { Injectable } from '@nestjs/common';
import { PayrollStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string, year?: number, month?: number) {
    return this.prisma.payroll.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(year !== undefined ? { referenceYear: year } : {}),
        ...(month !== undefined ? { referenceMonth: month } : {}),
      },
      include: {
        employee: {
          select: { id: true, name: true, position: true, department: true, registration: true },
        },
        items: true,
      },
      orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findOne(companyId: string, id: string) {
    return this.prisma.payroll.findFirst({
      where: { companyId, id, deletedAt: null },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            registration: true,
            cpf: true,
            salary: true,
            dependents: true,
            bankCode: true,
            bankName: true,
            bankAgency: true,
            bankAccount: true,
            bankAccountType: true,
          },
        },
        items: { orderBy: { isDeduction: 'asc' } },
      },
    });
  }

  create(
    companyId: string,
    data: {
      employeeId: string;
      referenceMonth: number;
      referenceYear: number;
      baseSalary: number;
      grossSalary: number;
      netSalary: number;
      inssAmount: number;
      irrfAmount: number;
      fgtsAmount: number;
      overtimeAmount?: number;
      nightShiftAmount?: number;
      observations?: string;
      items: Array<{
        companyId: string;
        type: import('@prisma/client').PayrollItemType;
        description: string;
        amount: number;
        isDeduction: boolean;
      }>;
    },
  ) {
    const { items, ...payrollData } = data;
    return this.prisma.payroll.create({
      data: {
        ...payrollData,
        companyId,
        items: {
          create: items,
        },
      },
      include: {
        employee: { select: { id: true, name: true, position: true, department: true } },
        items: true,
      },
    });
  }

  updateStatus(
    companyId: string,
    id: string,
    status: PayrollStatus,
    extra?: { approvedBy?: string; approvedAt?: Date; paidAt?: Date },
  ) {
    return this.prisma.payroll.updateMany({
      where: { companyId, id, deletedAt: null },
      data: { status, ...extra },
    });
  }

  softDelete(companyId: string, id: string) {
    return this.prisma.payroll.updateMany({
      where: { companyId, id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  existsForPeriod(
    companyId: string,
    employeeId: string,
    referenceMonth: number,
    referenceYear: number,
  ) {
    return this.prisma.payroll.findFirst({
      where: { companyId, employeeId, referenceMonth, referenceYear, deletedAt: null },
      select: { id: true, status: true },
    });
  }
}
