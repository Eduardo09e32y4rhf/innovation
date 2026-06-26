import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AsoService {
  constructor(private readonly prisma: PrismaService) {}

  private safeLog(scope: string, err: unknown) {
    console.error(`[AsoService] ${scope}`, err);
  }

  async list(companyId: string) {
    try {
      return await this.prisma.employeeAsoRecord.findMany({
        where: { companyId },
        include: { employee: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      });
    } catch (err) {
      this.safeLog('list fallback', err);
      return [];
    }
  }

  async listByEmployee(companyId: string, employeeId: string) {
    try {
      return await this.prisma.employeeAsoRecord.findMany({
        where: { companyId, employeeId },
        orderBy: { examDate: 'desc' },
      });
    } catch (err) {
      this.safeLog('listByEmployee fallback', err);
      return [];
    }
  }

  async find(companyId: string, id: string) {
    try {
      return await this.prisma.employeeAsoRecord.findFirst({
        where: { id, companyId },
        include: { employee: { select: { id: true, name: true } } },
      });
    } catch (err) {
      this.safeLog('find fallback', err);
      return null;
    }
  }

  async getLatestByEmployee(companyId: string, employeeId: string) {
    try {
      return await this.prisma.employeeAsoRecord.findFirst({
        where: { companyId, employeeId },
        orderBy: { examDate: 'desc' },
        include: { employee: { select: { id: true, name: true } } },
      });
    } catch (err) {
      this.safeLog('getLatestByEmployee fallback', err);
      return null;
    }
  }

  async create(companyId: string, userId: string | undefined, data: any) {
    try {
      return await this.prisma.employeeAsoRecord.create({
        data: {
          companyId,
          createdBy: userId,
          employeeId: data.employeeId,
          asoType: data.asoType ?? 'ADMISSIONAL',
          status: data.status ?? 'PENDING',
          examDate: data.examDate ? new Date(data.examDate) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          clinicName: data.clinicName,
          doctorName: data.doctorName,
           documentNumber: data.documentNumber,
           notes: data.notes,
        },
        include: { employee: { select: { id: true, name: true } } },
      });
    } catch (err) {
      this.safeLog('create fallback', err);
      return { ok: false };
    }
  }

  async update(companyId: string, id: string, data: any) {
    try {
      return await this.prisma.employeeAsoRecord.update({
        where: { id },
        data: {
          ...data,
          examDate: data.examDate ? new Date(data.examDate) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        },
        include: { employee: { select: { id: true, name: true } } },
      });
    } catch (err) {
      this.safeLog('update fallback', err);
      return { ok: false };
    }
  }

  async delete(companyId: string, id: string) {
    try {
      await this.prisma.employeeAsoRecord.delete({ where: { id } });
    } catch (err) {
      this.safeLog('delete fallback', err);
    }
    return { ok: true };
  }

  async getRhAlerts(companyId: string) {
    try {
      const today = new Date();
      const in30Days = new Date(today);
      in30Days.setUTCDate(today.getUTCDate() + 30);

      const [allRecords, pendingAdmissionEmployees] = await Promise.all([
        this.prisma.employeeAsoRecord.findMany({
          where: { companyId },
          include: { employee: { select: { id: true, name: true, status: true } } },
          orderBy: { dueDate: 'asc' },
        }),
        this.prisma.employee.findMany({
          where: { companyId, status: 'ACTIVE', admissionDate: { gte: new Date(today.getUTCFullYear(), today.getUTCMonth(), 1) } },
          select: { id: true, name: true },
        }),
      ]);

      const expired = allRecords.filter(r => r.dueDate && new Date(r.dueDate) < today);
      const expiringSoon = allRecords.filter(r => r.dueDate && new Date(r.dueDate) >= today && new Date(r.dueDate) <= in30Days);
      const completedAdmissionals = new Set(allRecords.filter(r => r.asoType === 'ADMISSIONAL' && r.status === 'COMPLETED').map(r => r.employeeId));
      const pendingAdmission = pendingAdmissionEmployees.filter(e => !completedAdmissionals.has(e.id));
      const inapto = allRecords.filter(r => r.status === 'EXPIRED');

      const items: any[] = [];

      for (const r of expired.slice(0, 10)) {
        items.push({
          type: 'ASO_EXPIRED',
          employeeId: r.employeeId,
          employeeName: r.employee?.name ?? '—',
          message: `ASO ${r.asoType.toLowerCase()} vencido em ${fmtDate(r.dueDate)}`,
          target: '/dashboard/management?tab=aso',
        });
      }

      for (const r of expiringSoon.slice(0, 10)) {
        const days = Math.ceil((new Date(r.dueDate!).getTime() - today.getTime()) / 86400000);
        items.push({
          type: 'ASO_EXPIRING',
          employeeId: r.employeeId,
          employeeName: r.employee?.name ?? '—',
          message: `ASO ${r.asoType.toLowerCase()} vence em ${days} dia(s) (${fmtDate(r.dueDate)})`,
          target: '/dashboard/management?tab=aso',
        });
      }

      for (const e of pendingAdmission.slice(0, 10)) {
        items.push({
          type: 'ASO_ADMISSION_PENDING',
          employeeId: e.id,
          employeeName: e.name,
          message: 'Funcionário sem ASO admissional apto',
          target: '/dashboard/employees',
        });
      }

      for (const r of inapto.slice(0, 10)) {
        items.push({
          type: 'ASO_INAPTO',
          employeeId: r.employeeId,
          employeeName: r.employee?.name ?? '—',
          message: `Funcionário com ASO vencido no ${r.asoType.toLowerCase()}`,
          target: '/dashboard/management?tab=aso',
        });
      }

      return {
        asoExpired: expired.length,
        asoExpiringSoon: expiringSoon.length,
        pendingAdmissionAso: pendingAdmission.length,
        inaptoCount: inapto.length,
        items,
      };
    } catch (err) {
      this.safeLog('getRhAlerts fallback', err);
      return { asoExpired: 0, asoExpiringSoon: 0, pendingAdmissionAso: 0, inaptoCount: 0, items: [] };
    }
  }
}

function fmtDate(v?: string | Date | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-BR');
}