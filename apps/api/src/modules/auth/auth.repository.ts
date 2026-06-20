import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { emptyToNull, normalizeDisplayName } from '../../common/utils/text-normalization';

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
        name: normalizeDisplayName(data.companyName),
        document: emptyToNull(data.document),
        users: {
          create: {
            name: normalizeDisplayName(data.name),
            email: data.email.trim().toLowerCase(),
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
