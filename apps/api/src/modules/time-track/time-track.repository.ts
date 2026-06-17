import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TimeTrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.timeTrack.findMany({
      where: { employee: { companyId } },
      include: { employee: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  listEmployeeMonth(companyId: string, employeeId: string, start: Date, end: Date) {
    return this.prisma.timeTrack.findMany({
      where: { employeeId, employee: { companyId }, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.timeTrack.findFirst({ where: { id, employee: { companyId } }, include: { employee: true } });
  }

  findEmployee(companyId: string, employeeId: string) {
    return this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
  }

  upsert(employeeId: string, date: Date, data: any) {
    return this.prisma.timeTrack.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { employeeId, date, ...data },
      update: data,
    });
  }

  update(companyId: string, id: string, data: any) {
    return this.prisma.timeTrack.updateMany({ where: { id, employee: { companyId } }, data });
  }
}
