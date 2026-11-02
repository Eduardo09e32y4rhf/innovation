import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateRecruitmentInvoiceDto } from './dto/create-recruitment-invoice.dto';

/**
 * Faturamento do servico de recrutamento entre duas empresas (freelancer -> cliente). Distinto de
 * Partner/PartnerInvoice, que e contas-a-pagar da propria empresa a fornecedores genericos.
 * So o GESTOR (e ADMIN/DEV) acessa — regra do escopo: recrutadora nao enxerga financeiro.
 */
@Injectable()
export class RecruitmentInvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: JwtUser, dto: CreateRecruitmentInvoiceDto) {
    const engagement = await this.prisma.freelancerEngagement.findFirst({ where: { id: dto.engagementId, freelancerCompanyId: actor.companyId } });
    if (!engagement) throw new NotFoundException('Contrato nao encontrado.');
    if (engagement.status !== 'ACTIVE') throw new BadRequestException('O contrato precisa estar ativo para faturar.');

    for (const item of dto.items) {
      if (!item.jobId) continue;
      const delegation = await this.prisma.jobDelegation.findFirst({ where: { jobId: item.jobId, engagementId: engagement.id } });
      if (!delegation) throw new BadRequestException(`A vaga do item "${item.description}" nao pertence a este contrato.`);
    }

    const invoiceNumber = dto.invoiceNumber ?? (await this.nextInvoiceNumber(engagement.freelancerCompanyId));
    const amount = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    return this.prisma.recruitmentInvoice.create({
      data: {
        engagementId: engagement.id,
        freelancerCompanyId: engagement.freelancerCompanyId,
        clientCompanyId: engagement.clientCompanyId,
        invoiceNumber,
        description: dto.description,
        amount,
        dueDate: new Date(dto.dueDate),
        createdById: actor.sub,
        items: {
          create: dto.items.map((item) => ({
            description: item.description,
            jobId: item.jobId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
  }

  private async nextInvoiceNumber(freelancerCompanyId: string) {
    const year = new Date().getFullYear();
    const count = await this.prisma.recruitmentInvoice.count({ where: { freelancerCompanyId } });
    return `REC-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async getOwned(invoiceId: string, actor: JwtUser, side: 'freelancer' | 'client') {
    const invoice = await this.prisma.recruitmentInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada.');
    const field = side === 'freelancer' ? invoice.freelancerCompanyId : invoice.clientCompanyId;
    if (field !== actor.companyId) throw new NotFoundException('Fatura nao encontrada.');
    return invoice;
  }

  async issue(invoiceId: string, actor: JwtUser) {
    const invoice = await this.getOwned(invoiceId, actor, 'freelancer');
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Apenas faturas em rascunho podem ser emitidas.');
    return this.prisma.recruitmentInvoice.update({ where: { id: invoiceId }, data: { status: 'ISSUED' } });
  }

  async cancel(invoiceId: string, actor: JwtUser) {
    const invoice = await this.getOwned(invoiceId, actor, 'freelancer');
    if (invoice.status === 'PAID') throw new BadRequestException('Fatura ja paga nao pode ser cancelada.');
    return this.prisma.recruitmentInvoice.update({ where: { id: invoiceId }, data: { status: 'CANCELLED' } });
  }

  async registerPayment(invoiceId: string, actor: JwtUser, paymentMethod?: string) {
    const invoice = await this.getOwned(invoiceId, actor, 'client');
    if (!['ISSUED', 'OVERDUE', 'DISPUTED'].includes(invoice.status)) throw new BadRequestException('Fatura nao esta pendente de pagamento.');
    return this.prisma.recruitmentInvoice.update({ where: { id: invoiceId }, data: { status: 'PAID', paidAt: new Date(), paymentMethod: paymentMethod ?? null } });
  }

  async dispute(invoiceId: string, actor: JwtUser, reason: string) {
    const invoice = await this.getOwned(invoiceId, actor, 'client');
    if (invoice.status === 'PAID') throw new BadRequestException('Fatura ja paga nao pode ser contestada.');
    return this.prisma.recruitmentInvoice.update({
      where: { id: invoiceId },
      data: { status: 'DISPUTED', disputeReason: reason, disputedAt: new Date(), disputedById: actor.sub },
    });
  }

  async list(actor: JwtUser, direction?: 'issued' | 'received') {
    const where =
      direction === 'issued'
        ? { freelancerCompanyId: actor.companyId }
        : direction === 'received'
          ? { clientCompanyId: actor.companyId }
          : { OR: [{ freelancerCompanyId: actor.companyId }, { clientCompanyId: actor.companyId }] };
    return this.prisma.recruitmentInvoice.findMany({
      where,
      include: { items: true, freelancerCompany: { select: { id: true, name: true } }, clientCompany: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(invoiceId: string, actor: JwtUser) {
    const invoice = await this.prisma.recruitmentInvoice.findFirst({
      where: { id: invoiceId, OR: [{ freelancerCompanyId: actor.companyId }, { clientCompanyId: actor.companyId }] },
      include: { items: true, freelancerCompany: true, clientCompany: true },
    });
    if (!invoice) throw new NotFoundException('Fatura nao encontrada.');
    return invoice;
  }
}
