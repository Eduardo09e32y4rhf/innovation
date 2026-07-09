import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlatformPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.platformPlan.findMany({
      orderBy: { price: 'asc' },
    });
  }

  async get(id: string) {
    const plan = await this.prisma.platformPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plano nao encontrado');
    return plan;
  }

  async create(data: any) {
    return this.prisma.platformPlan.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.platformPlan.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    // Soft delete ou inativacao seria ideal, mas para simplificar:
    return this.prisma.platformPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
