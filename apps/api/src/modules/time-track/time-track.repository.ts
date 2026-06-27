import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TimeTrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string, skip = 0, take = 200) {
    return this.prisma.timeTrack.findMany({
      where: { employee: { companyId } },
      include: { employee: true },
      orderBy: [{ employee: { name: 'asc' } }, { date: 'asc' }, { createdAt: 'asc' }],
      skip,
      take,
    });
  }

  count(companyId: string) {
    return this.prisma.timeTrack.count({ where: { employee: { companyId } } });
  }

  listForEmployee(companyId: string, employeeId: string, skip = 0, take = 400) {
    return this.prisma.timeTrack.findMany({
      where: { employeeId, employee: { companyId } },
      include: { employee: true },
      orderBy: { date: 'desc' },
      skip,
      take,
    });
  }

  listEmployeeMonth(companyId: string, employeeId: string, start: Date, end: Date, skip = 0, take = 62) {
    return this.prisma.timeTrack.findMany({
      where: { employeeId, employee: { companyId }, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
      skip,
      take,
    });
  }

  countEmployeeMonth(companyId: string, employeeId: string, start: Date, end: Date) {
    return this.prisma.timeTrack.count({
      where: { employeeId, employee: { companyId }, date: { gte: start, lt: end } },
    });
  }

  async listForManager(companyId: string, userId: string, email?: string, skip = 0, take = 200) {
    const normalizedEmail = email?.trim();
    const manager = await this.prisma.employee.findFirst({
      where: {
        companyId,
        OR: [
          { userId },
          ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
        ],
      },
    });
    if (!manager) return [];
    return this.prisma.timeTrack.findMany({
      where: { employee: { companyId, OR: [{ id: manager.id }, { managerId: manager.id }] } },
      include: { employee: true },
      orderBy: [{ employee: { name: 'asc' } }, { date: 'asc' }, { createdAt: 'asc' }],
      skip,
      take,
    });
  }

  countForManager(companyId: string, userId: string, email?: string) {
    return this.prisma.timeTrack.count({
      where: { employee: { companyId, managerId: userId } },
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.timeTrack.findFirst({ where: { id, employee: { companyId } }, include: { employee: true } });
  }

  findEmployee(companyId: string, employeeId: string) {
    return this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
  }

  findEmployeeByUserId(companyId: string, userId: string, email?: string) {
    const normalizedEmail = email?.trim();
    return this.prisma.employee.findFirst({
      where: {
        companyId,
        OR: [
          { userId },
          ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
        ],
      },
    });
  }

  findByEmployeeDate(employeeId: string, date: Date) {
    return this.prisma.timeTrack.findUnique({ where: { employeeId_date: { employeeId, date } }, include: { employee: true } });
  }

  updateEmployeeUserLink(companyId: string, employeeId: string, userId: string) {
    return this.prisma.employee.updateMany({ where: { companyId, id: employeeId, userId: null }, data: { userId } });
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

  delete(companyId: string, id: string) {
    return this.prisma.timeTrack.deleteMany({ where: { id, employee: { companyId } } });
  }

  listPending(companyId: string) {
    return this.prisma.timeTrack.findMany({
      where: { employee: { companyId }, manualStatus: 'pending' },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPendingForManager(companyId: string, userId: string, email?: string) {
    const normalizedEmail = email?.trim();
    const manager = await this.prisma.employee.findFirst({
      where: {
        companyId,
        OR: [
          { userId },
          ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
        ],
      },
    });
    if (!manager) return [];
    return this.prisma.timeTrack.findMany({
      where: { employee: { companyId, managerId: manager.id }, manualStatus: 'pending' },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateManualStatus(companyId: string, id: string, status: string, revokeReason?: string) {
    const data: Record<string, string> = { manualStatus: status };
    if (revokeReason) {
      const track = await this.findById(companyId, id);
      const prevObs = track?.observation ?? '';
      data.observation = prevObs ? `${prevObs} | [Revogado: ${revokeReason}]` : `[Revogado: ${revokeReason}]`;
    }
    await this.prisma.timeTrack.updateMany({ where: { id, employee: { companyId } }, data });
    return this.findById(companyId, id);
  }

  getCompanyData(companyId: string) {
    return this.prisma.company.findUnique({ where: { id: companyId }, select: { latitude: true, longitude: true } });
  }

  async createGeofenceNotification(companyId: string, employee: any, dateStr: string, time: string, distanceMeters: number) {
    const distKm = (distanceMeters / 1000).toFixed(2);
    const message = `O funcionário ${employee.name} bateu ponto em ${dateStr} às ${time} a ${distKm}km da localização da empresa.`;
    const adminUserIds = await this.prisma.user.findMany({
      where: { companyId, role: { in: ['ADMIN', 'RH', 'DEV'] }, isActive: true },
      select: { id: true },
    });
    if (adminUserIds.length === 0) return;
    await this.prisma.notification.create({
      data: {
        companyId,
        type: 'URGENT_NOTICE',
        title: `⚠️ Ponto fora da empresa - ${employee.name}`,
        message,
        priority: 'HIGH',
        source: 'SYSTEM',
        status: 'SENT',
        sentAt: new Date(),
        recipients: {
          create: adminUserIds.map(u => ({ userId: u.id, status: 'UNREAD' })),
        },
      },
    });
  }
}

