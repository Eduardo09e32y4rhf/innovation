import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string) {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    const [
      activeEmployees,
      timeTracksToday,
      pendingVacations,
      whatsappMessages,
      timeBalance,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.timeTrack.count({ where: { employee: { companyId }, date: { gte: startOfDay, lt: endOfDay } } }),
      this.prisma.vacation.count({ where: { employee: { companyId }, status: 'PENDING' } }),
      this.prisma.message.count({ where: { companyId } }),
      this.prisma.timeTrack.aggregate({ where: { employee: { companyId } }, _sum: { dailyBalance: true } }),
    ]);

    return {
      activeEmployees,
      timeTracksToday,
      pendingVacations,
      whatsappMessages,
      totalTimeBalance: timeBalance._sum.dailyBalance ?? 0,
    };
  }
}
