import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AsoService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.employeeAsoRecord.findMany({
      where: { companyId },
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { expirationDate: 'asc' },
    });
  }

  async listByEmployee(companyId: string, employeeId: string) {
    return this.prisma.employeeAsoRecord.findMany({
      where: { companyId, employeeId },
      orderBy: { examDate: 'desc' },
    });
  }

  async find(companyId: string, id: string) {
    const r = await this.prisma.employeeAsoRecord.findFirst({
      where: { id, companyId },
      include: { employee: { select: { id: true, name: true } } },
    });
    if (!r) throw new Error('NÃO ENCONTRADO');
    return r;
  }

  async getLatestByEmployee(companyId: string, employeeId: string) {
    return this.prisma.employeeAsoRecord.findFirst({
      where: { companyId, employeeId },
      orderBy: { examDate: 'desc' },
      include: { employee: { select: { id: true, name: true } } },
    });
  }

  async create(companyId: string, userId: string | undefined, data: any) {
    return this.prisma.employeeAsoRecord.create({
      data: {
        companyId,
        createdBy: userId,
        ...data,
        examDate: data.examDate ? new Date(data.examDate) : undefined,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      },
      include: { employee: { select: { id: true, name: true } } },
    });
  }

  async update(companyId: string, id: string, data: any) {
    const r = await this.prisma.employeeAsoRecord.findFirst({ where: { id, companyId } });
    if (!r) throw new Error('NÃO ENCONTRADO');
    return this.prisma.employeeAsoRecord.update({
      where: { id },
      data: {
        ...data,
        examDate: data.examDate ? new Date(data.examDate) : undefined,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      },
      include: { employee: { select: { id: true, name: true } } },
    });
  }

  async delete(companyId: string, id: string) {
    const r = await this.prisma.employeeAsoRecord.findFirst({ where: { id, companyId } });
    if (!r) throw new Error('NÃO ENCONTRADO');
    await this.prisma.employeeAsoRecord.delete({ where: { id } });
    return { ok: true };
  }

  async getRhAlerts(companyId: string) {
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setUTCDate(today.getUTCDate() + 30);

    const [allRecords, pendingAdmissionEmployees] = await Promise.all([
      this.prisma.employeeAsoRecord.findMany({
        where: { companyId, asoType: 'ADMISSIONAL' },
        include: { employee: { select: { id: true, name: true, status: true } } },
        orderBy: { expirationDate: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE', admissionDate: { gte: new Date(today.getUTCFullYear(), today.getUTCMonth(), 1) } },
        select: { id: true, name: true },
      }),
    ]);

    const expired = allRecords.filter(r => r.expirationDate && new Date(r.expirationDate) < today);
    const expiringSoon = allRecords.filter(r => r.expirationDate && new Date(r.expirationDate) >= today && new Date(r.expirationDate) <= in30Days);
    const aptoAdmissionals = new Set(allRecords.filter(r => r.asoType === 'ADMISSIONAL' && r.status === 'APTO').map(r => r.employeeId));
    const pendingAdmission = pendingAdmissionEmployees.filter(e => !aptoAdmissionals.has(e.id));
    const inapto = allRecords.filter(r => r.status === 'INAPTO');

    const items: any[] = [];

    for (const r of expired.slice(0, 10)) {
      items.push({
        type: 'ASO_EXPIRED',
        employeeId: r.employeeId,
        employeeName: r.employee?.name ?? '—',
        message: `ASO ${r.asoType.toLowerCase()} vencido em ${fmtDate(r.expirationDate)}`,
        target: '/dashboard/management?tab=aso',
      });
    }

    for (const r of expiringSoon.slice(0, 10)) {
      const days = Math.ceil((new Date(r.expirationDate!).getTime() - today.getTime()) / 86400000);
      items.push({
        type: 'ASO_EXPIRING',
        employeeId: r.employeeId,
        employeeName: r.employee?.name ?? '—',
        message: `ASO ${r.asoType.toLowerCase()} vence em ${days} dia(s) (${fmtDate(r.expirationDate)})`,
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
        message: `Funcionário inapto no ASO ${r.asoType.toLowerCase()}`,
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
  }
}

function fmtDate(v?: string | Date | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-BR');
}