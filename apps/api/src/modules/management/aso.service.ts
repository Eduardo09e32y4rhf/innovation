import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AsoService {
  constructor(private readonly prisma: PrismaService) {}

  private safeLog(scope: string, err: unknown) {
    console.error(`[AsoService] ${scope}`, err);
  }

  private async triggerPeriodicAso(companyId: string) {
    try {
      const today = new Date();
      const expired = await this.prisma.employeeAsoRecord.findMany({
        where: { companyId, status: 'COMPLETED', dueDate: { lte: today } },
        include: { employee: true }
      });
      for (const record of expired) {
        const existing = await this.prisma.employeeAsoRecord.findFirst({
          where: { companyId, employeeId: record.employeeId, asoType: 'PERIODICO', createdAt: { gt: record.createdAt } }
        });
        if (!existing) {
          await this.prisma.employeeAsoRecord.create({
            data: {
              companyId,
              employeeId: record.employeeId,
              asoType: 'PERIODICO',
              status: 'PENDING',
            }
          });
          await this.prisma.notification.create({
            data: {
              companyId,
              title: `⚕️ ASO Periódico Pendente`,
              message: `Um novo ASO de rotina (periódico) foi gerado automaticamente após 12 meses do último exame. Agende o quanto antes para evitar irregularidades.`,
              type: 'SYSTEM_NOTICE',
              status: 'SENT',
              targetType: 'ALL',
            }
          });
        }
      }
    } catch (err) {
      this.safeLog('triggerPeriodicAso', err);
    }
  }

  async list(companyId: string) {
    try {
      await this.triggerPeriodicAso(companyId);
      return await this.prisma.employeeAsoRecord.findMany({
        where: { companyId },
        include: {
          employee: {
            select: {
              id: true, name: true, cpf: true, position: true, admissionDate: true,
              department: true,
            }
          }
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
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
        include: {
          employee: {
            select: {
              id: true, name: true, cpf: true, position: true, admissionDate: true, department: true,
            }
          }
        },
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
      // Se exame foi feito e não há vencimento, calcula 12 meses
      let dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
      if (!dueDate && data.examDate && (data.status === 'COMPLETED' || data.status === 'APTO')) {
        const exam = new Date(data.examDate);
        dueDate = new Date(exam);
        dueDate.setFullYear(dueDate.getFullYear() + 1);
      }

      const record = await this.prisma.employeeAsoRecord.create({
        data: {
          companyId,
          createdBy: userId,
          employeeId: data.employeeId,
          asoType: data.asoType ?? 'ADMISSIONAL',
          status: data.status === 'PENDENTE' ? 'PENDING' : data.status ?? 'PENDING',
          examDate: data.examDate ? new Date(data.examDate) : undefined,
          dueDate,
          clinicName: data.clinicName,
          doctorName: data.doctorName,
          documentNumber: data.documentNumber,
          observation: data.notes ?? data.observation,
        },
        include: { employee: { select: { id: true, name: true } } },
      });

      // Dispara notificação quando ASO é criado como pendente
      if (record && (data.status === 'PENDENTE' || data.status === 'PENDING' || !data.status)) {
        const typeLabel: Record<string, string> = {
          ADMISSIONAL: 'Admissional', DEMISSIONAL: 'Demissional', PERIODICO: 'Periódico (Rotina)',
          RETORNO_AO_TRABALHO: 'Retorno ao Trabalho', MUDANCA_DE_FUNCAO: 'Mudança de Função', COMPLEMENTAR: 'Complementar',
        };
        const label = typeLabel[data.asoType] ?? data.asoType;
        await this.prisma.notification.create({
          data: {
            companyId,
            title: `🏥 ASO Pendente: ${record.employee?.name ?? 'Funcionário'}`,
            message: `ASO ${label} aguarda agendamento. Preencha os dados da clínica e emita o encaminhamento.`,
            type: 'RH_NOTICE',
            status: 'SENT',
            targetType: 'ALL',
          }
        }).catch(() => {});
      }

      // Salva preset de clínica automaticamente se fornecido
      if (data.clinicName && data.saveClinicPreset) {
        await this.upsertClinicPreset(companyId, {
          name: data.clinicName,
          cep: data.clinicCep,
          address: data.clinicAddress,
          city: data.clinicCity,
          state: data.clinicState,
          phone: data.clinicPhone,
          doctorName: data.doctorName,
        });
      }

      return record;
    } catch (err) {
      this.safeLog('create fallback', err);
      return { ok: false };
    }
  }

  async update(companyId: string, id: string, data: any) {
    try {
      // Automação 12 meses a partir da data do exame
      let dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
      if (!dueDate && (data.status === 'COMPLETED' || data.status === 'APTO')) {
        const base = data.examDate ? new Date(data.examDate) : new Date();
        dueDate = new Date(base);
        dueDate.setFullYear(dueDate.getFullYear() + 1);
      }

      const record = await this.prisma.employeeAsoRecord.update({
        where: { id },
        data: {
          ...data,
          status: data.status === 'PENDENTE' ? 'PENDING' : data.status,
          examDate: data.examDate ? new Date(data.examDate) : undefined,
          dueDate,
          // Campos extras do preset não são campos do modelo
          saveClinicPreset: undefined,
          clinicCep: undefined,
          clinicAddress: undefined,
          clinicCity: undefined,
          clinicState: undefined,
          clinicPhone: undefined,
        },
        include: { employee: { select: { id: true, name: true } } },
      });

      // Salva preset de clínica se solicitado
      if (data.clinicName && data.saveClinicPreset) {
        await this.upsertClinicPreset(companyId, {
          name: data.clinicName,
          cep: data.clinicCep,
          address: data.clinicAddress,
          city: data.clinicCity,
          state: data.clinicState,
          phone: data.clinicPhone,
          doctorName: data.doctorName,
        });
      }

      return record;
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

  // ─── CLINIC PRESETS ──────────────────────────────────────────────────────────

  async listClinicPresets(companyId: string) {
    try {
      return await this.prisma.asoClinicPreset.findMany({
        where: { companyId, active: true },
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      this.safeLog('listClinicPresets', err);
      return [];
    }
  }

  async upsertClinicPreset(companyId: string, data: {
    name: string; cep?: string; address?: string; city?: string; state?: string; phone?: string; doctorName?: string;
  }) {
    try {
      const existing = await this.prisma.asoClinicPreset.findFirst({
        where: { companyId, name: data.name }
      });
      if (existing) {
        return await this.prisma.asoClinicPreset.update({
          where: { id: existing.id },
          data: { ...data, active: true },
        });
      }
      return await this.prisma.asoClinicPreset.create({
        data: { companyId, ...data },
      });
    } catch (err) {
      this.safeLog('upsertClinicPreset', err);
      return null;
    }
  }

  async createClinicPreset(companyId: string, data: any) {
    try {
      return await this.prisma.asoClinicPreset.create({
        data: { companyId, ...data },
      });
    } catch (err) {
      this.safeLog('createClinicPreset', err);
      return { ok: false };
    }
  }

  async deleteClinicPreset(companyId: string, id: string) {
    try {
      await this.prisma.asoClinicPreset.delete({ where: { id } });
    } catch (err) {
      this.safeLog('deleteClinicPreset', err);
    }
    return { ok: true };
  }

  // ─── RH ALERTS ───────────────────────────────────────────────────────────────

  async getRhAlerts(companyId: string) {
    try {
      await this.triggerPeriodicAso(companyId);
      const today = new Date();
      const in30Days = new Date(today);
      in30Days.setUTCDate(today.getUTCDate() + 30);

      const allRecords = await this.prisma.employeeAsoRecord.findMany({
        where: { companyId },
        include: { employee: { select: { id: true, name: true, status: true } } },
        orderBy: { dueDate: 'asc' },
      });

      const expired = allRecords.filter(r => r.dueDate && new Date(r.dueDate) < today && !['CANCELLED'].includes(r.status));
      const expiringSoon = allRecords.filter(r => r.dueDate && new Date(r.dueDate) >= today && new Date(r.dueDate) <= in30Days);
      const pending = allRecords.filter(r => r.status === 'PENDING');
      const inapto = allRecords.filter(r => r.status === 'EXPIRED');

      const items: any[] = [];

      for (const r of pending.slice(0, 15)) {
        const typeLabel: Record<string, string> = {
          ADMISSIONAL: 'Admissional', DEMISSIONAL: 'Demissional', PERIODICO: 'Periódico',
          RETORNO_AO_TRABALHO: 'Retorno ao Trabalho', MUDANCA_DE_FUNCAO: 'Mudança de Função', COMPLEMENTAR: 'Complementar',
        };
        items.push({
          type: 'ASO_PENDING',
          employeeId: r.employeeId,
          employeeName: r.employee?.name ?? '—',
          asoType: r.asoType,
          message: `ASO ${typeLabel[r.asoType] ?? r.asoType} pendente de agendamento`,
          target: '/dashboard/management?tab=aso',
          urgency: r.asoType === 'DEMISSIONAL' ? 'high' : 'medium',
        });
      }

      for (const r of expired.slice(0, 10)) {
        items.push({
          type: 'ASO_EXPIRED',
          employeeId: r.employeeId,
          employeeName: r.employee?.name ?? '—',
          asoType: r.asoType,
          message: `ASO ${r.asoType.toLowerCase()} vencido em ${fmtDate(r.dueDate)}`,
          target: '/dashboard/management?tab=aso',
          urgency: 'high',
        });
      }

      for (const r of expiringSoon.slice(0, 10)) {
        const days = Math.ceil((new Date(r.dueDate!).getTime() - today.getTime()) / 86400000);
        items.push({
          type: 'ASO_EXPIRING',
          employeeId: r.employeeId,
          employeeName: r.employee?.name ?? '—',
          asoType: r.asoType,
          message: `ASO ${r.asoType.toLowerCase()} vence em ${days} dia(s) (${fmtDate(r.dueDate)})`,
          target: '/dashboard/management?tab=aso',
          urgency: 'medium',
        });
      }

      for (const r of inapto.slice(0, 10)) {
        items.push({
          type: 'ASO_INAPTO',
          employeeId: r.employeeId,
          employeeName: r.employee?.name ?? '—',
          asoType: r.asoType,
          message: `Funcionário com ASO ${r.asoType.toLowerCase()} - resultado INAPTO`,
          target: '/dashboard/management?tab=aso',
          urgency: 'high',
        });
      }

      return {
        asoExpired: expired.length,
        asoExpiringSoon: expiringSoon.length,
        pendingAdmissionAso: pending.filter(r => r.asoType === 'ADMISSIONAL').length,
        pendingTotal: pending.length,
        inaptoCount: inapto.length,
        items,
      };
    } catch (err) {
      this.safeLog('getRhAlerts fallback', err);
      return { asoExpired: 0, asoExpiringSoon: 0, pendingAdmissionAso: 0, pendingTotal: 0, inaptoCount: 0, items: [] };
    }
  }
}

function fmtDate(v?: string | Date | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-BR');
}