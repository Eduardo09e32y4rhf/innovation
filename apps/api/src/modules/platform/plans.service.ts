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
    return this.prisma.platformPlan.create({ data: this.normalizePlanPayload(data, true) });
  }

  async update(id: string, data: any) {
    return this.prisma.platformPlan.update({
      where: { id },
      data: this.normalizePlanPayload(data, false),
    });
  }

  private normalizePlanPayload(data: any, creating: boolean) {
    const payload = { ...data };
    if (payload.price !== undefined || payload.isFree === true || creating) {
      const price = payload.isFree ? 0 : this.moneyToNumber(payload.price);
      if (!payload.isFree && (!Number.isFinite(price) || price <= 0)) {
        throw new BadRequestException('Plano pago precisa ter valor maior que zero.');
      }
      payload.price = price;
    }
    if (payload.maxUsers !== undefined) payload.maxUsers = Math.max(1, Number(payload.maxUsers) || 1);
    if (payload.maxEmployees !== undefined) payload.maxEmployees = Math.max(1, Number(payload.maxEmployees) || 1);
    return payload;
  }

  private moneyToNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
    const raw = String(value).trim();
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
    const amount = Number(normalized);
    return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
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
