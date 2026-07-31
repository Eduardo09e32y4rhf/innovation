import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VacationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.vacation.findMany({
      where: { employee: { companyId } },
      include: { employee: true, entitlement: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listByEmployee(companyId: string, employeeId: string) {
    return this.prisma.vacation.findMany({
      where: { employeeId, employee: { companyId } },
      include: { entitlement: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.vacation.findFirst({
      where: { id, employee: { companyId } },
      include: { employee: true, entitlement: true, payments: true, auditLogs: { orderBy: { createdAt: 'desc' } } },
    });
  }

  findCompany(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        legalName: true,
        document: true,
        phone: true,
        email: true,
        address: true,
        street: true,
        streetNumber: true,
        neighborhood: true,
        city: true,
        state: true,
        zipCode: true,
      },
    });
  }

  createGeneratedDocument(data: {
    companyId: string;
    title: string;
    storageKey: string;
    sha256: string;
    sizeBytes: number;
    metadata: Record<string, unknown>;
    createdBy?: string;
  }) {
    const metadata = JSON.parse(JSON.stringify(data.metadata)) as Prisma.InputJsonValue;
    return this.prisma.generatedDocument.create({
      data: {
        ...data,
        metadata,
        type: 'PAYSLIP',
      },
    });
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

  async listForManager(companyId: string, userId: string, email?: string) {
    const manager = await this.findEmployeeByUserId(companyId, userId, email);
    if (!manager) return [];
    return this.prisma.vacation.findMany({
      where: { employee: { companyId, OR: [{ id: manager.id }, { managerId: manager.id }] } },
      include: { employee: true, entitlement: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForEmployee(companyId: string, userId: string, email?: string) {
    const employee = await this.findEmployeeByUserId(companyId, userId, email);
    if (!employee) return [];
    return this.prisma.vacation.findMany({
      where: { employeeId: employee.id },
      include: { employee: true, entitlement: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: any) {
    return this.prisma.vacation.create({ data });
  }

  reserveAndCreate(data: {
    employeeId: string;
    acquisitionPeriod: string;
    startDate: Date;
    endDate: Date;
    daysUsed: number;
    soldDays: number;
    paymentDueDate: Date;
    observation?: string;
    actorUserId: string;
    entitlement: {
      acquisitionStart: Date;
      acquisitionEnd: Date;
      concessionStart: Date;
      concessionEnd: Date;
      entitledDays: number;
      unjustifiedAbsences: number;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const entitlement = await tx.vacationEntitlement.upsert({
        where: {
          employeeId_acquisitionStart_acquisitionEnd: {
            employeeId: data.employeeId,
            acquisitionStart: data.entitlement.acquisitionStart,
            acquisitionEnd: data.entitlement.acquisitionEnd,
          },
        },
        create: {
          employeeId: data.employeeId,
          ...data.entitlement,
        },
        update: {
          entitledDays: data.entitlement.entitledDays,
          unjustifiedAbsences: data.entitlement.unjustifiedAbsences,
          concessionStart: data.entitlement.concessionStart,
          concessionEnd: data.entitlement.concessionEnd,
        },
      });
      const requestedTotal = data.daysUsed + data.soldDays;
      const available = entitlement.entitledDays - entitlement.usedDays - entitlement.soldDays - entitlement.reservedDays;
      if (requestedTotal > available) {
        throw new Error(`VACATION_BALANCE:${available}`);
      }
      const updatedEntitlement = await tx.vacationEntitlement.update({
        where: { id: entitlement.id },
        data: { reservedDays: { increment: requestedTotal } },
      });
      const vacation = await tx.vacation.create({
        data: {
          employeeId: data.employeeId,
          entitlementId: entitlement.id,
          acquisitionPeriod: data.acquisitionPeriod,
          startDate: data.startDate,
          endDate: data.endDate,
          daysUsed: data.daysUsed,
          soldDays: data.soldDays,
          paymentDueDate: data.paymentDueDate,
          observation: data.observation,
        },
        include: { entitlement: true, payments: true },
      });
      await tx.vacationAuditLog.create({
        data: {
          vacationId: vacation.id,
          entitlementId: entitlement.id,
          action: 'REQUEST_CREATED',
          after: {
            daysUsed: data.daysUsed,
            soldDays: data.soldDays,
            reservedDays: updatedEntitlement.reservedDays,
          },
          actorUserId: data.actorUserId,
        },
      });
      return vacation;
    }, { isolationLevel: 'Serializable' });
  }

  updateStatus(companyId: string, id: string, data: any) {
    return this.prisma.vacation.updateMany({ where: { id, employee: { companyId } }, data });
  }

  updateStatusWithLedger(
    companyId: string,
    id: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED',
    observation: string | undefined,
    actorUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const vacation = await tx.vacation.findFirst({
        where: { id, employee: { companyId } },
        include: { entitlement: true },
      });
      if (!vacation) return null;
      const beforeStatus = vacation.status;
      const total = vacation.daysUsed + vacation.soldDays;
      if (vacation.entitlementId && beforeStatus !== status) {
        const data: Record<string, unknown> = {};
        const wasReserved = beforeStatus === 'PENDING';
        const becomesConsumed = status === 'APPROVED' || status === 'COMPLETED';
        const wasConsumed = beforeStatus === 'APPROVED' || beforeStatus === 'COMPLETED';
        const becomesReleased = status === 'REJECTED' || status === 'CANCELLED';

        if (wasReserved && becomesConsumed) {
          data.reservedDays = { decrement: total };
          data.usedDays = { increment: vacation.daysUsed };
          data.soldDays = { increment: vacation.soldDays };
        } else if (wasReserved && becomesReleased) {
          data.reservedDays = { decrement: total };
        } else if (wasConsumed && becomesReleased) {
          data.usedDays = { decrement: vacation.daysUsed };
          data.soldDays = { decrement: vacation.soldDays };
        }
        if (Object.keys(data).length) {
          await tx.vacationEntitlement.update({ where: { id: vacation.entitlementId }, data });
        }
      }
      const updated = await tx.vacation.update({
        where: { id },
        data: { status, ...(observation === undefined ? {} : { observation }) },
        include: { employee: true, entitlement: true, payments: true },
      });
      if (updated.entitlement) {
        const consumedDays = updated.entitlement.usedDays + updated.entitlement.soldDays;
        await tx.vacationEntitlement.update({
          where: { id: updated.entitlement.id },
          data: {
            status: consumedDays >= updated.entitlement.entitledDays ? 'EXHAUSTED' : 'OPEN',
          },
        });
      }
      await tx.vacationAuditLog.create({
        data: {
          vacationId: id,
          entitlementId: vacation.entitlementId,
          action: 'STATUS_CHANGED',
          before: { status: beforeStatus },
          after: { status },
          reason: observation,
          actorUserId,
        },
      });
      return updated;
    }, { isolationLevel: 'Serializable' });
  }

  listEntitlements(companyId: string, employeeId: string) {
    return this.prisma.vacationEntitlement.findMany({
      where: { employeeId, employee: { companyId } },
      include: { vacations: { orderBy: { startDate: 'desc' } } },
      orderBy: { acquisitionStart: 'desc' },
    });
  }

  findEntitlement(companyId: string, employeeId: string, acquisitionStart: Date, acquisitionEnd: Date) {
    return this.prisma.vacationEntitlement.findFirst({
      where: { employeeId, acquisitionStart, acquisitionEnd, employee: { companyId } },
      include: {
        vacations: {
          where: { status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] } },
          orderBy: { startDate: 'asc' },
        },
      },
    });
  }

  recordPayment(companyId: string, vacationId: string, data: {
    amount: number;
    dueDate: Date;
    paidAt?: Date;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    paymentMethod?: string;
    reference?: string;
    actorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const vacation = await tx.vacation.findFirst({ where: { id: vacationId, employee: { companyId } } });
      if (!vacation) return null;
      const payment = await tx.vacationPayment.create({
        data: {
          vacationId,
          amount: data.amount,
          dueDate: data.dueDate,
          paidAt: data.paidAt,
          status: data.status,
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          createdByUserId: data.actorUserId,
        },
      });
      if (data.status === 'PAID') {
        await tx.vacation.update({ where: { id: vacationId }, data: { paidAt: data.paidAt ?? new Date() } });
      }
      await tx.vacationAuditLog.create({
        data: {
          vacationId,
          entitlementId: vacation.entitlementId,
          action: 'PAYMENT_RECORDED',
          after: { paymentId: payment.id, amount: data.amount, status: data.status },
          actorUserId: data.actorUserId,
        },
      });
      return payment;
    });
  }

  listMedicalCertificates(companyId: string, employeeId?: string) {
    return this.prisma.medicalCertificate.findMany({
      where: { companyId, ...(employeeId ? { employeeId } : {}) },
      include: { employee: { select: { id: true, name: true, registration: true } } },
      orderBy: { startAt: 'desc' },
    });
  }

  createMedicalCertificate(data: {
    companyId: string;
    employeeId: string;
    certificateType: 'FULL_DAY' | 'HOURS' | 'DAYS';
    startAt: Date;
    endAt: Date;
    coveredMinutes: number;
    issueDate: Date;
    issuerName?: string;
    issuerRegistration?: string;
    documentId?: string;
    createdByUserId: string;
  }) {
    return this.prisma.medicalCertificate.create({ data });
  }

  findMedicalCertificate(companyId: string, id: string) {
    return this.prisma.medicalCertificate.findFirst({ where: { id, companyId } });
  }

  updateMedicalCertificateStatus(companyId: string, id: string, data: {
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
    rejectionReason?: string;
    reviewedByUserId: string;
    reviewedAt: Date;
  }) {
    return this.prisma.medicalCertificate.updateMany({ where: { id, companyId }, data });
  }

  listTimeTracksInPeriod(companyId: string, employeeId: string, start: Date, end: Date) {
    return this.prisma.timeTrack.findMany({
      where: { companyId, employeeId, date: { gte: start, lt: end } },
      select: { date: true, entry: true, manualStatus: true },
      orderBy: { date: 'asc' },
    });
  }

  findOverlapping(companyId: string, employeeId: string, startDate: Date, endDate: Date) {
    return this.prisma.vacation.findFirst({
      where: {
        employeeId,
        employee: { companyId },
        status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }
}
