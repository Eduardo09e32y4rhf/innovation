import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CouponsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.promotionCoupon.findMany({
      include: { redemptions: { include: { company: { select: { id: true, name: true } } }, orderBy: { redeemedAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByCode(code: string) {
    return this.prisma.promotionCoupon.findUnique({ where: { code } });
  }

  create(data: any) {
    return this.prisma.promotionCoupon.create({ data });
  }

  update(id: string, data: any) {
    return this.prisma.promotionCoupon.update({ where: { id }, data });
  }
}
