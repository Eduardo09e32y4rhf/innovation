import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { saoPauloDayOfWeek, toSaoPauloDateKey } from '../../common/utils/date.utils';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { AssignScheduleDto } from './dto/assign-schedule.dto';
import { CreateScheduleExceptionDto } from './dto/swap-request.dto';
import { UpdateScheduleCoverageConfigDto } from './dto/schedule-governance.dto';

const CAN_WRITE = ['ADMIN', 'RH', 'DEV'];
const CAN_APPROVE = ['ADMIN', 'RH', 'GESTOR', 'DEV'];

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private monthBounds(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Mes invalido. Use YYYY-MM.');
    const [year, value] = month.split('-').map(Number);
    if (value < 1 || value > 12) throw new BadRequestException('Mes invalido. Use YYYY-MM.');
    return {
      start: new Date(Date.UTC(year, value - 1, 1)),
      end: new Date(Date.UTC(year, value, 1)),
    };
  }

  private buildCalendarDays(
    month: string,
    employee: { id: string; name: string },
    userSchedules: any[],
    exceptions: any[],
    holidays: any[],
    timeTracks: any[],
  ) {
    const { start: startDate, end: endDate } = this.monthBounds(month);
    const exceptionByDate = new Map(exceptions.map((item) => [toSaoPauloDateKey(item.date), item]));
    const holidayByDate = new Map(holidays.map((item) => [toSaoPauloDateKey(item.date as Date), item]));
    const timeTrackByDate = new Map(timeTracks.map((item) => [toSaoPauloDateKey(item.date as Date), item]));
    const days: any[] = [];
    const cursor = new Date(startDate);

    while (cursor < endDate) {
      const dateStr = toSaoPauloDateKey(cursor);
      const dow = saoPauloDayOfWeek(cursor);
      const userSchedule = userSchedules.find((item) => item.startDate <= cursor && (!item.endDate || item.endDate >= cursor));
      const exception = exceptionByDate.get(dateStr);
      const holiday = holidayByDate.get(dateStr);
      const timeTrack = timeTrackByDate.get(dateStr);

      let dayType = 'WORK';
      let entry = userSchedule?.entryTimeOverride ?? userSchedule?.schedule?.entryTime;
      let lunchStart = userSchedule?.lunchStartTimeOverride ?? userSchedule?.schedule?.lunchStartTime;
      let lunchReturn = userSchedule?.lunchReturnTimeOverride ?? userSchedule?.schedule?.lunchReturnTime;
      let exit = userSchedule?.exitTimeOverride ?? userSchedule?.schedule?.exitTime;

      if (exception) {
        dayType = exception.exceptionType;
        if (exception.exceptionType === 'COMPENSACAO') {
          entry = exception.altEntryTime ?? entry;
          exit = exception.altExitTime ?? exit;
        } else {
          entry = null;
          exit = null;
          lunchStart = null;
          lunchReturn = null;
        }
      } else if (holiday) {
        dayType = 'FERIADO';
        entry = null;
        exit = null;
        lunchStart = null;
        lunchReturn = null;
      } else if (userSchedule && userSchedule.schedule.restDays.includes(dow)) {
        dayType = 'FOLGA';
        entry = null;
        exit = null;
        lunchStart = null;
        lunchReturn = null;
      } else if (!userSchedule) {
        dayType = 'SEM_ESCALA';
      }

      days.push({
        date: dateStr,
        dayOfWeek: dow,
        dayType,
        scheduled: { entry, lunchStart, lunchReturn, exit },
        actual: timeTrack
          ? {
              entry: timeTrack.entry,
              lunchStart: timeTrack.lunchStart,
              lunchReturn: timeTrack.lunchReturn,
              exit: timeTrack.exit,
              totalWorked: timeTrack.totalWorked,
              dailyBalance: timeTrack.dailyBalance,
              incidentType: timeTrack.incidentType,
              lateMinutes: timeTrack.lateMinutes,
              earlyLeaveMinutes: timeTrack.earlyLeaveMinutes,
              absenceMinutes: timeTrack.absenceMinutes,
              overtime50Minutes: timeTrack.overtime50Minutes,
              overtime100Minutes: timeTrack.overtime100Minutes,
              nightShiftMinutes: timeTrack.nightShiftMinutes,
              overtimeApprovalStatus: timeTrack.overtimeApprovalStatus,
              overtimeExceedsLimit: timeTrack.overtimeExceedsLimit,
              overtimeHandling: timeTrack.overtimeHandling,
              overtimeBankMinutes: timeTrack.overtimeBankMinutes,
              overtimePaymentMinutes: timeTrack.overtimePaymentMinutes,
              observation: timeTrack.observation,
              manualReason: timeTrack.manualReason,
              manualStatus: timeTrack.manualStatus,
              latitude: timeTrack.latitude,
              longitude: timeTrack.longitude,
              clockedInWithoutFacial: timeTrack.clockedInWithoutFacial ?? false,
            }
          : null,
        exception: exception ?? null,
        holiday: holiday ? { name: (holiday as any).name, date: dateStr } : null,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      employee,
      schedule: userSchedules[0]?.schedule ?? null,
      month,
      days,
    };
  }

  private assertCanWrite(actor: JwtUser) {
    if (!CAN_WRITE.includes(actor.role)) {
      throw new ForbiddenException('Apenas RH, Admin ou Dev podem criar/editar escalas.');
    }
  }

  private assignmentDates(dto: AssignScheduleDto) {
    const startDate = new Date(`${dto.startDate.slice(0, 10)}T00:00:00.000Z`);
    const endDate = dto.endDate
      ? new Date(`${dto.endDate.slice(0, 10)}T00:00:00.000Z`)
      : null;
    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
      throw new BadRequestException('Data de vigencia invalida.');
    }
    if (endDate && endDate < startDate) {
      throw new BadRequestException('O fim da vigencia nao pode ser anterior ao inicio.');
    }
    return { startDate, endDate };
  }

  private assignmentQueryEnd(endDate: Date | null) {
    return endDate ?? new Date('9999-12-31T00:00:00.000Z');
  }

  private previewEnd(startDate: Date, endDate: Date | null) {
    if (endDate) return endDate;
    const end = new Date(startDate);
    end.setUTCDate(end.getUTCDate() + 89);
    return end;
  }

  private isSameDate(left: Date, right: Date) {
    return left.getTime() === right.getTime();
  }

  private async coverageConfigFrom(client: any, companyId: string) {
    const record = await client.auditLog.findFirst({
      where: {
        companyId,
        entity: 'ScheduleCoverageConfig',
        action: 'SCHEDULE_COVERAGE_CONFIGURED',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userId: true, metadata: true, createdAt: true },
    });
    if (!record) return null;
    const metadata = (record.metadata ?? {}) as Record<string, any>;
    return {
      id: record.id,
      rules: Array.isArray(metadata.rules) ? metadata.rules : [],
      updatedBy: record.userId,
      updatedAt: record.createdAt,
    };
  }

  private async coverageViolations(
    client: any,
    companyId: string,
    employees: any[],
    schedule: any,
    startDate: Date,
    endDate: Date | null,
  ) {
    const config = await this.coverageConfigFrom(client, companyId);
    if (!config?.rules.length) return { configured: false, validationEnd: null, violations: [] };

    const departments = [...new Set(employees.map((employee) => employee.department).filter(Boolean))];
    const rules = config.rules.filter((rule: any) => departments.includes(rule.department));
    if (!rules.length) {
      return { configured: true, validationEnd: null, violations: [] };
    }

    const validationEnd = this.previewEnd(startDate, endDate);
    const departmentEmployees = await client.employee.findMany({
      where: { companyId, status: 'ACTIVE', department: { in: departments } },
      select: { id: true, department: true },
    });
    const departmentEmployeeIds = departmentEmployees.map((employee: any) => employee.id);
    const assignments = await client.userSchedule.findMany({
      where: {
        companyId,
        employeeId: { in: departmentEmployeeIds },
        startDate: { lte: validationEnd },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
      },
      include: { schedule: true },
      orderBy: { startDate: 'desc' },
    });
    const proposedEmployeeIds = new Set(employees.map((employee) => employee.id));
    const violations: Array<Record<string, unknown>> = [];
    const cursor = new Date(startDate);

    while (cursor <= validationEnd && violations.length < 50) {
      const dayOfWeek = saoPauloDayOfWeek(cursor);
      for (const rule of rules) {
        const configuredDays = Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length
          ? rule.daysOfWeek
          : [0, 1, 2, 3, 4, 5, 6];
        if (!configuredDays.includes(dayOfWeek)) continue;

        const employeeIds = departmentEmployees
          .filter((employee: any) => employee.department === rule.department)
          .map((employee: any) => employee.id);
        const available = employeeIds.filter((employeeId: string) => {
          if (
            proposedEmployeeIds.has(employeeId) &&
            cursor >= startDate &&
            (!endDate || cursor <= endDate)
          ) {
            return (schedule.workDays ?? []).includes(dayOfWeek);
          }
          const assignment = assignments.find(
            (item: any) =>
              item.employeeId === employeeId &&
              item.startDate <= cursor &&
              (!item.endDate || item.endDate >= cursor),
          );
          return Boolean(assignment?.schedule?.workDays?.includes(dayOfWeek));
        }).length;

        if (available < Number(rule.minimumEmployees)) {
          violations.push({
            date: toSaoPauloDateKey(cursor),
            department: rule.department,
            minimumEmployees: Number(rule.minimumEmployees),
            availableEmployees: available,
          });
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      configured: true,
      validationEnd: toSaoPauloDateKey(validationEnd),
      violations,
    };
  }

  private async assessAssignment(
    client: any,
    companyId: string,
    dto: AssignScheduleDto,
  ) {
    const employeeIds = [...new Set(dto.employeeIds)];
    if (!employeeIds.length) throw new BadRequestException('Selecione pelo menos um funcionario.');
    const { startDate, endDate } = this.assignmentDates(dto);
    const rangeEnd = this.assignmentQueryEnd(endDate);
    const [schedule, employees, assignments, protectedClosings, affectedTimeTracks] =
      await Promise.all([
        client.schedule.findFirst({ where: { id: dto.scheduleId, companyId } }),
        client.employee.findMany({
          where: { companyId, id: { in: employeeIds } },
          select: { id: true, name: true, department: true },
        }),
        client.userSchedule.findMany({
          where: {
            companyId,
            employeeId: { in: employeeIds },
            startDate: { lte: rangeEnd },
            OR: [{ endDate: null }, { endDate: { gte: startDate } }],
          },
          include: {
            employee: { select: { id: true, name: true } },
            schedule: { select: { id: true, name: true, workDays: true } },
          },
        }),
        client.timeClosing.findMany({
          where: {
            companyId,
            employeeId: { in: employeeIds },
            status: { not: 'DRAFT' },
            periodStart: { lte: rangeEnd },
            periodEnd: { gte: startDate },
          },
          select: {
            id: true,
            employeeId: true,
            status: true,
            periodStart: true,
            periodEnd: true,
          },
        }),
        client.timeTrack.count({
          where: {
            companyId,
            employeeId: { in: employeeIds },
            date: { gte: startDate, lte: this.previewEnd(startDate, endDate) },
          },
        }),
      ]);

    if (!schedule) throw new NotFoundException('Escala nao encontrada.');
    if (employees.length !== employeeIds.length) {
      throw new BadRequestException('Um ou mais funcionarios nao pertencem a esta empresa.');
    }

    const replacements = assignments.filter((item: any) => this.isSameDate(item.startDate, startDate));
    const truncated = assignments.filter(
      (item: any) => item.startDate < startDate && item.endDate === null,
    );
    const ignoredIds = new Set([...replacements, ...truncated].map((item: any) => item.id));
    const overlaps = assignments.filter((item: any) => !ignoredIds.has(item.id));
    const coverage = await this.coverageViolations(
      client,
      companyId,
      employees,
      schedule,
      startDate,
      endDate,
    );
    const today = new Date(`${toSaoPauloDateKey(new Date())}T00:00:00.000Z`);
    const blockers: string[] = [];
    if (protectedClosings.length) {
      blockers.push('A vigencia intercepta periodo de ponto em revisao, aprovado ou fechado.');
    }
    if (overlaps.length) {
      blockers.push('Existe outra vigencia futura ou delimitada sobreposta.');
    }
    if (coverage.violations.length) {
      blockers.push('A escala proposta viola a cobertura minima configurada.');
    }

    return {
      canApply: blockers.length === 0,
      blockers,
      retroactive: startDate < today,
      employeeCount: employees.length,
      employees,
      schedule,
      startDate,
      endDate,
      affectedTimeTracks,
      replacements,
      truncated,
      overlaps,
      protectedClosings,
      coverage,
    };
  }

  private assignmentPreviewResponse(assessment: any) {
    return {
      canApply: assessment.canApply,
      blockers: assessment.blockers,
      retroactive: assessment.retroactive,
      employeeCount: assessment.employeeCount,
      schedule: {
        id: assessment.schedule.id,
        name: assessment.schedule.name,
      },
      period: {
        startDate: toSaoPauloDateKey(assessment.startDate),
        endDate: assessment.endDate ? toSaoPauloDateKey(assessment.endDate) : null,
      },
      impact: {
        timeTracks: assessment.affectedTimeTracks,
        assignmentsReplaced: assessment.replacements.length,
        assignmentsTruncated: assessment.truncated.length,
        overlappingAssignments: assessment.overlaps.map((item: any) => ({
          id: item.id,
          employeeId: item.employeeId,
          employeeName: item.employee?.name ?? null,
          scheduleId: item.scheduleId,
          scheduleName: item.schedule?.name ?? null,
          startDate: toSaoPauloDateKey(item.startDate),
          endDate: item.endDate ? toSaoPauloDateKey(item.endDate) : null,
        })),
        protectedClosings: assessment.protectedClosings.map((closing: any) => ({
          ...closing,
          periodStart: toSaoPauloDateKey(closing.periodStart),
          periodEnd: toSaoPauloDateKey(closing.periodEnd),
        })),
        coverage: assessment.coverage,
      },
    };
  }

  async listSchedules(companyId: string) {
    return this.prisma.schedule.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSchedule(companyId: string, id: string) {
    const s = await this.prisma.schedule.findFirst({ where: { id, companyId } });
    if (!s) throw new NotFoundException('Escala nao encontrada.');
    return s;
  }

  async createSchedule(companyId: string, actor: JwtUser, dto: CreateScheduleDto) {
    this.assertCanWrite(actor);
    return this.prisma.schedule.create({
      data: {
        companyId,
        ...dto,
        createdByUserId: actor.sub,
        workDays: dto.workDays ?? [1, 2, 3, 4, 5],
        restDays: dto.restDays ?? [0, 6],
      },
    });
  }

  async updateSchedule(companyId: string, actor: JwtUser, id: string, dto: Partial<CreateScheduleDto>) {
    this.assertCanWrite(actor);
    await this.getSchedule(companyId, id);
    return this.prisma.schedule.update({ where: { id }, data: dto });
  }

  async archiveSchedule(companyId: string, actor: JwtUser, id: string) {
    this.assertCanWrite(actor);
    await this.getSchedule(companyId, id);
    return this.prisma.schedule.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async assignSchedule(companyId: string, actor: JwtUser, dto: AssignScheduleDto) {
    this.assertCanWrite(actor);

    return this.prisma.$transaction(async (tx) => {
      const assessment = await this.assessAssignment(tx, companyId, dto);
      if (!assessment.canApply) {
        throw new BadRequestException({
          message: 'A atribuicao de escala possui bloqueios.',
          preview: this.assignmentPreviewResponse(assessment),
        });
      }

      const employeeIds: string[] = assessment.employees.map((employee: any) => String(employee.id));
      const previousEndDate = new Date(assessment.startDate);
      previousEndDate.setUTCDate(previousEndDate.getUTCDate() - 1);

      await tx.userSchedule.deleteMany({
        where: { companyId, employeeId: { in: employeeIds }, startDate: assessment.startDate },
      });

      await tx.userSchedule.updateMany({
        where: {
          employeeId: { in: employeeIds },
          companyId,
          endDate: null,
          startDate: { lt: assessment.startDate },
        },
        data: { endDate: previousEndDate },
      });

      const dataToInsert = employeeIds.map((empId: string) => ({
        companyId,
        employeeId: empId,
        scheduleId: dto.scheduleId,
        startDate: assessment.startDate,
        endDate: assessment.endDate,
        entryTimeOverride: dto.entryTimeOverride,
        lunchStartTimeOverride: dto.lunchStartTimeOverride,
        lunchReturnTimeOverride: dto.lunchReturnTimeOverride,
        exitTimeOverride: dto.exitTimeOverride,
        assignedByUserId: actor.sub,
      }));

      await tx.userSchedule.createMany({ data: dataToInsert });
      await tx.auditLog.create({
        data: {
          companyId,
          userId: actor.sub,
          action: 'SCHEDULE_ASSIGNMENT_APPLIED',
          entity: 'ScheduleAssignment',
          entityId: dto.scheduleId,
          metadata: JSON.parse(JSON.stringify({
            employeeIds,
            scheduleId: dto.scheduleId,
            scheduleName: assessment.schedule.name,
            startDate: toSaoPauloDateKey(assessment.startDate),
            endDate: assessment.endDate ? toSaoPauloDateKey(assessment.endDate) : null,
            retroactive: assessment.retroactive,
            affectedTimeTracks: assessment.affectedTimeTracks,
            replacedAssignmentIds: assessment.replacements.map((item: any) => item.id),
            truncatedAssignmentIds: assessment.truncated.map((item: any) => item.id),
            coverage: assessment.coverage,
          })) as Prisma.InputJsonValue,
        },
      });
      return {
        success: true,
        count: employeeIds.length,
        preview: this.assignmentPreviewResponse(assessment),
      };
    });
  }

  async previewAssignment(companyId: string, actor: JwtUser, dto: AssignScheduleDto) {
    this.assertCanWrite(actor);
    const assessment = await this.assessAssignment(this.prisma, companyId, dto);
    return this.assignmentPreviewResponse(assessment);
  }

  async history(companyId: string, actor: JwtUser, employeeId?: string, limit?: string) {
    if (!CAN_APPROVE.includes(actor.role)) throw new ForbiddenException('Acesso negado.');
    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const records = await this.prisma.auditLog.findMany({
      where: {
        companyId,
        entity: {
          in: ['ScheduleAssignment', 'ScheduleSwapRequest', 'ScheduleCoverageConfig'],
        },
      },
      select: {
        id: true,
        userId: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: employeeId ? 500 : parsedLimit,
    });
    if (!employeeId) return records;
    return records
      .filter((record: any) => {
        const metadata = (record.metadata ?? {}) as Record<string, any>;
        return metadata.employeeId === employeeId || metadata.employeeIds?.includes(employeeId);
      })
      .slice(0, parsedLimit);
  }

  async getCoverageConfig(companyId: string, actor: JwtUser) {
    if (!CAN_APPROVE.includes(actor.role)) throw new ForbiddenException('Acesso negado.');
    return (await this.coverageConfigFrom(this.prisma, companyId)) ?? {
      rules: [],
      updatedBy: null,
      updatedAt: null,
    };
  }

  async updateCoverageConfig(
    companyId: string,
    actor: JwtUser,
    dto: UpdateScheduleCoverageConfigDto,
  ) {
    this.assertCanWrite(actor);
    const departments = dto.rules.map((rule) => rule.department.trim());
    if (departments.some((department) => !department)) {
      throw new BadRequestException('Informe o departamento de todas as regras.');
    }
    if (new Set(departments.map((department) => department.toLowerCase())).size !== departments.length) {
      throw new BadRequestException('Existe mais de uma regra para o mesmo departamento.');
    }
    const rules = dto.rules.map((rule) => ({
      department: rule.department.trim(),
      minimumEmployees: rule.minimumEmployees,
      daysOfWeek: [...new Set(rule.daysOfWeek ?? [1, 2, 3, 4, 5])].sort(),
    }));
    const previous = await this.coverageConfigFrom(this.prisma, companyId);
    const record = await this.prisma.auditLog.create({
      data: {
        companyId,
        userId: actor.sub,
        action: 'SCHEDULE_COVERAGE_CONFIGURED',
        entity: 'ScheduleCoverageConfig',
        entityId: companyId,
        metadata: {
          rules,
          previousRules: previous?.rules ?? [],
        },
      },
      select: { id: true, userId: true, metadata: true, createdAt: true },
    });
    return {
      id: record.id,
      rules,
      updatedBy: record.userId,
      updatedAt: record.createdAt,
    };
  }

  async getMySchedule(companyId: string, actor: JwtUser) {
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, userId: actor.sub },
    });
    if (!employee) return null;

    const today = new Date();
    const userSchedule = await this.prisma.userSchedule.findFirst({
      where: {
        companyId,
        employeeId: employee.id,
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      include: { schedule: true },
      orderBy: { startDate: 'desc' },
    });

    return { employee, userSchedule };
  }

  async getCalendar(companyId: string, actor: JwtUser, employeeId: string, month: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Funcionario nao encontrado.');

    if (actor.role === 'FUNCIONARIO') {
      const self = await this.prisma.employee.findFirst({ where: { companyId, userId: actor.sub } });
      if (!self || self.id !== employeeId) {
        throw new ForbiddenException('Acesso negado.');
      }
    }

    if (actor.role === 'GESTOR') {
      const manager = await this.prisma.employee.findFirst({ where: { companyId, userId: actor.sub } });
      if (!manager || (employee.id !== manager.id && employee.managerId !== manager.id)) {
        throw new ForbiddenException('Acesso negado.');
      }
    }

    const { start: startDate, end: endDate } = this.monthBounds(month);

    const userSchedules = await this.prisma.userSchedule.findMany({
      where: {
        companyId,
        employeeId,
        startDate: { lt: endDate },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
      },
      include: { schedule: true },
      orderBy: { startDate: 'desc' },
    });

    const exceptions = await this.prisma.scheduleException.findMany({
      where: {
        companyId,
        employeeId,
        date: { gte: startDate, lt: endDate },
      },
    });

    const holidays = await this.prisma.holiday.findMany({
      where: {
        companyId,
        date: { gte: startDate, lt: endDate },
      },
    });

    const timeTracks = await this.prisma.timeTrack.findMany({
      where: {
        companyId,
        employeeId,
        date: { gte: startDate, lt: endDate },
      },
    });

    return this.buildCalendarDays(
      month,
      { id: employee.id, name: employee.name },
      userSchedules,
      exceptions,
      holidays,
      timeTracks,
    );
  }

  async getTeamSchedule(companyId: string, actor: JwtUser, month: string) {
    let employeeIds: string[] = [];

    if (actor.role === 'GESTOR') {
      const self = await this.prisma.employee.findFirst({
        where: { companyId, userId: actor.sub },
      });
      if (!self) return { withSchedule: [], withoutSchedule: [], calendars: [], month };
      const team = await this.prisma.employee.findMany({
        where: { companyId, managerId: self.id, status: 'ACTIVE' },
        select: { id: true },
      });
      employeeIds = [self.id, ...team.map((e: any) => e.id)];
    } else if (['ADMIN', 'RH', 'DEV'].includes(actor.role)) {
      const all = await this.prisma.employee.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          ...(actor.role === 'DEV'
            ? {}
            : {
                OR: [{ user: null }, { user: { role: { not: 'DEV' } } }],
              }),
        },
        select: { id: true },
      });
      employeeIds = all.map((e: any) => e.id);
    } else {
      throw new ForbiddenException('Acesso negado.');
    }

    const { start: startDate, end: endDate } = this.monthBounds(month);

    const userSchedules = await this.prisma.userSchedule.findMany({
      where: {
        companyId,
        employeeId: { in: employeeIds },
        startDate: { lt: endDate },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }],
      },
      include: {
        schedule: true,
        employee: { select: { id: true, name: true, department: true, position: true, registration: true } },
      },
      orderBy: [{ employee: { name: 'asc' } }],
    });

    const withScheduleMap = new Map();
    for (const us of userSchedules) {
      if (!withScheduleMap.has(us.employeeId)) {
        withScheduleMap.set(us.employeeId, us);
      }
    }
    const uniqueUserSchedules = Array.from(withScheduleMap.values());
    const withScheduleIds = new Set(withScheduleMap.keys());

    const withoutSchedule = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds.filter((id) => !withScheduleIds.has(id)) } },
      select: { id: true, name: true, department: true, position: true, registration: true },
    });

    const exceptions = await this.prisma.scheduleException.findMany({
      where: {
        companyId,
        employeeId: { in: employeeIds },
        date: { gte: startDate, lt: endDate },
      },
    });
    const holidays = await this.prisma.holiday.findMany({
      where: {
        companyId,
        date: { gte: startDate, lt: endDate },
      },
    });
    const timeTracks = await this.prisma.timeTrack.findMany({
      where: {
        companyId,
        employeeId: { in: employeeIds },
        date: { gte: startDate, lt: endDate },
      },
    });

    const schedulesByEmployee = new Map<string, any[]>();
    for (const schedule of userSchedules) {
      const bucket = schedulesByEmployee.get(schedule.employeeId) ?? [];
      bucket.push(schedule);
      schedulesByEmployee.set(schedule.employeeId, bucket);
    }

    const exceptionsByEmployee = new Map<string, any[]>();
    for (const exception of exceptions) {
      const bucket = exceptionsByEmployee.get(exception.employeeId) ?? [];
      bucket.push(exception);
      exceptionsByEmployee.set(exception.employeeId, bucket);
    }

    const timeTracksByEmployee = new Map<string, any[]>();
    for (const timeTrack of timeTracks) {
      const bucket = timeTracksByEmployee.get(timeTrack.employeeId) ?? [];
      bucket.push(timeTrack);
      timeTracksByEmployee.set(timeTrack.employeeId, bucket);
    }

    const employeeMetaById = new Map<string, any>();
    for (const assignment of uniqueUserSchedules) {
      employeeMetaById.set(assignment.employeeId, assignment.employee);
    }
    for (const employee of withoutSchedule) {
      employeeMetaById.set(employee.id, employee);
    }

    const calendars = employeeIds.map((employeeId) =>
      this.buildCalendarDays(
        month,
        {
          id: employeeId,
          name: employeeMetaById.get(employeeId)?.name ?? 'Funcionario',
        },
        schedulesByEmployee.get(employeeId) ?? [],
        exceptionsByEmployee.get(employeeId) ?? [],
        holidays,
        timeTracksByEmployee.get(employeeId) ?? [],
      ),
    );

    const calendarByEmployee = new Map(calendars.map((calendar) => [calendar.employee.id, calendar]));
    const withSchedule = uniqueUserSchedules.map((assignment: any) => ({
      ...assignment,
      days: calendarByEmployee.get(assignment.employeeId)?.days ?? [],
    }));

    return {
      withSchedule,
      withoutSchedule,
      calendars,
      month,
    };
  }

  async createException(companyId: string, actor: JwtUser, dto: CreateScheduleExceptionDto) {
    if (!CAN_WRITE.includes(actor.role)) {
      throw new ForbiddenException('Apenas RH, Admin ou Dev podem criar excecoes.');
    }
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Funcionario nao encontrado.');

    const exceptionDate = new Date(`${dto.date.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(exceptionDate.getTime())) throw new BadRequestException('Data invalida.');

    return this.prisma.scheduleException.upsert({
      where: {
        employeeId_date_exceptionType: {
          employeeId: dto.employeeId,
          date: exceptionDate,
          exceptionType: dto.exceptionType,
        },
      },
      create: {
        companyId,
        employeeId: dto.employeeId,
        date: exceptionDate,
        exceptionType: dto.exceptionType,
        reason: dto.reason,
        observation: dto.observation,
        altEntryTime: dto.altEntryTime,
        altExitTime: dto.altExitTime,
        createdByUserId: actor.sub,
      },
      update: {
        reason: dto.reason,
        observation: dto.observation,
        altEntryTime: dto.altEntryTime,
        altExitTime: dto.altExitTime,
      },
    });
  }

  async deleteException(companyId: string, actor: JwtUser, id: string) {
    if (!CAN_WRITE.includes(actor.role)) {
      throw new ForbiddenException('Acesso negado.');
    }
    await this.prisma.scheduleException.deleteMany({ where: { id, companyId } });
    return { ok: true };
  }

  async getActiveScheduleForEmployee(companyId: string, employeeId: string, date: Date) {
    return this.prisma.userSchedule.findFirst({
      where: {
        companyId,
        employeeId,
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
      },
      include: { schedule: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async getMyCalendar(companyId: string, actor: JwtUser, month: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, userId: actor.sub },
    });
    if (!employee) throw new NotFoundException('Funcionario nao encontrado para este usuario.');
    return this.getCalendar(companyId, actor, employee.id, month);
  }
}
