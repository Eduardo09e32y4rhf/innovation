import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ManagementEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.managementEvent.findMany({
      where: { companyId },
      orderBy: { startDateTime: 'desc' },
    });
  }

  async find(companyId: string, id: string) {
    const r = await this.prisma.managementEvent.findFirst({ where: { id, companyId } });
    if (!r) throw new Error('NÃO ENCONTRADO');
    return r;
  }

  async create(companyId: string, userId: string | undefined, data: any) {
    return this.prisma.managementEvent.create({
      data: {
        companyId,
        createdBy: userId,
        ...data,
        startDateTime: new Date(data.startDateTime),
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
      },
    });
  }

  async update(companyId: string, id: string, data: any) {
    const r = await this.prisma.managementEvent.findFirst({ where: { id, companyId } });
    if (!r) throw new Error('NÃO ENCONTRADO');
    return this.prisma.managementEvent.update({
      where: { id },
      data: {
        ...data,
        startDateTime: data.startDateTime ? new Date(data.startDateTime) : undefined,
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
      },
    });
  }

  async delete(companyId: string, id: string) {
    const r = await this.prisma.managementEvent.findFirst({ where: { id, companyId } });
    if (!r) throw new Error('NÃO ENCONTRADO');
    await this.prisma.managementEvent.delete({ where: { id } });
    return { ok: true };
  }
}