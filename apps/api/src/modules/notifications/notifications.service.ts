import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private safeLog(scope: string, err: unknown) {
    console.error(`[NotificationsService] ${scope}`, err);
  }

  async list(companyId: string, actor: JwtUser) {
    try {
      const where: any = { companyId };
      if (actor.role === 'FUNCIONARIO') {
        where.recipients = { some: { userId: actor.sub } };
      }

      return await this.prisma.notification.findMany({
        where,
        include: {
          createdByUser: { select: { id: true, name: true } },
          recipients: { where: { userId: actor.sub } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
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
          recipients: { some: { userId: actor.sub, status: 'UNREAD' } },
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
        where: { userId, notification: { companyId }, status: 'UNREAD' },
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
        const users = await this.prisma.user.findMany({
          where: { companyId },
          select: { id: true },
        });
        targetUserIds = users.map(u => u.id);
      } else if (targetType === 'EMPLOYEES') {
        const employees = await this.prisma.employee.findMany({
          where: { companyId, status: 'ACTIVE' },
          select: { userId: true },
        });
        targetUserIds = employees.map(e => e.userId).filter(Boolean) as string[];
      } else if (targetType === 'ROLE') {
        const users = await this.prisma.user.findMany({
          where: { companyId, role: body.targetRole },
          select: { id: true },
        });
        targetUserIds = users.map(u => u.id);
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
            create: targetUserIds.map(userId => ({
              userId,
              status: (requiresAcceptance || requiresReadConfirmation) ? 'PENDING_RESPONSE' : 'UNREAD',
            })),
          },
        },
        include: {
          createdByUser: { select: { id: true, name: true } },
        },
      });

      return notification;
    } catch (err) {
      this.safeLog('createAdminNotice error', err);
      throw err;
    }
  }

  async dashboardWidget(companyId: string, actor: JwtUser) {
    try {
      const unreadCount = await this.unreadCount(companyId, actor);
      const notifications = await this.prisma.notification.findMany({
        where: {
          companyId,
          recipients: { some: { userId: actor.sub, status: 'UNREAD' } },
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