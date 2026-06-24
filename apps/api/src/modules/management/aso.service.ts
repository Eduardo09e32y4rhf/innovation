import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AsoService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.employeeAsoRecord.findMany({
      where: { companyId },
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { expirationDate: 'asc' },
    });
  }

  async listByEmployee(companyId: string, employeeId: string) {
    return this.prisma.employeeAsoRecord.findMany({
      where: { companyId, employeeId },
      orderBy: { examDate: 'desc' },
    });
  }

  async find(companyId: string, id: string) {
    const r = await this.prisma.employeeAsoRecord.findFirst({
      where: { id, companyId },
      include: { employee: { select: { id: true, name: true } } },
    });
    if (!r) throw new Error('NÃO ENCONTRADO');
    return r;
  }

  async create(companyId: string, userId: string | undefined, data: any) {
    return this.prisma.employeeAsoRecord.create({
      data: {
        companyId,
        createdBy: userId,
        ...data,
        examDate: data.examDate ? new Date(data.examDate) : undefined,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      },
    });
  }

  async update(companyId: string, id: string, data: any) {
    const r = await this.prisma.employeeAsoRecord.findFirst({ where: { id, companyId } });
    if (!r) throw new Error('NÃO ENCONTRADO');
    return this.prisma.employeeAsoRecord.update({
      where: { id },
      data: {
        ...data,
        examDate: data.examDate ? new Date(data.examDate) : undefined,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      },
    });
  }

  async delete(companyId: string, id: string) {
    const r = await this.prisma.employeeAsoRecord.findFirst({ where: { id, companyId } });
    if (!r) throw new Error('NÃO ENCONTRADO');
    await this.prisma.employeeAsoRecord.delete({ where: { id } });
    return { ok: true };
  }
}