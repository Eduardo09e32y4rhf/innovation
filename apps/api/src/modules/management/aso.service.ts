import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_PANEL_PASSWORD = process.env.DEFAULT_EMPLOYEE_PASSWORD ?? 'Innovation@123';

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
      const employee = await this.prisma.employee.findFirst({
        where: { companyId, id: data.employeeId },
        select: { id: true },
      });
      if (!employee) throw new NotFoundException('Funcionário não encontrado.');
      const status = this.normalizeStatus(data.status);
      const result = this.normalizeResult(data.result);
      this.validateCompletion(status, result);
      // Se exame foi feito e não há vencimento, calcula 12 meses
      let dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
      if (!dueDate && data.examDate && status === 'COMPLETED') {
        const exam = new Date(data.examDate);
        dueDate = new Date(exam);
        dueDate.setFullYear(dueDate.getFullYear() + 1);
      }

      const record = await this.prisma.$transaction(async (tx) => {
        const created = await tx.employeeAsoRecord.create({
          data: {
            companyId,
            createdBy: userId,
            employeeId: data.employeeId,
            asoType: data.asoType ?? 'ADMISSIONAL',
            status,
            result,
            examDate: data.examDate ? new Date(data.examDate) : undefined,
            dueDate,
            clinicName: data.clinicName,
            doctorName: data.doctorName,
            documentNumber: data.documentNumber,
            observation: data.notes ?? data.observation,
            completedBy: status === 'COMPLETED' ? userId : undefined,
            completedAt: status === 'COMPLETED' ? new Date() : undefined,
          },
          include: { employee: { select: { id: true, name: true } } },
        });
        await this.activateOnboardingEmployee(tx, companyId, created.employeeId, created.asoType, status, result);
        return created;
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
      this.safeLog('create', err);
      throw err;
    }
  }

  async update(companyId: string, id: string, userId: string | undefined, data: any) {
    try {
      const current = await this.prisma.employeeAsoRecord.findFirst({ where: { companyId, id } });
      if (!current) throw new NotFoundException('ASO não encontrado.');
      const status = data.status ? this.normalizeStatus(data.status) : current.status;
      const result = data.result !== undefined ? this.normalizeResult(data.result) : current.result;
      this.validateCompletion(status, result);
      // Automação 12 meses a partir da data do exame
      let dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
      if (!dueDate && status === 'COMPLETED') {
        const base = data.examDate ? new Date(data.examDate) : new Date();
        dueDate = new Date(base);
        dueDate.setFullYear(dueDate.getFullYear() + 1);
      }

      const record = await this.prisma.$transaction(async (tx) => {
        const {
          saveClinicPreset: _saveClinicPreset,
          clinicCep: _clinicCep,
          clinicAddress: _clinicAddress,
          clinicCity: _clinicCity,
          clinicState: _clinicState,
          clinicPhone: _clinicPhone,
          employeeId: _employeeId,
          ...editable
        } = data;
        const updated = await tx.employeeAsoRecord.update({
          where: { id },
          data: {
            ...editable,
            status,
            result,
            updatedBy: userId,
            completedBy: status === 'COMPLETED' ? userId : null,
            completedAt: status === 'COMPLETED' ? current.completedAt || new Date() : null,
            examDate: data.examDate ? new Date(data.examDate) : undefined,
            dueDate,
          },
          include: { employee: { select: { id: true, name: true } } },
        });
        await this.activateOnboardingEmployee(tx, companyId, updated.employeeId, updated.asoType, status, result);
        return updated;
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
      this.safeLog('update', err);
      throw err;
    }
  }

  private normalizeStatus(value?: string) {
    if (!value || value === 'PENDENTE') return 'PENDING' as const;
    if (value === 'CANCELADO') return 'CANCELLED' as const;
    if (value === 'APTO') return 'COMPLETED' as const;
    const allowed = [
      'PENDING', 'SCHEDULED', 'COMPLETED', 'NEAR_EXPIRATION', 'EXPIRED',
      'CANCELLED', 'WAITING_DOCUMENT', 'WAITING_ADDITIONAL_EXAM',
    ];
    if (!allowed.includes(value)) throw new BadRequestException('Status de ASO inválido.');
    return value as any;
  }

  private normalizeResult(value?: string | null) {
    if (value === null || value === undefined || value === '') return null;
    const normalized = String(value).toUpperCase();
    if (!['APTO', 'INAPTO'].includes(normalized)) {
      throw new BadRequestException('Resultado do ASO deve ser APTO ou INAPTO.');
    }
    return normalized as 'APTO' | 'INAPTO';
  }

  private validateCompletion(status: string, result: string | null) {
    if (status === 'COMPLETED' && !result) {
      throw new BadRequestException('Informe se o resultado do ASO foi APTO ou INAPTO.');
    }
  }

  private async activateOnboardingEmployee(tx: any, companyId: string, employeeId: string, asoType: string, status: string, result: string | null) {
    if (asoType !== 'ADMISSIONAL' || status !== 'COMPLETED' || result !== 'APTO') return;
    const transition = await tx.employee.updateMany({
      where: { companyId, id: employeeId, status: 'ONBOARDING' },
      data: { status: 'ACTIVE' },
    });
    if (!transition.count) return;

    const employee = await tx.employee.findFirst({ where: { companyId, id: employeeId } });
    if (employee?.email && !employee.userId) {
      const email = employee.email.trim().toLowerCase();
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (!existingUser) {
        const user = await tx.user.create({
          data: {
            companyId,
            name: employee.name,
            email,
            role: 'FUNCIONARIO',
            passwordHash: await bcrypt.hash(DEFAULT_PANEL_PASSWORD, 12),
            forcePasswordChange: true,
            isActive: true,
          },
        });
        await tx.employee.update({ where: { id: employeeId }, data: { userId: user.id } });
      } else if (existingUser.companyId === companyId) {
        await tx.user.update({ where: { id: existingUser.id }, data: { isActive: true } });
        await tx.employee.update({ where: { id: employeeId }, data: { userId: existingUser.id } });
      }
    }

    await tx.notification.create({
      data: {
        companyId,
        title: `Admissão concluída: ${employee?.name ?? 'Colaborador'}`,
        message: 'ASO admissional concluído com resultado Apto. O colaborador foi ativado e está liberado para os módulos operacionais.',
        type: 'RH_NOTICE',
        status: 'SENT',
        targetType: 'ALL',
      },
    });
  }

  async delete(companyId: string, id: string) {
    const record = await this.prisma.employeeAsoRecord.findFirst({ where: { companyId, id }, select: { id: true } });
    if (!record) throw new NotFoundException('ASO não encontrado.');
    await this.prisma.employeeAsoRecord.delete({ where: { id: record.id } });
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
