import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { $Enums } from '@prisma/client';
type UserRole = $Enums.UserRole;
const UserRole = $Enums.UserRole;
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';

/**
 * Perfis que podem receber notificações do sistema e de segurança.
 * FUNCIONARIO e CONSULTA nunca recebem — evita vazamento de dados internos.
 */
const NOTIFICATION_PRIVILEGED_ROLES: UserRole[] = ['DEV', 'ADMIN', 'RH', 'GESTOR'];

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private safeLog(scope: string, err: unknown) {
    console.error(`[NotificationsService] ${scope}`, err);
  }

  async list(companyId: string, actor: JwtUser) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: {
          companyId,
          OR: [
            { recipients: { some: { userId: actor.sub } } },
            { createdBy: actor.sub }
          ]
        },
        include: {
          createdByUser: { select: { id: true, name: true } },
          recipients: {
            include: { user: { select: { name: true } } }
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return notifications.map(n => {
        // Remetentes ou administradores veem todos os destinatários
        if (n.createdBy === actor.sub || actor.role === 'DEV' || actor.role === 'ADMIN' || actor.role === 'RH') return n;
        // Destinatários comuns veem apenas a si mesmos (privacidade)
        return {
          ...n,
          recipients: n.recipients.filter(r => r.userId === actor.sub)
        };
      });
    } catch (err) {
      this.safeLog('list fallback', err);
      return [];
    }
  }

  async unreadCount(companyId: string, actor: JwtUser) {
    try {
      const count = await this.prisma.notification.count({
        where: {
          companyId,
          recipients: { some: { userId: actor.sub, status: { in: ['UNREAD', 'PENDING_RESPONSE'] } } },
        },
      });
      return { count };
    } catch (err) {
      this.safeLog('unreadCount fallback', err);
      return { count: 0 };
    }
  }

  async markAsRead(companyId: string, userId: string, id: string) {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: { id, companyId },
        include: { recipients: { where: { userId } } },
      });
      const recipient = notification?.recipients?.[0];
      if (recipient) {
        await this.prisma.notificationRecipient.update({
          where: { id: recipient.id },
          data: { status: 'READ', readAt: new Date() },
        });
      }
    } catch (err) {
      this.safeLog('markAsRead fallback', err);
    }
    return { ok: true };
  }

  async markAllAsRead(companyId: string, userId: string) {
    try {
      await this.prisma.notificationRecipient.updateMany({
        where: { userId, notification: { companyId }, status: { in: ['UNREAD', 'PENDING_RESPONSE'] } },
        data: { status: 'READ', readAt: new Date() },
      });
    } catch (err) {
      this.safeLog('markAllAsRead fallback', err);
    }
    return { ok: true };
  }

  async archive(companyId: string, userId: string, id: string) {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: { id, companyId },
        include: { recipients: { where: { userId } } },
      });
      const recipient = notification?.recipients?.[0];
      if (recipient) {
        await this.prisma.notificationRecipient.update({
          where: { id: recipient.id },
          data: { status: 'ARCHIVED', archivedAt: new Date() },
        });
      }
    } catch (err) {
      this.safeLog('archive fallback', err);
    }
    return { ok: true };
  }

  async delete(companyId: string, userId: string, id: string) {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: { id, companyId },
        include: { recipients: { where: { userId } } },
      });
      const recipient = notification?.recipients?.[0];
      if (recipient) {
        await this.prisma.notificationRecipient.delete({ where: { id: recipient.id } });
      }
    } catch (err) {
      this.safeLog('delete fallback', err);
    }
    return { ok: true };
  }

  /**
   * Cria comunicado, promoção, advertência ou suspensão.
   * Aceita os campos do formulário (`content`, `employeeIds`) e os antigos (`message`, `targetIds`).
   * Advertência/suspensão geram um documento individual por funcionário e exigem usuário de acesso vinculado.
   */
  async createAdminNotice(companyId: string, createdBy: string, body: any) {
    const type = String(body?.type ?? 'SIMPLE_NOTICE');
    const title = String(body?.title ?? '').trim();
    const message = String(body?.message ?? body?.content ?? '').trim();
    const allowedTypes = ['SIMPLE_NOTICE', 'PROMOTION_NOTICE', 'WARNING_NOTICE', 'SUSPENSION_NOTICE'];
    if (!allowedTypes.includes(type)) throw new BadRequestException('Escolha o tipo da notificação: comunicado, promoção, advertência ou suspensão.');
    if (!title) throw new BadRequestException('Informe o título da notificação.');
    if (!message) throw new BadRequestException('Escreva o conteúdo da notificação.');

    const isPenalty = type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE';
    const extra: Record<string, any> = { ...(body?.extraJson ?? {}) };
    for (const key of ['occurrenceDate', 'legalReason', 'suspensionDays', 'newPosition', 'newSalary', 'effectiveDate']) {
      if (body?.[key] !== undefined && body[key] !== '') extra[key] = body[key];
    }

    if (isPenalty) {
      if (!String(extra.legalReason ?? '').trim()) throw new BadRequestException('Informe o motivo da ocorrência (ex.: atrasos repetidos, falta sem justificativa).');
      if (!this.isoDay(extra.occurrenceDate)) throw new BadRequestException('Informe a data em que a ocorrência aconteceu.');
    }
    if (type === 'SUSPENSION_NOTICE') {
      const days = Number(extra.suspensionDays);
      if (!Number.isInteger(days) || days < 1 || days > 30) throw new BadRequestException('Informe quantos dias de suspensão (de 1 a 30).');
      extra.suspensionDays = days;
      extra.suspensionStart = this.isoDay(extra.suspensionStart) ?? this.isoDay(extra.occurrenceDate);
    }

    // ---- destinatários ----
    const employeeIds: string[] = Array.isArray(body?.employeeIds) ? body.employeeIds.filter(Boolean) : [];
    const legacyUserIds: string[] = Array.isArray(body?.targetIds) ? body.targetIds.filter(Boolean) : [];
    const targetType = String(body?.targetType ?? (employeeIds.length || legacyUserIds.length ? 'SPECIFIC' : 'ALL'));

    if (isPenalty && !employeeIds.length && !legacyUserIds.length) {
      throw new BadRequestException(type === 'WARNING_NOTICE' ? 'Escolha o funcionário que vai receber a advertência.' : 'Escolha o funcionário que vai ser suspenso.');
    }

    let recipients: Array<{ userId: string; employeeId: string | null; name: string }> = [];
    const noAccess: string[] = [];

    if (employeeIds.length) {
      const employees = await this.prisma.employee.findMany({
        where: { companyId, id: { in: employeeIds } },
        select: { id: true, name: true, userId: true, user: { select: { isActive: true } } },
      });
      if (employees.length !== new Set(employeeIds).size) throw new BadRequestException('Algum funcionário escolhido não foi encontrado nesta empresa.');
      for (const e of employees) {
        if (!e.userId || e.user?.isActive === false) noAccess.push(e.name);
        else recipients.push({ userId: e.userId, employeeId: e.id, name: e.name });
      }
      if (noAccess.length) {
        throw new BadRequestException(
          `${noAccess.join(', ')} ${noAccess.length > 1 ? 'não têm' : 'não tem'} acesso ativo ao sistema, então não conseguiria${noAccess.length > 1 ? 'm' : ''} receber a notificação. Crie ou vincule um usuário na área Usuários e tente de novo.`,
        );
      }
    } else if (legacyUserIds.length) {
      const users = await this.prisma.user.findMany({ where: { companyId, id: { in: legacyUserIds }, isActive: true }, select: { id: true, name: true, employee: { select: { id: true } } } });
      recipients = users.map((u) => ({ userId: u.id, employeeId: u.employee?.id ?? null, name: u.name }));
    } else if (targetType === 'ROLE') {
      const role = NOTIFICATION_PRIVILEGED_ROLES.find((r) => r === body?.targetRole);
      if (!role) throw new BadRequestException('Escolha um perfil válido para enviar o comunicado.');
      const users = await this.prisma.user.findMany({ where: { companyId, role, isActive: true }, select: { id: true, name: true, employee: { select: { id: true } } } });
      recipients = users.map((u) => ({ userId: u.id, employeeId: u.employee?.id ?? null, name: u.name }));
    } else {
      const users = await this.prisma.user.findMany({
        where: { companyId, isActive: true, role: { notIn: ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL'] as UserRole[] } },
        select: { id: true, name: true, employee: { select: { id: true } } },
      });
      recipients = users.map((u) => ({ userId: u.id, employeeId: u.employee?.id ?? null, name: u.name }));
    }

    if (!recipients.length) throw new BadRequestException('Não há ninguém com acesso ativo para receber esta notificação.');

    // Tudo que importa juridicamente (ou é reconhecimento) aparece ao entrar e pede confirmação.
    const mustConfirm = isPenalty || type === 'PROMOTION_NOTICE' || Boolean(body?.requiresReadConfirmation ?? body?.requiresAcknowledgment) || Boolean(body?.requiresAcceptance ?? body?.requiresResponse);
    const requiresAcceptance = isPenalty || Boolean(body?.requiresAcceptance ?? body?.requiresResponse);
    const allowsRefusal = isPenalty || Boolean(body?.allowsRefusal);
    const groups = isPenalty ? recipients.map((r) => [r]) : [recipients];

    const created: any[] = [];
    for (const group of groups) {
      const notification = await this.prisma.notification.create({
        data: {
          companyId,
          type: type as any,
          targetType: isPenalty || targetType === 'SPECIFIC' ? 'EMPLOYEE' : targetType === 'ROLE' ? 'ROLE' : 'ALL',
          title,
          message,
          priority: (body?.priority as any) || (isPenalty ? 'HIGH' : 'NORMAL'),
          source: 'MANUAL',
          createdBy,
          targetUrl: body?.targetUrl,
          expiresAt: body?.expiresAt ? new Date(body.expiresAt) : undefined,
          requiresReadConfirmation: mustConfirm,
          requiresAcceptance,
          allowsRefusal,
          attachmentsJson: body?.attachmentsJson ?? undefined,
          extraJson: { ...extra, employeeName: isPenalty ? group[0].name : undefined } as any,
          status: 'SENT',
          sentAt: new Date(),
          recipients: {
            create: group.map((r) => ({ userId: r.userId, employeeId: r.employeeId ?? undefined, status: mustConfirm ? 'PENDING_RESPONSE' : 'UNREAD' })),
          },
        },
        include: { createdByUser: { select: { id: true, name: true } } },
      });
      created.push(notification);

      if (type === 'SUSPENSION_NOTICE' && group[0].employeeId) {
        const impact = await this.applySuspension(companyId, group[0].employeeId, extra.suspensionStart, extra.suspensionDays, notification.id);
        await this.prisma.notification.update({ where: { id: notification.id }, data: { extraJson: { ...(notification.extraJson as any), payrollImpact: impact } as any } });
      }
    }

    return { count: created.length, notifications: created, ...created[0] };
  }

  private isoDay(value: unknown): string | null {
    const text = String(value ?? '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(new Date(`${text}T00:00:00.000Z`).getTime()) ? text : null;
  }

  /**
   * Lança a suspensão no ponto: cada dia de trabalho vira falta por suspensão, o que o fechamento
   * já desconta da folha (dias de descanso não são descontados).
   */
  private async applySuspension(companyId: string, employeeId: string, startIso: string, days: number, notificationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true, salary: true, dailyWorkload: true, workScale: true, workScheduleRule: true },
    });
    if (!employee) return null;

    const [h, m] = String(employee.dailyWorkload ?? '08:00').split(':').map(Number);
    const dailyMinutes = Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : 480;
    const scale = String(employee.workScale ?? '5X2').toUpperCase();
    const rule = (employee as any).workScheduleRule;
    const restDays: number[] = Array.isArray(rule?.restDaysOfWeek) && rule.restDaysOfWeek.length ? rule.restDaysOfWeek : scale === '6X1' ? [0] : [0, 6];

    const start = new Date(`${startIso}T00:00:00.000Z`);
    let workedDaysLost = 0;
    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 86_400_000);
      const isRest = restDays.includes(date.getUTCDay());
      const absence = isRest ? 0 : dailyMinutes;
      if (!isRest) workedDaysLost++;
      const data = {
        incidentType: 'SUSPENSÃO',
        manualStatus: 'approved',
        manualReason: 'ajuste_suspensao',
        observation: 'Suspensão disciplinar (lançada automaticamente).',
        totalWorked: 0,
        dailyBalance: -absence,
        absenceMinutes: absence,
      };
      await this.prisma.timeTrack.upsert({
        where: { employeeId_date: { employeeId, date } },
        update: data,
        create: { companyId, employeeId, date, ...data },
      });
    }
    const salary = Number(employee.salary ?? 0);
    const estimatedDiscount = Math.round((salary / 30) * days * 100) / 100;
    return { days, workedDaysLost, estimatedDiscount, notificationId, appliedAt: new Date().toISOString() };
  }

  async respond(companyId: string, actor: JwtUser, id: string, body: { action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE'; reason?: string }) {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: { id, companyId },
        include: { recipients: { where: { userId: actor.sub } } },
      });

      if (!notification) throw new NotFoundException('Notificação não encontrada.');

      const recipient = notification.recipients[0];
      if (!recipient) throw new ForbiddenException('Esta notificação não foi enviada para você.');

      if (body.action === 'REFUSE' && !notification.allowsRefusal) {
        throw new BadRequestException('Esta notificação não permite recusa.');
      }

      const status =
        body.action === 'ACKNOWLEDGE'
          ? 'ACKNOWLEDGED'
          : body.action === 'ACCEPT'
            ? 'ACCEPTED'
            : 'REFUSED_ACKNOWLEDGMENT';
      const respondedAt = new Date().toISOString();
      const observation = String(body.reason ?? '').trim() || null;
      const responseLabel = body.action === 'REFUSE' ? 'RECUSADO' : 'CIENTE';

      return this.prisma.notificationRecipient.update({
        where: { id: recipient.id },
        data: {
          status,
          readAt: new Date(),
          responseJson: {
            action: body.action,
            reason: observation,
            respondedAt,
            termoId: notification.id,
            colaboradorId: recipient.employeeId,
            status: responseLabel,
            observacao: observation,
            dataResposta: respondedAt,
          },
        },
      });
    } catch (err) {
      this.safeLog('respond error', err);
      throw err;
    }
  }

  async dashboardWidget(companyId: string, actor: JwtUser) {
    try {
      const unreadCount = await this.unreadCount(companyId, actor);
      // Apenas notificações endereçadas ao usuário atual
      const notifications = await this.prisma.notification.findMany({
        where: {
          companyId,
          recipients: { some: { userId: actor.sub, status: { in: ['UNREAD', 'PENDING_RESPONSE'] } } },
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        include: {
          createdByUser: { select: { id: true, name: true } },
          recipients: { where: { userId: actor.sub } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      return { unreadCount: unreadCount.count, notifications };
    } catch (err) {
      this.safeLog('dashboardWidget fallback', err);
      return { unreadCount: 0, notifications: [] };
    }
  }
}
