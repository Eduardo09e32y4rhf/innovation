import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { escapeHtml, layout } from '../mail/mail-templates';

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Novo', TRIAGE: 'Em triagem', IN_PROGRESS: 'Em andamento', WAITING_CUSTOMER: 'Aguardando você',
  WAITING_DEPLOY: 'Aguardando publicação', RESOLVED: 'Resolvido', CLOSED: 'Fechado', REOPENED: 'Reaberto',
  DUPLICATE: 'Duplicado', CANCELLED: 'Cancelado',
};
const brl = (value: unknown) => `R$ ${Number(value ?? 0).toFixed(2).replace('.', ',')}`;

/** Avisos do suporte ao cliente: sino da empresa (administradores) + e-mail do solicitante. Nunca lança erro. */
@Injectable()
export class SupportNotificationService {
  private readonly logger = new Logger(SupportNotificationService.name);
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly mail?: MailService,
  ) {}

  private async notify(ticketId: string, title: string, message: string, priority: 'NORMAL' | 'HIGH' = 'NORMAL') {
    try {
      const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, ticketNumber: true, companyId: true, requesterEmail: true, requesterName: true } });
      if (!ticket) return;
      const fullTitle = `${title} (${ticket.ticketNumber})`;
      if (ticket.companyId && this.notifications) {
        await this.notifications.createSystemNotice(ticket.companyId, {
          title: fullTitle, message, priority, targetRoles: ['ADMIN'], source: 'SUPPORT',
          targetUrl: `/suporte/${ticket.id}`, extraJson: { ticketId: ticket.id },
        });
      }
      if (ticket.requesterEmail && this.mail) {
        await this.mail.send(ticket.requesterEmail, {
          subject: `${fullTitle} — Innovation RH Connect`,
          html: layout(fullTitle, `<p>Olá${ticket.requesterName ? `, ${escapeHtml(ticket.requesterName)}` : ''}.</p><p>${escapeHtml(message)}</p>`),
          text: `${fullTitle}\n\n${message}`,
        });
      }
    } catch (error) {
      this.logger.warn(`Falha ao notificar o chamado ${ticketId}: ${String(error)}`);
    }
  }

  notifyPlatformReply(ticketId: string) {
    return this.notify(ticketId, 'Nova resposta no seu chamado', 'A equipe de suporte respondeu ao seu chamado. Abra o chamado para ler a resposta.');
  }
  notifyStatusChange(ticketId: string, status: string) {
    return this.notify(ticketId, 'Status do chamado atualizado', `O status do seu chamado agora é "${STATUS_LABEL[status] ?? status}".`);
  }
  notifyDuplicate(ticketId: string, originalNumber: string) {
    return this.notify(ticketId, 'Chamado unificado', `Seu chamado é igual ao ${originalNumber}, que seguirá com o atendimento. Encerramos este para não duplicar o trabalho.`);
  }
  notifyRefundDecision(ticketId: string, approved: boolean, reason?: string | null) {
    return this.notify(ticketId, approved ? 'Reembolso aprovado' : 'Reembolso recusado',
      approved ? 'Seu pedido de reembolso foi aprovado e o estorno será enviado ao meio de pagamento.' : `Seu pedido de reembolso foi recusado.${reason ? ` Motivo: ${reason}` : ''}`, 'HIGH');
  }
  notifyRefundAwaitingSecond(ticketId: string) {
    return this.notify(ticketId, 'Reembolso em análise', 'Seu pedido recebeu a primeira aprovação e aguarda a segunda aprovação, exigida pelo valor.');
  }
  notifyRefundConfirmed(ticketId: string, amount: unknown) {
    return this.notify(ticketId, 'Reembolso confirmado', `O estorno de ${brl(amount)} foi confirmado pelo provedor de pagamento. O prazo para aparecer na fatura do cartão ou na conta depende do emissor.`, 'HIGH');
  }
  notifyRefundFailed(ticketId: string, detail?: string | null) {
    return this.notify(ticketId, 'Reembolso não concluído', `O provedor de pagamento não concluiu o estorno.${detail ? ` ${detail}` : ''} Nossa equipe entrará em contato.`, 'HIGH');
  }
}
