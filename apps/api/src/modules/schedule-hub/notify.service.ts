import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HubNotifyService {
  private readonly logger = new Logger(HubNotifyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notify(companyId: string, userIds: (string | null | undefined)[], title: string, message: string, targetUrl?: string, urgent = false) {
    const recipients = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    if (!recipients.length) return;
    try {
      await this.prisma.notification.create({
        data: {
          companyId,
          type: urgent ? 'URGENT_NOTICE' : 'SYSTEM_NOTICE',
          title,
          message,
          priority: urgent ? 'HIGH' : 'NORMAL',
          source: 'ESCALAS',
          targetUrl: targetUrl ?? null,
          status: 'SENT',
          sentAt: new Date(),
          recipients: { create: recipients.map((userId) => ({ userId, status: 'UNREAD' })) },
        },
      });
    } catch (error) {
      this.logger.warn(`Falha ao notificar: ${String(error)}`);
    }
  }

  async hrUserIds(companyId: string) {
    const users = await this.prisma.user.findMany({ where: { companyId, role: { in: ['ADMIN', 'RH'] }, isActive: true }, select: { id: true } });
    return users.map((user) => user.id);
  }
}
