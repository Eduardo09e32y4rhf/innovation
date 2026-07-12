import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  /** Soft-delete: desativa o plano sem remover do banco */
  async deactivate(id: string) {
    return this.prisma.platformPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Hard-delete: remove permanentemente. Só permitido se já inativo. */
  async deletePermanent(id: string) {
    const plan = await this.prisma.platformPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plano nao encontrado');
    if (plan.isActive) {
      throw new BadRequestException('Desative o plano antes de excluir permanentemente.');
    }
    return this.prisma.platformPlan.delete({ where: { id } });
  }

  /** @deprecated use deactivate() */
  async delete(id: string) {
    return this.deactivate(id);
  }
}
