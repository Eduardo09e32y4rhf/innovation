import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import type { ListFaturasCompaniesDto } from './dto/faturas.dto';

@Injectable()
export class FaturasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista de empresas (ativas, suspensas e canceladas) com a situação financeira de cada uma. */
  async companies(query: ListFaturasCompaniesDto, actor: JwtUser) {
    const term = query.search?.trim();
    const where: Prisma.CompanyWhereInput = {
      ...(actor.role === 'COMERCIAL' ? { commercialOwnerId: actor.sub } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.billingStatus ? { billingStatus: query.billingStatus } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { legalName: { contains: term, mode: 'insensitive' } },
              { slug: { contains: term, mode: 'insensitive' } },
              ...(term.replace(/\D/g, '') ? [{ document: { contains: term.replace(/\D/g, '') } }] : []),
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        select: {
          id: true,
          name: true,
          document: true,
          status: true,
          billingStatus: true,
          plan: true,
          subscription: {
            select: { status: true, seatQuantity: true, nextDueDate: true, billingPaused: true, couponType: true, couponValue: true, couponCyclesLeft: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    const ids = items.map((c) => c.id);
    const grouped = ids.length
      ? await this.prisma.platformInvoice.groupBy({
          by: ['companyId', 'status'],
          where: { companyId: { in: ids }, deletedAt: null, status: { in: ['OPEN', 'OVERDUE'] } },
          _sum: { amount: true },
          _count: true,
        })
      : [];

    const money = (companyId: string, status: 'OPEN' | 'OVERDUE') => {
      const row = grouped.find((g) => g.companyId === companyId && g.status === status);
      return { total: Number(row?._sum.amount ?? 0), count: row?._count ?? 0 };
    };

    return {
      items: items.map((c) => ({ ...c, open: money(c.id, 'OPEN'), overdue: money(c.id, 'OVERDUE') })),
      pagination: { page: query.page, limit: query.limit, total, pages: Math.max(1, Math.ceil(total / query.limit)) },
    };
  }
}
