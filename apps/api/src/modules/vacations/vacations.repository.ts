import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VacationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.vacation.findMany({
      where: { employee: { companyId } },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listByEmployee(companyId: string, employeeId: string) {
    return this.prisma.vacation.findMany({
      where: { employeeId, employee: { companyId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.vacation.findFirst({ where: { id, employee: { companyId } }, include: { employee: true } });
  }

  findEmployee(companyId: string, employeeId: string) {
    return this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
  }

  findEmployeeByUserId(companyId: string, userId: string) {
    return this.prisma.employee.findFirst({ where: { companyId, userId } });
  }

  async listForManager(companyId: string, userId: string) {
    const manager = await this.prisma.employee.findFirst({ where: { companyId, userId } });
    if (!manager) return [];
    return this.prisma.vacation.findMany({
      where: { employee: { companyId, managerId: manager.id } },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForEmployee(companyId: string, userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { companyId, userId } });
    if (!employee) return [];
    return this.prisma.vacation.findMany({
      where: { employeeId: employee.id },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: any) {
    return this.prisma.vacation.create({ data });
  }

  updateStatus(companyId: string, id: string, data: any) {
    return this.prisma.vacation.updateMany({ where: { id, employee: { companyId } }, data });
  }
}
