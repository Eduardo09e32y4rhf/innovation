import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { recruiterNoticeEmail } from './recruitment-mails';
import { appBase } from './recruitment-tokens';

/**
 * Avisa quem conduz o processo quando o candidato responde (confirmou/recusou entrevista, escolheu horario,
 * aceitou/recusou proposta, terminou teste) ou quando uma proposta precisa de aprovacao. Por e-mail (sem custo
 * extra) para a pessoa responsavel e no sino do sistema para RH/Administrador. Nunca derruba a acao principal.
 */
@Injectable()
export class RecruiterNotifierService {
  private readonly logger = new Logger(RecruiterNotifierService.name);

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService, private readonly notifications: NotificationsService) {}

  async jobUrl(companyId: string, jobId: string): Promise<string | null> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { slug: true } });
    return company?.slug && appBase() ? `${appBase()}/${company.slug}/dashboard/jobs/${jobId}` : null;
  }

  async notify(input: {
    companyId: string; jobId: string; userIds: (string | null | undefined)[]; title: string; lines: string[];
    priority?: 'LOW' | 'NORMAL' | 'HIGH'; roles?: ('RH' | 'ADMIN')[]; kind: string; cta?: string;
  }) {
    try {
      const url = await this.jobUrl(input.companyId, input.jobId);
      const ids = [...new Set(input.userIds.filter(Boolean) as string[])];
      const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids }, companyId: input.companyId, isActive: true }, select: { email: true } }) : [];
      for (const user of users) if (user.email) await this.mail.send(user.email, recruiterNoticeEmail({ title: input.title, lines: input.lines, url, cta: input.cta }));
      await this.notifications.createSystemNotice(input.companyId, {
        title: input.title,
        message: input.lines.join(' '),
        priority: input.priority ?? 'NORMAL',
        targetRoles: input.roles ?? ['RH', 'ADMIN'],
        targetUrl: url ?? undefined,
        source: 'RECRUITMENT',
        extraJson: { kind: input.kind, jobId: input.jobId },
      });
    } catch (error) {
      this.logger.warn(`Aviso ao recrutador nao enviado: ${error instanceof Error ? error.message : error}`);
    }
  }
}
