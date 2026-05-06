import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const safeUserSelect = {
  id: true,
  companyId: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.user.findMany({ where: { companyId }, select: safeUserSelect, orderBy: { createdAt: 'desc' } });
  }

  findById(companyId: string, id: string) {
    return this.prisma.user.findFirst({ where: { id, companyId }, select: safeUserSelect });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: any) {
    return this.prisma.user.create({ data, select: safeUserSelect });
  }

  update(companyId: string, id: string, data: any) {
    return this.prisma.user.updateMany({ where: { id, companyId }, data });
  }

  delete(companyId: string, id: string) {
    return this.prisma.user.deleteMany({ where: { id, companyId } });
  }
}
