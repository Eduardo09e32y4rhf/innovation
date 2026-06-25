import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { TimeOccurrenceType } from '@prisma/client';

@Injectable()
export class TimeOccurrencesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, employeeId?: string) {
    const where: any = { companyId };
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.timeOccurrence.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getById(companyId: string, id: string) {
    const occ = await this.prisma.timeOccurrence.findFirst({ where: { id, companyId } });
    if (!occ) throw new NotFoundException('Occurrence not found');
    return occ;
  }

  async create(companyId: string, actor: JwtUser, data: any) {
    const allowed = ['ADMIN', 'RH', 'DEV'];
    if (!allowed.includes(actor.role)) throw new ForbiddenException('Not allowed');
    return this.prisma.timeOccurrence.create({ data: { companyId, ...data } });
  }

  async approve(companyId: string, actor: JwtUser, id: string) {
    const allowed = ['ADMIN', 'RH', 'GESTOR', 'DEV'];
    if (!allowed.includes(actor.role)) throw new ForbiddenException('Not allowed');
    const occ = await this.getById(companyId, id);
    return this.prisma.timeOccurrence.update({
      where: { id },
      data: { status: 'APPROVED', approvedByUserId: actor.sub, approvedAt: new Date() },
    });
  }

  async reject(companyId: string, actor: JwtUser, id: string) {
    const allowed = ['ADMIN', 'RH', 'GESTOR', 'DEV'];
    if (!allowed.includes(actor.role)) throw new ForbiddenException('Not allowed');
    const occ = await this.getById(companyId, id);
    return this.prisma.timeOccurrence.update({
      where: { id },
      data: { status: 'REJECTED', approvedByUserId: actor.sub, approvedAt: new Date() },
    });
  }
}