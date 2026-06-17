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

  create(data: any) {
    return this.prisma.vacation.create({ data });
  }

  updateStatus(companyId: string, id: string, data: any) {
    return this.prisma.vacation.updateMany({ where: { id, employee: { companyId } }, data });
  }
}
