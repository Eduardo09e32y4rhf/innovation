import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommissionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateCommercialSaleDto } from './dto/create-commercial-sale.dto';

@Injectable()
export class CommercialSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: JwtUser, dto: CreateCommercialSaleDto) {
    if (actor.role === 'COMERCIAL' && dto.sellerId !== actor.sub) throw new ForbiddenException('O Comercial so pode registrar vendas em seu proprio nome.');
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId }, select: { id: true, commercialOwnerId: true } });
    if (!company) throw new NotFoundException('Empresa nao encontrada.');
    if (actor.role === 'COMERCIAL' && company.commercialOwnerId !== actor.sub) throw new ForbiddenException('Empresa fora da carteira autorizada.');
    const seller = await this.prisma.user.findUnique({ where: { id: dto.sellerId }, select: { id: true, role: true } });
    if (!seller || seller.role !== 'COMERCIAL') throw new BadRequestException('Vendedor Comercial invalido.');
    const commissionValue = Number((dto.contractValue * dto.commissionPercentage / 100).toFixed(2));

    return this.prisma.$transaction(async (tx) => {
      const idempotencyReference = `idempotency:${dto.idempotencyKey}`;
      const existing = await tx.commercialSale.findUnique({ where: { idempotencyKey: idempotencyReference } });
      if (existing) return tx.commercialSale.findUnique({ where: { id: existing.id }, include: { commissions: true } });
      const sale = await tx.commercialSale.create({
        data: {
          companyId: dto.companyId, sellerId: dto.sellerId, authorId: actor.sub,
          planId: dto.planId, cycle: dto.cycle, contractValue: new Prisma.Decimal(dto.contractValue),
          recurrence: dto.recurrence ?? false, snapshot: dto.snapshot as Prisma.InputJsonValue | undefined,
          paymentReference: undefined, idempotencyKey: idempotencyReference,
        },
      });
      await tx.commissionEntry.create({
        data: {
          saleId: sale.id, beneficiaryId: dto.sellerId, baseValue: new Prisma.Decimal(dto.contractValue),
          percentageApplied: new Prisma.Decimal(dto.commissionPercentage), commissionValue: new Prisma.Decimal(commissionValue),
        },
      });
      return tx.commercialSale.findUnique({ where: { id: sale.id }, include: { commissions: true } });
    });
  }

  list(actor: JwtUser) {
    return this.prisma.commercialSale.findMany({ where: actor.role === 'COMERCIAL' ? { sellerId: actor.sub } : undefined, include: { commissions: true, company: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async transitionCommission(actor: JwtUser, id: string, status: CommissionStatus, paymentReference?: string) {
    if (!['DEV', 'CEO'].includes(actor.role)) throw new ForbiddenException('Somente a gestao da plataforma pode alterar comissoes.');
    const commission = await this.prisma.commissionEntry.findUnique({ where: { id } });
    if (!commission) throw new NotFoundException('Comissao nao encontrada.');
    const allowed: Record<string, CommissionStatus[]> = {
      PENDING: [CommissionStatus.ELIGIBLE, CommissionStatus.CANCELED],
      ELIGIBLE: [CommissionStatus.PAID, CommissionStatus.CANCELED, CommissionStatus.REVERSED],
      PAID: [CommissionStatus.REVERSED], CANCELED: [], REVERSED: [],
    };
    if (!allowed[commission.status]?.includes(status)) throw new BadRequestException('Transicao de comissao invalida.');
    return this.prisma.commissionEntry.update({ where: { id }, data: { status, paymentReference } });
  }
}
