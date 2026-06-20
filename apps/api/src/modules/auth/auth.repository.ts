import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { company: true } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { company: true } });
  }

  createCompanyWithAdmin(data: {
    companyName: string;
    document?: string;
    name: string;
    email: string;
    passwordHash: string;
  }) {
    return this.prisma.company.create({
      data: {
        name: data.companyName,
        document: data.document,
        users: {
          create: {
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            role: 'ADMIN',
          },
        },
      },
      include: { users: true },
    });
  }

  userSafeSelect() {
    return { id: true, companyId: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true };
  }
}