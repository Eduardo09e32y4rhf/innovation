import { BadRequestException, Injectable, NotFoundException, ConflictException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';

@Injectable()
export class TimeClosingService {
  private readonly logger = new Logger(TimeClosingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    try {
      return await this.prisma.timeClosingPeriod.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.error('[TimeClosingService] list fallback', err);
      return [];
    }
  }

  async getById(companyId: string, id: string) {
    const period = await this.prisma.timeClosingPeriod.findFirst({ where: { id, companyId } });
    if (!period) throw new NotFoundException('Period not found');
    return period;
  }

  async getByReference(companyId: string, referenceMonth: number, referenceYear: number) {
    try {
      return await this.prisma.timeClosingPeriod.findFirst({ where: { companyId, referenceMonth, referenceYear } });
    } catch {
      return null;
    }
  }

  private daysInMonth(month: number, year: number) {
    return new Date(year, month, 0).getDate();
  }

  private parseWorkloadMinutes(workload?: string | null): number {
    if (!workload) return 480;
    const parts = workload.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 480;
  }

  async generate(companyId: string, actor: JwtUser, referenceMonth: number, referenceYear: number) {
    this.logger.log(`[TimeClosing] Generating for ${referenceMonth}/${referenceYear}`);

    const existing = await this.prisma.timeClosingPeriod.findFirst({
      where: { companyId, referenceMonth, referenceYear },
    });
    if (existing) {
      throw new ConflictException(`Period ${referenceMonth}/${referenceYear} already exists`);
    }

    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: { workScheduleRule: true },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No active employees found');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { payrollStartDay: true },
    });
    const startDay = company?.payrollStartDay || 1;

    let periodStart = new Date(Date.UTC(referenceYear, referenceMonth - 1, 1));
    let periodEnd = new Date(Date.UTC(referenceYear, referenceMonth, 0, 23, 59, 59, 999));

    if (startDay > 1) {
      periodStart = new Date(Date.UTC(referenceYear, referenceMonth - 2, startDay));
      const nextMonth = new Date(Date.UTC(referenceYear, referenceMonth - 1, startDay));
      periodEnd = new Date(nextMonth.getTime() - 1); // 1 millisecond before nextMonth
    }

    const holidays = await this.prisma.holiday.findMany({
      where: {
        companyId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
        deletedAt: null,
      },
    });
    const holidayMap = new Map(holidays.map((h: any) => [h.date.toISOString().split('T')[0], h]));

    const summaries: any[] = [];
    for (const emp of employees) {
      const tracks = await this.prisma.timeTrack.findMany({
        where: {
          companyId,
          employeeId: emp.id,
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      const consolidation = {
        normalMinutes: 0,
        overtime50Minutes: 0,
        overtime100Minutes: 0,
        overtimeBankMinutes: 0,
        overtimePaymentMinutes: 0,
        lateMinutes: 0,
        absenceDays: 0,
        holidayDays: 0,
        paidHolidayDays: 0,
        vacationDays: 0,
        daysWorked: 0,
      };

      for (const track of tracks) {
        const dateStr = track.date.toISOString().split('T')[0];
        const holiday = holidayMap.get(dateStr);

        const workload = this.parseWorkloadMinutes(emp.dailyWorkload);
        consolidation.normalMinutes += Math.min(track.totalWorked ?? 0, workload);

        consolidation.overtime50Minutes += track.overtime50Minutes ?? 0;
        consolidation.overtime100Minutes += track.overtime100Minutes ?? 0;

        consolidation.overtimeBankMinutes += track.overtimeBankMinutes ?? 0;
        consolidation.overtimePaymentMinutes += track.overtimePaymentMinutes ?? 0;

        consolidation.lateMinutes += track.lateMinutes ?? 0;
        if (track.incidentType === 'falta') consolidation.absenceDays += 1;

        if (holiday) {
          if (holiday.handling === 'FOLGA') {
            consolidation.holidayDays += 1;
          } else if (holiday.handling === 'PAID_100') {
            consolidation.paidHolidayDays += 1;
          }
        }

        if (track.totalWorked && track.totalWorked > 0) consolidation.daysWorked += 1;
      }

      const totalDays = this.daysInMonth(referenceMonth, referenceYear);
      const attendancePercent = (consolidation.daysWorked / totalDays) * 100;

      summaries.push({
        employeeId: emp.id,
        ...consolidation,
        attendancePercent: Math.round(attendancePercent * 100) / 100,
      });
    }

    const period = await this.prisma.$transaction(async (tx: any) => {
      const p = await tx.timeClosingPeriod.create({
        data: {
          companyId,
          referenceMonth,
          referenceYear,
          periodStart,
          periodEnd,
          status: 'OPEN',
          generatedByUserId: actor.sub,
          generatedAt: new Date(),
          inconsistenciesJson: [],
          totalsJson: [],
        },
      });

      await Promise.all(
        summaries.map(s =>
          tx.timeClosingSummary.create({
            data: { timeClosingPeriodId: p.id, ...s },
          }),
        ),
      );

      await tx.timeClosingAuditLog.create({
        data: {
          timeClosingPeriodId: p.id,
          userId: actor.sub,
          action: 'GENERATED',
          reason: `Generated by ${actor.email}`,
        },
      });

      return p;
    });

    this.logger.log(`[TimeClosing] Period ${period.id} generated with ${summaries.length} summaries`);
    return period;
  }

  async close(companyId: string, actor: JwtUser, id: string) {
    const period = await this.prisma.timeClosingPeriod.findUnique({
      where: { id },
      include: {
        summaries: {
          include: {
            employee: {
              include: {
                timeTracks: { where: { manualStatus: 'pending' } },
              },
            },
          },
        },
      },
    });

    if (!period) throw new NotFoundException('Period not found');

    const pendingCount = period.summaries.reduce(
      (sum: number, s: any) => sum + (s.employee?.timeTracks?.length ?? 0),
      0,
    );

    if (pendingCount > 0) {
      throw new BadRequestException(
        `Cannot close: ${pendingCount} pending manual adjustments`,
      );
    }

    const updated = await this.prisma.timeClosingPeriod.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedByUserId: actor.sub,
      },
    });

    await this.prisma.timeClosingAuditLog.create({
      data: {
        timeClosingPeriodId: id,
        userId: actor.sub,
        action: 'CLOSED',
      },
    });

    return updated;
  }

  async reopen(companyId: string, actor: JwtUser, id: string, reason: string) {
    const updated = await this.prisma.timeClosingPeriod.update({ 
      where: { id }, 
      data: { 
        status: 'REOPENED', 
        reopenedByUserId: actor.sub, 
        reopenReason: reason 
      } 
    });

    await this.prisma.timeClosingAuditLog.create({
      data: {
        timeClosingPeriodId: id,
        userId: actor.sub,
        action: 'REOPENED',
        reason,
      },
    });

    return updated;
  }

  async approve(companyId: string, actor: JwtUser, id: string) {
    const updated = await this.prisma.timeClosingPeriod.update({ 
      where: { id }, 
      data: { 
        status: 'APPROVED', 
        approvedByUserId: actor.sub, 
        approvedAt: new Date() 
      } 
    });

    await this.prisma.timeClosingAuditLog.create({
      data: {
        timeClosingPeriodId: id,
        userId: actor.sub,
        action: 'APPROVED',
      },
    });

    return updated;
  }

  async delete(companyId: string, actor: JwtUser, id: string) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH') {
      throw new ForbiddenException('Apenas RH e ADMIN podem excluir fechamentos.');
    }
    const period = await this.prisma.timeClosingPeriod.findFirst({
      where: { id, companyId },
    });
    if (!period) throw new NotFoundException('Period not found');
    if (period.status === 'APPROVED') {
      throw new BadRequestException('Não é possível excluir um período aprovado. Reabra primeiro.');
    }
    
    await this.prisma.timeClosingAuditLog.deleteMany({
      where: { timeClosingPeriodId: id },
    });
    await this.prisma.timeClosingSummary.deleteMany({
      where: { timeClosingPeriodId: id },
    });
    await this.prisma.timeClosingPeriod.delete({
      where: { id },
    });
    
    return { deleted: true };
  }
}
