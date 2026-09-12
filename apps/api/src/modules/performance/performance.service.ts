import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async listReviews(companyId: string) {
    return this.prisma.performanceReview.findMany({
      where: { companyId, deletedAt: null },
      include: {
        evaluations: true,
      },
    });
  }

  async listOKRs(companyId: string) {
    return this.prisma.oKR.findMany({
      where: { companyId, deletedAt: null },
      include: {
        objectives: {
          include: {
            keyResults: true,
          }
        }
      },
    });
  }
}
