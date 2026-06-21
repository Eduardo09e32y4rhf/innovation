import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private todayRange() {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    return { startOfDay, endOfDay };
  }

  async summary(companyId: string) {
    const { startOfDay, endOfDay } = this.todayRange();
    const [activeEmployees, timeTracksToday, pendingVacations, whatsappMessages, timeBalance] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.timeTrack.count({ where: { employee: { companyId }, date: { gte: startOfDay, lt: endOfDay } } }),
      this.prisma.vacation.count({ where: { employee: { companyId }, status: 'PENDING' } }),
      this.prisma.message.count({ where: { companyId } }),
      this.prisma.timeTrack.aggregate({ where: { employee: { companyId } }, _sum: { dailyBalance: true } }),
    ]);
    return { activeEmployees, timeTracksToday, pendingVacations, whatsappMessages, totalTimeBalance: timeBalance._sum.dailyBalance ?? 0 };
  }

  async summaryForManager(companyId: string, userId: string) {
    const manager = await this.prisma.employee.findFirst({ where: { companyId, userId } });
    if (!manager) return { activeEmployees: 0, timeTracksToday: 0, pendingVacations: 0, whatsappMessages: 0, totalTimeBalance: 0 };
    const teamFilter = { companyId, managerId: manager.id };
    const { startOfDay, endOfDay } = this.todayRange();
    const [activeEmployees, timeTracksToday, pendingVacations, timeBalance] = await Promise.all([
      this.prisma.employee.count({ where: { ...teamFilter, status: 'ACTIVE' } }),
      this.prisma.timeTrack.count({ where: { employee: teamFilter, date: { gte: startOfDay, lt: endOfDay } } }),
      this.prisma.vacation.count({ where: { employee: teamFilter, status: 'PENDING' } }),
      this.prisma.timeTrack.aggregate({ where: { employee: teamFilter }, _sum: { dailyBalance: true } }),
    ]);
    return { activeEmployees, timeTracksToday, pendingVacations, whatsappMessages: 0, totalTimeBalance: timeBalance._sum.dailyBalance ?? 0 };
  }

  async summaryForEmployee(companyId: string, userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { companyId, userId } });
    if (!employee) return { activeEmployees: 0, timeTracksToday: 0, pendingVacations: 0, whatsappMessages: 0, totalTimeBalance: 0 };
    const { startOfDay, endOfDay } = this.todayRange();
    const [timeTracksToday, pendingVacations, timeBalance] = await Promise.all([
      this.prisma.timeTrack.count({ where: { employeeId: employee.id, date: { gte: startOfDay, lt: endOfDay } } }),
      this.prisma.vacation.count({ where: { employeeId: employee.id, status: 'PENDING' } }),
      this.prisma.timeTrack.aggregate({ where: { employeeId: employee.id }, _sum: { dailyBalance: true } }),
    ]);
    return { activeEmployees: 1, timeTracksToday, pendingVacations, whatsappMessages: 0, totalTimeBalance: timeBalance._sum.dailyBalance ?? 0 };
  }
}
