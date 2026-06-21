import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.employee.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
  }

  findById(companyId: string, id: string) {
    return this.prisma.employee.findFirst({ where: { companyId, id } });
  }

  findByUserId(companyId: string, userId: string) {
    return this.prisma.employee.findFirst({ where: { companyId, userId } });
  }

  listByManager(companyId: string, managerId: string) {
    return this.prisma.employee.findMany({ where: { companyId, managerId }, orderBy: { createdAt: 'desc' } });
  }

  findByCpf(cpf: string) {
    return this.prisma.employee.findUnique({ where: { cpf } });
  }

  create(companyId: string, data: any) {
    return this.prisma.employee.create({ data: { ...data, companyId } });
  }

  update(companyId: string, id: string, data: any) {
    return this.prisma.employee.updateMany({ where: { companyId, id }, data });
  }
}
