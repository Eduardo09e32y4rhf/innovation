import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, actor: JwtUser) {
    const where: any = { companyId };
    
    if (actor.role === 'FUNCIONARIO') {
      where.recipients = { some: { userId: actor.sub } };
    }

    return this.prisma.notification.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, name: true } },
        recipients: { where: { userId: actor.sub } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(companyId: string, actor: JwtUser) {
    const where: any = {
      companyId,
      recipients: {
        some: {
          userId: actor.sub,
          status: 'UNREAD',
        },
      },
    };

    return {
      count: await this.prisma.notification.count({ where }),
    };
  }

  async markAsRead(companyId: string, userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, companyId },
      include: { recipients: { where: { userId } },
    }});
    
    if (!notification) throw new Error('Notificação não encontrada');
    
    const recipient = notification.recipients[0];
    if (!recipient) throw new Error('Usuário não é destinatário');
    
    await this.prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: { status: 'READ', readAt: new Date() },
    });
    
    return { ok: true };
  }

  async markAllAsRead(companyId: string, userId: string) {
    await this.prisma.notificationRecipient.updateMany({
      where: {
        userId,
        notification: { companyId },
        status: 'UNREAD',
      },
      data: { status: 'READ', readAt: new Date() },
    });
    
    return { ok: true };
  }

  async archive(companyId: string, userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, companyId },
      include: { recipients: { where: { userId } },
    }});
    
    if (!notification) throw new Error('Notificação não encontrada');
    
    const recipient = notification.recipients[0];
    if (!recipient) throw new Error('Usuário não é destinatário');
    
    await this.prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
    
    return { ok: true };
  }

  async delete(companyId: string, userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, companyId },
      include: { recipients: { where: { userId } },
    }});
    
    if (!notification) throw new Error('Notificação não encontrada');
    
    const recipient = notification.recipients[0];
    if (!recipient) throw new Error('Usuário não é destinatário');
    
    await this.prisma.notificationRecipient.delete({ where: { id: recipient.id } });
    
    return { ok: true };
  }

  async createAdminNotice(companyId: string, createdBy: string, body: any) {
    const { title, message, priority, targetType, targetIds, expiresAt } = body;
    
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
        type: 'ADMIN_USER',
        title,
        message,
        priority: priority || 'NORMAL',
        source: 'MANUAL',
        createdBy,
        targetUrl: body.targetUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        recipients: {
          create: targetUserIds.map(userId => ({
            userId,
            status: 'UNREAD',
          })),
        },
      },
      include: {
        createdByUser: { select: { id: true, name: true } },
      },
    });
    
    return notification;
  }

  async dashboardWidget(companyId: string, actor: JwtUser) {
    const [unreadCount, recentNotifications] = await Promise.all([
      this.unreadCount(companyId, actor),
      this.prisma.notification.findMany({
        where: {
          companyId,
          recipients: {
            some: {
              userId: actor.sub,
              status: 'UNREAD',
            },
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
        include: {
          createdByUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      unreadCount: unreadCount.count,
      notifications: recentNotifications,
    };
  }
}