import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import {
  ANONYMIZE_CONFIRMATION, ERASABLE_EMPLOYEE_FIELDS, ERASURE_DEADLINE_DAYS, RETAINED_DATA, retainUntil, sanitizeExport,
} from './data-subject.rules';

const AUDIT_LIMIT = 2000;

@Injectable()
export class DataSubjectService {
  constructor(private readonly prisma: PrismaService) {}

  async exportMe(actor: JwtUser) {
    const employee = await this.prisma.employee.findFirst({ where: { userId: actor.sub, companyId: actor.companyId }, select: { id: true } });
    const data = await this.collect(actor.companyId, employee?.id ?? null, actor.sub);
    await this.audit(actor, 'LGPD_EXPORT_SELF', 'User', actor.sub);
    return data;
  }

  async exportEmployee(actor: JwtUser, employeeId: string) {
    const employee = await this.findEmployee(actor.companyId, employeeId);
    const data = await this.collect(actor.companyId, employee.id, employee.userId);
    await this.audit(actor, 'LGPD_EXPORT_EMPLOYEE', 'Employee', employee.id);
    return data;
  }

  async requestErasure(actor: JwtUser, reason?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId: actor.sub, companyId: actor.companyId }, select: { id: true } });
    const log = await this.audit(actor, 'LGPD_ERASURE_REQUEST', employee ? 'Employee' : 'User', employee?.id ?? actor.sub, {
      reason: reason?.slice(0, 1000) ?? null,
    });
    const due = new Date(Date.now() + ERASURE_DEADLINE_DAYS * 86_400_000);
    return {
      protocol: log.id,
      dueDate: due.toISOString().slice(0, 10),
      message: `Pedido registrado. A empresa responderá em até ${ERASURE_DEADLINE_DAYS} dias (LGPD art. 19, II). Dados sujeitos a obrigação legal serão conservados (art. 16, I) e o restante anonimizado após o desligamento.`,
      retained: RETAINED_DATA,
    };
  }

  async anonymizeEmployee(actor: JwtUser, employeeId: string, confirm?: string) {
    if (confirm !== ANONYMIZE_CONFIRMATION) throw new BadRequestException(`Confirme enviando { "confirm": "${ANONYMIZE_CONFIRMATION}" }.`);
    const employee = await this.findEmployee(actor.companyId, employeeId);
    if (employee.status !== 'TERMINATED') {
      throw new ForbiddenException('Só é possível anonimizar funcionário desligado: durante o contrato os dados são necessários à execução (LGPD art. 7º, V).');
    }
    if (employee.userId === actor.sub) throw new ForbiddenException('Você não pode anonimizar o próprio cadastro.');

    const cleared = Object.fromEntries(ERASABLE_EMPLOYEE_FIELDS.map((f) => [f, null]));
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({ where: { id: employee.id }, data: cleared });
      await tx.faceEnrollment.deleteMany({ where: { employeeId: employee.id } });
      if (employee.userId) {
        await tx.refreshSession.deleteMany({ where: { userId: employee.userId } });
        await tx.user.update({
          where: { id: employee.userId },
          data: {
            email: `anonimizado-${employee.userId}@anonimizado.invalid`,
            passwordHash: randomBytes(32).toString('hex'),
            isActive: false,
            blockedAt: new Date(),
            blockedReason: 'LGPD: titular anonimizado',
            mfaSecretEnc: null,
            mfaRecoveryHashes: [],
            resetPasswordCode: null,
            resetPasswordExpires: null,
          },
        });
      }
    });
    await this.audit(actor, 'LGPD_ANONYMIZE_EMPLOYEE', 'Employee', employee.id, { erasedFields: ERASABLE_EMPLOYEE_FIELDS, biometricsDeleted: true });

    return {
      employeeId: employee.id,
      erased: [...ERASABLE_EMPLOYEE_FIELDS, 'biometria facial (dado sensível, art. 11)', 'e-mail e acesso do usuário'],
      retained: RETAINED_DATA,
      retainUntil: retainUntil(employee.terminationDate),
    };
  }

  private async findEmployee(companyId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId },
      select: { id: true, userId: true, status: true, terminationDate: true },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');
    return employee;
  }

  private async collect(companyId: string, employeeId: string | null, userId: string | null) {
    const [user, employee, auditTrail] = await Promise.all([
      userId ? this.prisma.user.findFirst({
        where: { id: userId, companyId },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastActiveAt: true, emailVerifiedAt: true, mfaEnabledAt: true },
      }) : null,
      employeeId ? this.prisma.employee.findFirst({
        where: { id: employeeId, companyId },
        include: {
          timeTracks: true, timeRecords: true, vacations: true, vacationEntitlements: true, timeClosings: true,
          overtimeBank: true, medicalCertificates: true, asoRecords: true, promotions: true, managementEvents: true,
          payrolls: { include: { items: true } },
        },
      }) : null,
      this.prisma.auditLog.findMany({
        where: {
          companyId,
          OR: [
            ...(userId ? [{ userId }, { entityId: userId }] : []),
            ...(employeeId ? [{ entityId: employeeId }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: AUDIT_LIMIT,
        select: { action: true, entity: true, entityId: true, createdAt: true, ipAddress: true },
      }),
    ]);

    return sanitizeExport({
      generatedAt: new Date(),
      legalBasis: 'LGPD art. 18, II e V (acesso e portabilidade); formato estruturado JSON.',
      user,
      employee,
      auditTrail,
      auditTrailTruncated: auditTrail.length === AUDIT_LIMIT,
    });
  }

  private audit(actor: JwtUser, action: string, entity: string, entityId: string, metadata: Record<string, unknown> = {}) {
    return this.prisma.auditLog.create({
      data: { companyId: actor.companyId, userId: actor.sub, action, entity, entityId, metadata: metadata as any },
    });
  }
}
