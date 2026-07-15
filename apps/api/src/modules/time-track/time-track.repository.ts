import { Injectable } from '@nestjs/common';
import type { UserRole } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';

type EmployeeSummary = {
  id: string;
  name: string;
  department: string | null;
  status: string;
  user?: { role: UserRole } | null;
  workScheduleRule?: { restDaysOfWeek: number[] } | null;
};

type TrackWithEmployee = {
  id: string;
  employeeId: string;
  date: Date;
  entry: Date | null;
  lunchStart: Date | null;
  lunchReturn: Date | null;
  exit: Date | null;
  totalWorked: number | null;
  dailyBalance: number | null;
  overtime50Minutes: number | null;
  overtime100Minutes: number | null;
  nightShiftMinutes: number | null;
  observation: string | null;
  latitude: number | null;
  longitude: number | null;
  manualReason: string | null;
  manualStatus: string | null;
  overtimeApprovalStatus: string | null;
  overtimeExceedsLimit: boolean;
  incidentType: string | null;
  toleranceMinutes: number | null;
  absenceMinutes: number | null;
  clockedInWithoutFacial: boolean;
  createdAt: Date;
  updatedAt: Date;
  employee?: EmployeeSummary | null;
};

@Injectable()
export class TimeTrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly employeeSelect = {
    id: true,
    name: true,
    department: true,
    status: true,
    user: { select: { role: true } },
    workScheduleRule: { select: { restDaysOfWeek: true } },
  } as const;

  private readonly trackSelect = {
    id: true,
    employeeId: true,
    date: true,
    entry: true,
    lunchStart: true,
    lunchReturn: true,
    exit: true,
    totalWorked: true,
    dailyBalance: true,
    overtime50Minutes: true,
    overtime100Minutes: true,
    nightShiftMinutes: true,
    observation: true,
    latitude: true,
    longitude: true,
    manualReason: true,
    manualStatus: true,
    overtimeApprovalStatus: true,
overtimeExceedsLimit: true,
overtimeApprovedAt: true,
overtimeApprovedByUserId: true,
overtimeHandling: true,
overtimeBankMinutes: true,
overtimePaymentMinutes: true,
    incidentType: true,
    toleranceMinutes: true,
    absenceMinutes: true,
    clockedInWithoutFacial: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private async findEmployeeSummary(companyId: string, employeeId: string) {
    return this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: this.employeeSelect,
    });
  }

  private async loadEmployees(companyId: string, employeeIds?: string[]) {
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        ...(employeeIds?.length ? { id: { in: employeeIds } } : {}),
      },
      select: this.employeeSelect,
      orderBy: { name: 'asc' },
    });
    return new Map<string, EmployeeSummary>(employees.map((employee) => [employee.id, employee]));
  }

  private async loadTracks(
    companyId: string,
    employeeIds?: string[],
    start?: Date,
    end?: Date,
    extraWhere: Record<string, unknown> = {},
  ) {
    const employeeMap = await this.loadEmployees(companyId, employeeIds);
    const ids = employeeIds?.length ? employeeIds : [...employeeMap.keys()];
    if (ids.length === 0) return [];

    const tracks = await this.prisma.timeTrack.findMany({
      where: {
        employeeId: { in: ids },
        ...(start && end ? { date: { gte: start, lt: end } } : {}),
        ...extraWhere,
      },
      select: this.trackSelect,
      orderBy: { date: 'asc' },
    });

    return tracks
      .map((track) => ({
        ...track,
        employee: employeeMap.get(track.employeeId) ?? null,
      }))
      .sort((a: TrackWithEmployee, b: TrackWithEmployee) => {
        const nameA = a.employee?.name ?? '';
        const nameB = b.employee?.name ?? '';
        return nameA.localeCompare(nameB, 'pt-BR') || a.date.getTime() - b.date.getTime();
      });
  }

  list(companyId: string, start?: Date, end?: Date) {
    return this.loadTracks(companyId, undefined, start, end);
  }

  count(companyId: string) {
    return this.prisma.timeTrack.count({ where: { employee: { companyId } } });
  }

  async listForEmployee(companyId: string, employeeId: string, start?: Date, end?: Date) {
    const employee = await this.findEmployeeSummary(companyId, employeeId);
    if (!employee) return [];
    const tracks = await this.prisma.timeTrack.findMany({
      where: {
        employeeId,
        ...(start && end ? { date: { gte: start, lt: end } } : {}),
      },
      select: this.trackSelect,
      orderBy: { date: 'asc' },
    });
    return tracks.map((track) => ({ ...track, employee }));
  }

  listEmployeeMonth(companyId: string, employeeId: string, start: Date, end: Date, skip = 0, take = 62) {
    return this.findEmployeeSummary(companyId, employeeId).then((employee) => {
      if (!employee) return [];
      return this.prisma.timeTrack.findMany({
        where: { employeeId, date: { gte: start, lt: end } },
        orderBy: { date: 'asc' },
        skip,
        take,
        select: this.trackSelect,
      });
    });
  }

  countEmployeeMonth(companyId: string, employeeId: string, start: Date, end: Date) {
    return this.findEmployeeSummary(companyId, employeeId).then((employee) => {
      if (!employee) return 0;
      return this.prisma.timeTrack.count({
        where: { employeeId, date: { gte: start, lt: end } },
      });
    });
  }

  async listForManager(companyId: string, userId: string, email?: string, start?: Date, end?: Date) {
    const normalizedEmail = email?.trim();
    const manager = await this.prisma.employee.findFirst({
      where: {
        companyId,
        OR: [
          { userId },
          ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
        ],
      },
      select: { id: true },
    });
    if (!manager) return [];

    const employees = await this.prisma.employee.findMany({
      where: { companyId, OR: [{ id: manager.id }, { managerId: manager.id }] },
      select: this.employeeSelect,
      orderBy: { name: 'asc' },
    });
    const employeeIds = employees.map((employee) => employee.id);
    if (employeeIds.length === 0) return [];

    const employeeMap = new Map<string, EmployeeSummary>(employees.map((employee) => [employee.id, employee]));
    const tracks = await this.prisma.timeTrack.findMany({
      where: {
        employeeId: { in: employeeIds },
        ...(start && end ? { date: { gte: start, lt: end } } : {}),
      },
      select: this.trackSelect,
      orderBy: { date: 'asc' },
    });

    return tracks
      .map((track) => ({
        ...track,
        employee: employeeMap.get(track.employeeId) ?? null,
      }))
      .sort((a: TrackWithEmployee, b: TrackWithEmployee) => {
        const nameA = a.employee?.name ?? '';
        const nameB = b.employee?.name ?? '';
        return nameA.localeCompare(nameB, 'pt-BR') || a.date.getTime() - b.date.getTime();
      });
  }

  countForManager(companyId: string, userId: string, email?: string) {
    return this.prisma.timeTrack.count({
      where: { employee: { companyId, managerId: userId } },
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.timeTrack.findFirst({
      where: { id, employee: { companyId } },
      select: {
        ...this.trackSelect,
        employee: { select: this.employeeSelect },
      },
    });
  }

  findEmployee(companyId: string, employeeId: string) {
    return this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: { user: { select: { role: true } } },
    });
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
      include: { user: { select: { role: true } } },
    });
  }

  findByEmployeeDate(employeeId: string, date: Date) {
    return this.prisma.timeTrack.findUnique({
      where: { employeeId_date: { employeeId, date } },
      select: this.trackSelect,
    });
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

  async listPending(companyId: string) {
    const employees = await this.loadEmployees(companyId);
    const employeeIds = [...employees.keys()];
    if (employeeIds.length === 0) return [];
    const tracks = await this.prisma.timeTrack.findMany({
      where: { employeeId: { in: employeeIds }, manualStatus: 'pending' },
      select: this.trackSelect,
      orderBy: { createdAt: 'desc' },
    });
    return tracks.map((track) => ({
      ...track,
      employee: employees.get(track.employeeId) ?? null,
    }));
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

    const employees = await this.prisma.employee.findMany({
      where: { companyId, OR: [{ id: manager.id }, { managerId: manager.id }] },
      select: this.employeeSelect,
      orderBy: { name: 'asc' },
    });
    const employeeIds = employees.map((employee) => employee.id);
    if (employeeIds.length === 0) return [];

    const employeeMap = new Map<string, EmployeeSummary>(employees.map((employee) => [employee.id, employee]));
    const tracks = await this.prisma.timeTrack.findMany({
      where: { employeeId: { in: employeeIds }, manualStatus: 'pending' },
      select: this.trackSelect,
      orderBy: { createdAt: 'desc' },
    });

    return tracks.map((track) => ({
      ...track,
      employee: employeeMap.get(track.employeeId) ?? null,
    }));
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
    const message = `O funcionario ${employee.name} bateu ponto em ${dateStr} as ${time} a ${distKm}km da localizacao da empresa.`;
    const adminUserIds = await this.prisma.user.findMany({
      where: { companyId, role: { in: ['ADMIN', 'RH', 'DEV'] }, isActive: true },
      select: { id: true },
    });
    if (adminUserIds.length === 0) return;
    await this.prisma.notification.create({
      data: {
        companyId,
        type: 'URGENT_NOTICE',
        title: `Aviso de ponto fora da empresa - ${employee.name}`,
        message,
        priority: 'HIGH',
        source: 'SYSTEM',
        status: 'SENT',
        sentAt: new Date(),
        recipients: {
          create: adminUserIds.map((u) => ({ userId: u.id, status: 'UNREAD' })),
        },
      },
    });
  }

  async findHoliday(companyId: string, date: Date) {
    const [day] = date.toISOString().split('T');
    const start = new Date(`${day}T00:00:00.000Z`);
    const end = new Date(`${day}T23:59:59.999Z`);
    return this.prisma.holiday.findFirst({
      where: { companyId, date: { gte: start, lte: end } },
    });
  }


  async updateOvertimeApprovalStatus(companyId: string, id: string, status: string) {
    await this.prisma.timeTrack.updateMany({ where: { id, employee: { companyId } }, data: { overtimeApprovalStatus: status } });
    return this.findById(companyId, id);
  }

  async findWorkScheduleRule(id: string) {
    return this.prisma.workScheduleRule.findUnique({ where: { id } });
  }
}
