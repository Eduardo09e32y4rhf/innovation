import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
type UserRole = any;
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

      return notifications.map((n: any) => {
        // Remetentes ou administradores veem todos os destinatários
        if (n.createdBy === actor.sub || actor.role === 'DEV' || actor.role === 'ADMIN') return n;
        // Destinatários comuns veem apenas a si mesmos (privacidade)
        return {
          ...n,
          recipients: n.recipients.filter((r: any) => r.userId === actor.sub)
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

  async createAdminNotice(companyId: string, createdBy: string, body: any) {
    try {
      const { title, message, priority, type, targetType, targetIds, expiresAt, requiresReadConfirmation, requiresAcceptance, allowsRefusal, attachmentsJson, extraJson } = body;

      let targetUserIds: string[] = [];

      if (targetType === 'ALL') {
        // 'ALL' entrega apenas para perfis privilegiados — nunca para FUNCIONARIO ou CONSULTA
        const users = await this.prisma.user.findMany({
          where: { companyId, role: { in: NOTIFICATION_PRIVILEGED_ROLES } },
          select: { id: true },
        });
        targetUserIds = users.map((u: any) => u.id);
      } else if (targetType === 'EMPLOYEES') {
        // 'EMPLOYEES' entrega apenas para funcionários com perfil privilegiado
        const employees = await this.prisma.employee.findMany({
          where: { companyId, status: 'ACTIVE', user: { role: { in: NOTIFICATION_PRIVILEGED_ROLES } } },
          select: { userId: true },
        });
        targetUserIds = employees.map((e: any) => e.userId).filter(Boolean) as string[];
      } else if (targetType === 'ROLE') {
        const requestedRole = body.targetRole as string;
        // Garante que o role alvo é um perfil privilegiado — nunca entrega para FUNCIONARIO/CONSULTA
        const safeRole = NOTIFICATION_PRIVILEGED_ROLES.find((r: any) => r === requestedRole) ?? null;
        if (safeRole) {
          const users = await this.prisma.user.findMany({
            where: { companyId, role: safeRole },
            select: { id: true },
          });
          targetUserIds = users.map(u => u.id);
        }
      } else if (targetType === 'SPECIFIC' && targetIds) {
        targetUserIds = targetIds;
      }

      const notification = await this.prisma.notification.create({
        data: {
          companyId,
          type: type || 'SIMPLE_NOTICE',
          title,
          message,
          priority: priority || 'NORMAL',
          source: 'MANUAL',
          createdBy,
          targetUrl: body.targetUrl,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          requiresReadConfirmation: Boolean(requiresReadConfirmation),
          requiresAcceptance: Boolean(requiresAcceptance),
          allowsRefusal: Boolean(allowsRefusal),
          attachmentsJson: attachmentsJson ?? undefined,
          extraJson: extraJson ?? undefined,
          status: 'SENT',
          sentAt: new Date(),
          recipients: {
            create: targetUserIds.map((userId: any) => ({
              userId,
              status: (requiresAcceptance || requiresReadConfirmation) ? 'PENDING_RESPONSE' : 'UNREAD',
            })),
          },
        },
        include: {
          createdByUser: { select: { id: true, name: true } },
        },
      });

      // Automatic Timesheet Integration for Suspensions
      if (type === 'SUSPENSION_NOTICE' && extraJson?.occurrenceDate && extraJson?.suspensionDays && targetType === 'SPECIFIC' && body.targetIds?.[0]) {
        try {
          const userId = body.targetIds[0];
          const employee = await this.prisma.employee.findUnique({
            where: { userId }
          });
          
          if (employee) {
            const startDate = new Date(extraJson.occurrenceDate);
            const days = Number(extraJson.suspensionDays) || 1;
            
            for (let i = 0; i < days; i++) {
              const targetDate = new Date(startDate);
              targetDate.setDate(targetDate.getDate() + i);
              
              await this.prisma.timeTrack.upsert({
                where: {
                  employeeId_date: {
                    employeeId: employee.id,
                    date: targetDate,
                  }
                },
                update: {
                  incidentType: 'SUSPENSÃO',
                  manualStatus: 'approved',
                  observation: 'Afastamento automático por suspensão disciplinar.',
                  totalWorked: 0,
                  dailyBalance: 0,
                },
                create: {
                  companyId: employee.companyId,
                  employeeId: employee.id,
                  date: targetDate,
                  incidentType: 'SUSPENSÃO',
                  manualStatus: 'approved',
                  observation: 'Afastamento automático por suspensão disciplinar.',
                  totalWorked: 0,
                  dailyBalance: 0,
                }
              });
            }
            console.log(`[NotificationsService] Injected ${days} days of SUSPENSÃO for employee ${employee.id}`);
          }
        } catch (susErr) {
          this.safeLog('createAdminNotice auto-suspension error', susErr);
        }
      }

      return notification;
    } catch (err) {
      this.safeLog('createAdminNotice error', err);
      throw err;
    }
  }

  async respond(companyId: string, actor: JwtUser, id: string, body: { action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE'; reason?: string }) {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: { id, companyId },
        include: { recipients: { where: { userId: actor.sub } } },
      });

      if (!notification) throw new Error('Notificação não encontrada');

      const recipient = notification.recipients[0];
      if (!recipient) throw new Error('Usuário não é destinatário');

      if (body.action === 'REFUSE' && !notification.allowsRefusal) {
        throw new Error('Esta notificação não permite recusa');
      }

      const status =
        body.action === 'ACKNOWLEDGE'
          ? 'ACKNOWLEDGED'
          : body.action === 'ACCEPT'
            ? 'ACCEPTED'
            : 'REFUSED_ACKNOWLEDGMENT';

      return this.prisma.notificationRecipient.update({
        where: { id: recipient.id },
        data: {
          status,
          readAt: new Date(),
          responseJson: {
            action: body.action,
            reason: body.reason ?? null,
            respondedAt: new Date().toISOString(),
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