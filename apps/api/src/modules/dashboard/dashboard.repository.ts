import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { toDateOnly } from '../../common/utils/date.utils';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private todayRange() {
    const startOfDay = toDateOnly(new Date());
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    return { startOfDay, endOfDay };
  }



  private monthRange() {
    const today = toDateOnly(new Date());
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 1));
    return { startOfMonth, endOfMonth, month, day };
  }

  private async buildInsights(employeeWhere: any, companyId: string) {
    const { startOfMonth, endOfMonth, month, day } = this.monthRange();
    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      select: { id: true, name: true, birthDate: true, admissionDate: true, terminationDate: true, status: true, userId: true, managerId: true, cpf: true, workScale: true, dailyWorkload: true },
      orderBy: { name: 'asc' },
    });
    const employeeIds = employees.map((employee: any) => employee.id);
    const scopedTrackWhere = { employeeId: { in: employeeIds } };
    const [pendingTimeTracks, pendingVacations, admissionsThisMonth, terminationsThisMonth] = employeeIds.length ? await Promise.all([
      this.prisma.timeTrack.count({ where: { ...scopedTrackWhere, manualStatus: 'pending' } }),
      this.prisma.vacation.count({ where: { employeeId: { in: employeeIds }, status: 'PENDING' } }),
      this.prisma.employee.count({ where: { ...employeeWhere, admissionDate: { gte: startOfMonth, lt: endOfMonth } } }),
      this.prisma.employee.count({ where: { ...employeeWhere, terminationDate: { gte: startOfMonth, lt: endOfMonth } } }),
    ]) : [0, 0, 0, 0];
    const birthdaysToday: any[] = [];
    const birthdaysThisMonth: any[] = [];
    let missingUser = 0;
    let missingManager = 0;
    let missingCpf = 0;
    let missingWorkScale = 0;
    let missingWorkload = 0;

    // ⚡ Bolt: Consolidated multiple O(N) .filter() passes into a single O(N) loop
    // Reduces CPU overhead and unnecessary array allocations for large employee collections
    for (const employee of employees) {
      if (employee.birthDate) {
        const bMonth = employee.birthDate.getUTCMonth() + 1;
        const bDay = employee.birthDate.getUTCDate();
        if (bMonth === month) {
          if (birthdaysThisMonth.length < 12) {
            birthdaysThisMonth.push(employee);
          }
          if (bDay === day && birthdaysToday.length < 8) {
            birthdaysToday.push(employee);
          }
        }
      }

      if (employee.status === 'ACTIVE') {
        if (!employee.userId) missingUser++;
        if (!employee.managerId) missingManager++;
        if (!employee.workScale) missingWorkScale++;
        if (!employee.dailyWorkload) missingWorkload++;
      }
      if (!employee.cpf) missingCpf++;
    }
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { name: true, document: true, logoUrl: true } });
    return {
      birthdaysToday: birthdaysToday.map((employee: any) => ({ id: employee.id, name: employee.name, birthDate: employee.birthDate })),
      birthdaysThisMonth: birthdaysThisMonth.map((employee: any) => ({ id: employee.id, name: employee.name, birthDate: employee.birthDate })),
      pending: { timeTracks: pendingTimeTracks, vacations: pendingVacations },
      movements: { admissionsThisMonth, terminationsThisMonth },
      alerts: {
        companyIncomplete: !company?.name || !company?.document,
        employeesWithoutCpf: missingCpf,
        employeesWithoutUser: missingUser,
        employeesWithoutManager: missingManager,
        employeesWithoutWorkScale: missingWorkScale,
        employeesWithoutWorkload: missingWorkload,
        pendingTimeTracks,
      },
    };
  }

  insights(companyId: string) {
    return this.buildInsights({ companyId }, companyId);
  }

  async insightsForManager(companyId: string, userId: string) {
    const manager = await this.prisma.employee.findFirst({ where: { companyId, userId } });
    if (!manager) return this.emptyInsights();
    return this.buildInsights({ companyId, managerId: manager.id }, companyId);
  }

  async insightsForEmployee(companyId: string, userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { companyId, userId } });
    if (!employee) return this.emptyInsights();
    return this.buildInsights({ companyId, id: employee.id }, companyId);
  }

  private emptyInsights() {
    return {
      birthdaysToday: [],
      birthdaysThisMonth: [],
      pending: { timeTracks: 0, vacations: 0 },
      movements: { admissionsThisMonth: 0, terminationsThisMonth: 0 },
      alerts: { companyIncomplete: false, employeesWithoutCpf: 0, employeesWithoutUser: 0, employeesWithoutManager: 0, employeesWithoutWorkScale: 0, employeesWithoutWorkload: 0, pendingTimeTracks: 0 },
    };
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
