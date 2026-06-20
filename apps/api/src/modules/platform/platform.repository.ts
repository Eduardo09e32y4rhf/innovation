import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlatformRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCompanies() {
    const companies = await this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, employees: true } },
      },
    });
    return companies.map((c: (typeof companies)[number]) => ({
      id: c.id,
      name: c.name,
      document: c.document,
      logoUrl: c.logoUrl,
      maxUsers: c.maxUsers,
      maxEmployees: c.maxEmployees,
      isActive: c.isActive,
      suspensionReason: c.suspensionReason,
      subscriptionStartedAt: c.subscriptionStartedAt,
      createdAt: c.createdAt,
      usersCount: c._count.users,
      employeesCount: c._count.employees,
    }));
  }

  getCompany(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { users: true, employees: true } } },
    });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  createCompanyWithAdmin(params: {
    name: string;
    document?: string | null;
    maxUsers: number;
    maxEmployees: number;
    adminName: string;
    adminEmail: string;
    adminPasswordHash: string;
  }) {
    return this.prisma.$transaction(async (tx: any) => {
      const company = await tx.company.create({
        data: {
          name: params.name,
          document: params.document ?? null,
          maxUsers: params.maxUsers,
          maxEmployees: params.maxEmployees,
        },
      });
      const admin = await tx.user.create({
        data: {
          companyId: company.id,
          name: params.adminName,
          email: params.adminEmail,
          passwordHash: params.adminPasswordHash,
          role: 'ADMIN',
        },
        select: { id: true, email: true, role: true },
      });
      return { company, adminId: admin.id };
    });
  }

  updateCompany(id: string, data: any) {
    return this.prisma.company.update({ where: { id }, data });
  }

  deleteCompany(id: string) {
    return this.prisma.company.delete({ where: { id } });
  }

  async globalStats() {
    const [companies, users, employees, messages] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.user.count(),
      this.prisma.employee.count(),
      this.prisma.message.count(),
    ]);
    return { companies, users, employees, messages };
  }
}
