import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string, skip = 0, take = 100) {
    return this.prisma.employee.findMany({
      where: { companyId },
      include: { 
        user: { select: { id: true, role: true, isActive: true, forcePasswordChange: true } },
        faceEnrollment: { select: { active: true } }
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      skip,
      take,
    });
  }

  count(companyId: string) {
    return this.prisma.employee.count({ where: { companyId } });
  }

  findById(companyId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { companyId, id },
      include: { 
        user: { select: { id: true, role: true, isActive: true, forcePasswordChange: true } },
        faceEnrollment: { select: { active: true } }
      },
    });
  }

  findByUserId(companyId: string, userId: string, email?: string) {
    const normalizedEmail = email?.trim();
    return this.prisma.employee.findFirst({
      where: {
        companyId,
        OR: [
          { userId },
          ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
        ],
      },
      include: { 
        user: { select: { id: true, role: true, isActive: true, forcePasswordChange: true } },
        faceEnrollment: { select: { active: true } }
      },
    });
  }

  listByManager(companyId: string, managerId: string, skip = 0, take = 100) {
    return this.prisma.employee.findMany({
      where: { companyId, managerId },
      include: { 
        user: { select: { id: true, role: true, isActive: true, forcePasswordChange: true } },
        faceEnrollment: { select: { active: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countByManager(companyId: string, managerId: string) {
    return this.prisma.employee.count({ where: { companyId, managerId } });
  }

  findByCpf(cpf: string) {
    return this.prisma.employee.findUnique({ where: { cpf } });
  }

  findByRegistration(companyId: string, registration: string) {
    return this.prisma.employee.findFirst({
      where: { companyId, registration: { equals: registration, mode: 'insensitive' } },
    });
  }

  create(companyId: string, data: any) {
    return this.prisma.employee.create({ data: { ...data, companyId } });
  }

  update(companyId: string, id: string, data: any) {
    return this.prisma.employee.updateMany({ where: { companyId, id }, data });
  }

  updateUserLink(companyId: string, id: string, userId: string | null) {
    return this.prisma.employee.updateMany({ where: { companyId, id }, data: { userId } });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  createUser(data: any) {
    return this.prisma.user.create({ data });
  }

  updateUser(companyId: string, id: string, data: any) {
    return this.prisma.user.updateMany({ where: { companyId, id }, data });
  }

  async getDeletionImpact(companyId: string, id: string) {
    const [timeTracks, vacations, asoRecords, timeOccurrences, timeClosings, userSchedules, scheduleExceptions, supportTicketsAffected] =
      await Promise.all([
        this.prisma.timeTrack.count({ where: { companyId, employeeId: id } }),
        this.prisma.vacation.count({ where: { employeeId: id, employee: { companyId } } }),
        this.prisma.employeeAsoRecord.count({ where: { companyId, employeeId: id } }),
        this.prisma.timeOccurrence.count({ where: { companyId, employeeId: id } }),
        this.prisma.timeClosing.count({ where: { companyId, employeeId: id } }),
        this.prisma.userSchedule.count({ where: { companyId, employeeId: id } }),
        this.prisma.scheduleException.count({ where: { companyId, employeeId: id } }),
        this.prisma.supportTicket.count({ where: { companyId, affectedEmployeeId: id } }),
      ]);

    return {
      timeTracks,
      vacations,
      asoRecords,
      timeOccurrences,
      timeClosings,
      userSchedules,
      scheduleExceptions,
      supportTicketsAffected,
      total:
        timeTracks +
        vacations +
        asoRecords +
        timeOccurrences +
        timeClosings +
        userSchedules +
        scheduleExceptions +
        supportTicketsAffected,
    };
  }

  async getDossier(companyId: string, id: string) {
    const employee = await this.findById(companyId, id);
    if (!employee) return null;

    const [asoRecords, vacations, recentTimeTracks, occurrences, deletionImpact] = await Promise.all([
      this.prisma.employeeAsoRecord.findMany({
        where: { companyId, employeeId: id },
        orderBy: [{ examDate: 'desc' }, { createdAt: 'desc' }],
        take: 12,
      }),
      this.prisma.vacation.findMany({
        where: { employeeId: id, employee: { companyId } },
        orderBy: [{ startDate: 'desc' }],
        take: 12,
      }),
      this.prisma.timeTrack.findMany({
        where: { companyId, employeeId: id },
        orderBy: [{ date: 'desc' }],
        take: 15,
      }),
      this.prisma.timeOccurrence.findMany({
        where: { companyId, employeeId: id },
        orderBy: [{ createdAt: 'desc' }],
        take: 12,
      }),
      this.getDeletionImpact(companyId, id),
    ]);

    return {
      employee,
      asoRecords,
      vacations,
      recentTimeTracks,
      occurrences,
      deletionImpact,
    };
  }

  async getOfficialDocumentData(companyId: string, id: string, period?: { start: Date; end: Date }) {
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, id },
      include: {
        user: { select: { id: true, role: true, isActive: true } },
      },
    });
    if (!employee) return null;

    const [company, manager, timeTracks, occurrences, closing] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          legalName: true,
          document: true,
          phone: true,
          email: true,
          street: true,
          streetNumber: true,
          neighborhood: true,
          city: true,
          state: true,
          zipCode: true,
        },
      }),
      employee.managerId
        ? this.prisma.employee.findFirst({
            where: { companyId, id: employee.managerId },
            select: { id: true, name: true },
          })
        : null,
      period
        ? this.prisma.timeTrack.findMany({
            where: {
              companyId,
              employeeId: id,
              date: { gte: period.start, lte: period.end },
            },
            orderBy: { date: 'asc' },
          })
        : [],
      period
        ? this.prisma.timeOccurrence.findMany({
            where: {
              companyId,
              employeeId: id,
              date: { gte: period.start, lte: period.end },
            },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
          })
        : [],
      period
        ? this.prisma.timeClosing.findFirst({
            where: {
              companyId,
              employeeId: id,
              periodStart: { lte: period.end },
              periodEnd: { gte: period.start },
            },
            orderBy: { updatedAt: 'desc' },
          })
        : null,
    ]);

    return { company, employee, manager, timeTracks, occurrences, closing };
  }

  delete(companyId: string, id: string) {
    return this.prisma.employee.deleteMany({ where: { companyId, id } });
  }
}
