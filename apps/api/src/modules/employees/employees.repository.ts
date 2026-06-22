import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.employee.findMany({
      where: { companyId },
      include: { user: { select: { id: true, role: true, isActive: true, forcePasswordChange: true } } },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { companyId, id },
      include: { user: { select: { id: true, role: true, isActive: true, forcePasswordChange: true } } },
    });
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

  findByRegistration(companyId: string, registration: string) {
    return this.prisma.employee.findFirst({
      where: { companyId, registration: { equals: registration, mode: 'insensitive' } },
    });
  }

  create(companyId: string, data: any) {
    return this.prisma.employee.create({ data: { ...data, companyId } });
  }

  update(companyId: string, id: string, data: any) {
    return this.prisma.employee.updateMany({ where: { companyId, id }, data });
  }

  updateUserLink(companyId: string, id: string, userId: string | null) {
    return this.prisma.employee.updateMany({ where: { companyId, id }, data: { userId } });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  createUser(data: any) {
    return this.prisma.user.create({ data });
  }

  updateUser(companyId: string, id: string, data: any) {
    return this.prisma.user.updateMany({ where: { companyId, id }, data });
  }

  delete(companyId: string, id: string) {
    return this.prisma.employee.deleteMany({ where: { companyId, id } });
  }
}
