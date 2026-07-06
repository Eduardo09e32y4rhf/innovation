// @ts-nocheck
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HolidaysService } from '../holidays/holidays.service';
import type { JwtUser } from '../../common/types/auth.types';
import { TimeClosingStatus } from '@prisma/client';

@Injectable()
export class TimeClosingService {
  private readonly logger = new Logger(TimeClosingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly holidaysService: HolidaysService,
  ) {}

  private parseTime(timeStr: string): { hours: number, minutes: number } {
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: h, minutes: m };
  }

  async generate(companyId: string, actor: JwtUser, dto: { employeeIds: string[], periodStart: string, periodEnd: string }) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    
    // Buscar Regra de Hora Extra (se não existir, criar uma default)
    let overtimeRule = await this.prisma.overtimeRule.findUnique({ where: { companyId } });
    if (!overtimeRule) {
      overtimeRule = await this.prisma.overtimeRule.create({
        data: { companyId }
      });
    }

    const results = [];

    for (const employeeId of dto.employeeIds) {
      // Deleta draft anterior se houver (para evitar duplicação no mesmo período)
      await this.prisma.timeClosing.deleteMany({
        where: { companyId, employeeId, periodStart, periodEnd, status: TimeClosingStatus.DRAFT }
      });

      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: { workScheduleRule: true }
      });

      if (!employee) continue;

      const tracks = await this.prisma.timeTrack.findMany({
        where: {
          companyId,
          employeeId,
          date: { gte: periodStart, lte: periodEnd }
        }
      });

      let normalMinutes = 0;
      let overtime50Mins = 0;
      let overtime100Mins = 0;
      let nightShiftMins = 0;
      let absences = 0;
      let lateArrivals = 0;
      let fallbackPunches = tracks.filter(t => (t as any).clockedInWithoutFacial).length;

      // Iterar por cada dia do período
      let currentDate = new Date(periodStart);
      while (currentDate <= periodEnd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const track = tracks.find(t => t.date.toISOString().split('T')[0] === dateStr);
        
        const isWorkday = await this.holidaysService.isWorkday(currentDate, companyId, employee.workScheduleRuleId!);

        if (track) {
          // Em um dia real, compararíamos as batidas
          // Aqui usamos os totais já calculados pelo ponto (track)
          normalMinutes += Math.min(track.totalWorked ?? 0, 480); // max 8h
          
          const extra = Math.max(0, (track.totalWorked ?? 0) - 480);
          if (extra > 0) {
            if (isWorkday) {
              overtime50Mins += extra;
            } else {
              overtime100Mins += extra; // Domingo ou feriado
            }
          }

          if ((track.lateMinutes ?? 0) > 0) {
            lateArrivals++;
          }

          // Lógica de adicional noturno (simplificada pelo total do track ou calculada baseada na janela)
          // Se o track tiver horas após as 22h...
        } else {
          // Sem batida
          if (isWorkday) {
            // Checar se não tem atestado/ocorrência abonada
            const occurrence = await this.prisma.timeOccurrence.findFirst({
              where: { employeeId, date: currentDate, status: 'APPROVED' }
            });
            if (!occurrence) {
              absences++;
            }
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const normalHours = normalMinutes / 60;
      const overtime50 = overtime50Mins / 60;
      const overtime100 = overtime100Mins / 60;
      const nightShift = nightShiftMins / 60;

      // DSR: se dsrEnabled, DSR = (Total Horas Extras / Dias Úteis) * Domingos e Feriados
      let dsrValue = 0;
      if (overtimeRule.dsrEnabled && (overtime50 > 0 || overtime100 > 0)) {
        // Cálculo simplificado de DSR
        dsrValue = (overtime50 + overtime100) * 0.2; // roughly 1/5
      }

      // Cálculo financeiro
      const hourlyRate = Number(employee.salary || 0) / 220; // Base 220h mensais
      const totalPayable = 
        (normalHours * hourlyRate) + 
        (overtime50 * hourlyRate * Number(overtimeRule.weekdayRate)) + 
        (overtime100 * hourlyRate * Number(overtimeRule.sundayHolidayRate)) + 
        (nightShift * hourlyRate * Number(overtimeRule.nightShiftRate)) + 
        (dsrValue * hourlyRate);

      const closing = await this.prisma.timeClosing.create({
        data: {
          companyId,
          employeeId,
          periodStart,
          periodEnd,
          status: TimeClosingStatus.DRAFT,
          normalHours,
          overtime50,
          overtime100,
          nightShift,
          dsrValue,
          absences,
          lateArrivals,
          fallbackPunches,
          totalPayable
        }
      });
      results.push(closing);
    }

    return results;
  }

  async list(companyId: string, status?: TimeClosingStatus) {
    return this.prisma.timeClosing.findMany({
      where: { 
        companyId,
        ...(status && { status })
      },
      include: { employee: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async adjust(companyId: string, actor: JwtUser, id: string, dto: { field: string, newValue: string, reason: string }) {
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing) throw new NotFoundException('Closing not found');
    if (closing.status !== TimeClosingStatus.DRAFT && closing.status !== TimeClosingStatus.IN_REVIEW) {
      throw new BadRequestException('Can only adjust Draft or In Review closings');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.timeClosingAdjustment.create({
        data: {
          timeClosingId: id,
          field: dto.field,
          oldValue: String((closing as any)[dto.field]),
          newValue: dto.newValue,
          reason: dto.reason,
          changedBy: actor.sub
        }
      });

      return tx.timeClosing.update({
        where: { id },
        data: {
          [dto.field]: !isNaN(Number(dto.newValue)) ? Number(dto.newValue) : dto.newValue
        }
      });
    });
  }

  async submitReview(companyId: string, actor: JwtUser, id: string) {
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing || closing.status !== TimeClosingStatus.DRAFT) throw new BadRequestException('Invalid status');
    
    return this.prisma.timeClosing.update({
      where: { id },
      data: { status: TimeClosingStatus.IN_REVIEW }
    });
  }

  async close(companyId: string, actor: JwtUser, id: string) {
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing || closing.status !== TimeClosingStatus.IN_REVIEW) throw new BadRequestException('Must be IN_REVIEW to close');
    
    return this.prisma.timeClosing.update({
      where: { id },
      data: { 
        status: TimeClosingStatus.CLOSED,
        closedAt: new Date(),
        closedBy: actor.sub
      }
    });
  }

  async reopen(companyId: string, actor: JwtUser, id: string, reason: string) {
    const closing = await this.prisma.timeClosing.findFirst({ where: { id, companyId } });
    if (!closing || closing.status !== TimeClosingStatus.CLOSED) throw new BadRequestException('Must be CLOSED to reopen');
    
    return this.prisma.timeClosing.update({
      where: { id },
      data: { 
        status: TimeClosingStatus.DRAFT,
        reopenedAt: new Date(),
        reopenedBy: actor.sub,
        reopenReason: reason
      }
    });
  }

  async getPdf(companyId: string, id: string) {
    // Generate PDF (Stub to be integrated with Puppeteer / React-PDF logic in frontend)
    // Here we would typically return a stream or a URL.
    return { url: `/time-closing/${id}/pdf-stream` };
  }
}
