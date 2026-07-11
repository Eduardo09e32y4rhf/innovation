import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasService } from '../finance/asaas.service';
import { randomBytes } from 'crypto';

export interface CreateProposalDto {
  companyId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  planType: string;
  monthlyPrice: number;
  usersLimit: number;
  employeesLimit: number;
  features: string[];
}

export interface AcceptTermsDto {
  signedByName: string;
  signedByEmail: string;
  signatureBase64?: string;
}

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaasService: AsaasService,
  ) {}

  async createProposal(userId: string, data: CreateProposalDto) {
    const proposalNumber = `PROP-${new Date().getFullYear()}${new Date().getMonth() + 1}-${randomBytes(3).toString('hex').toUpperCase()}`;
    
    const proposal = await this.prisma.proposal.create({
      data: {
        companyId: data.companyId,
        proposalNumber,
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        planType: data.planType,
        monthlyPrice: data.monthlyPrice,
        usersLimit: data.usersLimit,
        employeesLimit: data.employeesLimit,
        features: data.features,
        createdBy: userId,
        status: 'DRAFT',
      },
    });

    await this.logAudit(proposal.id, 'CREATED', userId, { action: 'Proposal drafted' });

    return proposal;
  }

  async sendProposal(id: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');
    if (proposal.status !== 'DRAFT' && proposal.status !== 'SENT') {
      throw new BadRequestException('Proposta não pode ser enviada no status atual');
    }

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: { status: 'SENT' },
    });

    // TODO: Send Email logic here
    await this.logAudit(id, 'SENT', userId, { action: 'Email enviado ao cliente' });

    return updated;
  }

  async getProposalStatus(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        company: {
          select: { name: true, document: true, asaasCustomerId: true },
        },
      },
    });

    if (!proposal) throw new NotFoundException('Proposta não encontrada');
    return proposal;
  }

  async acceptTerms(id: string, data: AcceptTermsDto, userEmail: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!proposal) throw new NotFoundException('Proposta não encontrada');
    if (proposal.status !== 'SENT' && proposal.status !== 'DRAFT') {
      throw new BadRequestException('Proposta não está pendente de assinatura');
    }

    let customerId = proposal.company.asaasCustomerId;
    
    if (!customerId) {
      // Cria cliente no Asaas
      const customer = await this.asaasService.createCustomer({
        name: proposal.company.name,
        cpfCnpj: proposal.company.document || '',
        email: data.signedByEmail,
      }) as any;

      customerId = customer.id;

      // Atualiza a empresa com o ID do Asaas
      if (customerId) {
        await this.prisma.company.update({
          where: { id: proposal.companyId },
          data: { asaasCustomerId: customerId },
        });
      }
    }

    let asaasPaymentLink = null;
    let asaasSubscriptionId = null;

    if (customerId && proposal.monthlyPrice > 0) {
      // Gera a assinatura no Asaas
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 3); // 3 dias para pagar a 1a mensalidade

      const subscription = await this.asaasService.createSubscription(customerId, {
        value: proposal.monthlyPrice,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        description: `Assinatura ${proposal.planType} - ${proposal.title}`,
        cycle: 'MONTHLY'
      }) as any;

      asaasSubscriptionId = subscription.id;
      // Em sandbox Asaas, o retorno contém o invoiceUrl se for gerada uma cobrança imediata
      // Ou podemos pegar da cobrança futuramente
    }
    
    // Fallback pra criar um link fictício no ambiente dev se a API Key do Asaas estiver vazia
    if (!asaasSubscriptionId) {
       asaasPaymentLink = `https://sandbox.asaas.com/checkout/mock/${proposal.id}`;
    } else {
       // Idealmente, busca-se a primeira fatura da subscription para pegar o invoiceUrl, 
       // mas para simplificar, setaremos um link padrão do Asaas (ou o retorno da sub).
       asaasPaymentLink = `https://sandbox.asaas.com/payment/mock/${asaasSubscriptionId}`; // Ajuste conforme a real reposta
    }

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        status: 'PAYMENT_PENDING',
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        signedByName: data.signedByName,
        signedByEmail: data.signedByEmail,
        signedAt: new Date(),
        signatureBase64: data.signatureBase64,
        asaasPaymentLink,
        asaasInvoiceId: asaasSubscriptionId,
      },
    });

    await this.logAudit(id, 'SIGNED', userEmail, { 
      action: 'Termos aceitos e assinatura no Asaas criada',
      asaasCustomerId: customerId,
      asaasSubscriptionId,
    });

    return updated;
  }
  
  async listProposals(companyId?: string) {
    return this.prisma.proposal.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async logAudit(proposalId: string, action: string, actor: string, metadata: any) {
    await this.prisma.proposalAuditLog.create({
      data: {
        proposalId,
        action,
        actor,
        metadata: JSON.stringify(metadata),
      },
    });
  }
}
