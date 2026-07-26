import { Body, Controller, Post, Param, UseGuards, Req, ForbiddenException, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/types/auth.types';
import { PlatformAiService } from './platform-ai.service';
import { SupportAiService } from './support-ai.service';
import { AiUsageService } from './ai-usage.service';
import { AiGuardrailsService } from './ai-guardrails.service';
import { PrismaService } from '../../database/prisma.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly platformAi: PlatformAiService,
    private readonly supportAi: SupportAiService,
    private readonly usageService: AiUsageService,
    private readonly guardrails: AiGuardrailsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEV')
  async getUsageStats() {
    return this.usageService.getUsageSummary();
  }

  @Post('platform/company/:id/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEV', 'COMERCIAL')
  async getCompanySummary(@Param('id') companyId: string, @CurrentUser() actor: JwtUser) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return { summaryText: 'Empresa não encontrada no banco operacional.', keyHighlights: [], statusClassification: 'NORMAL' };
    }

    // Verificação de escopo de acesso (COMERCIAL apenas se for dono)
    if (!this.guardrails.validateCompanyScope(actor, company.id, company.commercialOwnerId || undefined)) {
      throw new ForbiddenException('Perfil COMERCIAL não tem permissão para analisar empresas fora do seu escopo de carteira.');
    }

    const [activeUsers, overdueInvoices, openTickets] = await Promise.all([
      this.prisma.user.count({ where: { companyId: company.id, isActive: true } }),
      this.prisma.platformInvoice.count({ where: { companyId: company.id, status: 'OVERDUE' } }),
      this.prisma.supportTicket.count({ where: { companyId: company.id, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    ]);

    return this.platformAi.generateCompanySummary(
      company,
      { activeUsers, maxUsers: company.maxUsers || 999, overdueInvoices, openTickets },
      actor.sub,
    );
  }

  @Post('platform/company/:id/risk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEV', 'COMERCIAL')
  async getCompanyRisk(@Param('id') companyId: string, @CurrentUser() actor: JwtUser) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return { riskLevel: 'LOW', reasons: ['Empresa não localizada'], recommendations: [] };
    }

    if (!this.guardrails.validateCompanyScope(actor, company.id, company.commercialOwnerId || undefined)) {
      throw new ForbiddenException('Acesso negado fora da carteira comercial.');
    }

    const [invoices, tickets] = await Promise.all([
      this.prisma.platformInvoice.findMany({ where: { companyId: company.id } }),
      this.prisma.supportTicket.findMany({ where: { companyId: company.id, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    ]);

    return this.platformAi.analyzeOperationalRisk(company, invoices, tickets, actor.sub);
  }

  @Post('platform/assistant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEV')
  async queryAssistant(@Body() body: { question: string }, @CurrentUser() actor: JwtUser) {
    // Busca sumário rápido de métricas para contextualizar o assistente sem expor senhas ou tokens
    const [totalCompanies, overdueCount, openTicketsCount] = await Promise.all([
      this.prisma.company.count({ where: { status: 'ACTIVE' } }),
      this.prisma.platformInvoice.count({ where: { status: 'OVERDUE' } }),
      this.prisma.supportTicket.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    ]);

    const summaryContext = `Total de Empresas Ativas: ${totalCompanies} | Faturas Vencidas no Sistema: ${overdueCount} | Chamados em Aberto: ${openTicketsCount}`;
    return this.platformAi.askPlatformAssistant(body.question || '', summaryContext, actor.sub);
  }

  @Post('support/classify')
  async classifyTicket(@Body() body: { title: string; description?: string }) {
    // Endpoint público ou autenticado para auxiliar na triagem ao abrir novo chamado
    return this.supportAi.classifyTicket(body.title || '', body.description || '');
  }

  @Post('support/ticket/:id/summarize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEV')
  async summarizeTicket(@Param('id') ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { summary: 'Ticket não encontrado', keyPoints: [], pendingActionFrom: 'NONE' };

    const messages = await this.prisma.supportTicketMessage.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
    });

    return this.supportAi.summarizeTicket(ticket, messages);
  }

  @Post('support/ticket/:id/suggest-reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEV')
  async suggestReply(@Param('id') ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { suggestedReply: '', isReadyToSend: false };

    const messages = await this.prisma.supportTicketMessage.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
    });

    return this.supportAi.suggestReply(ticket, messages);
  }
}
