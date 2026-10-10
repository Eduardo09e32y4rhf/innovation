import { fmt, PdfReport } from '../../common/pdf/pdf-report';
import { createPdfSink, sendPdf } from '../../common/pdf/pdf-response';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateManualContractDto } from './dto/create-manual-contract.dto';
import { TransitionManualContractDto } from './dto/transition-manual-contract.dto';
import { UpdateManualContractDto } from './dto/update-manual-contract.dto';
import type { JwtUser } from '../../common/types/auth.types';
import { assertInWallet, walletOwnerId } from '../../common/permissions/commercial-wallet';
import { ManualContractsRepository } from './manual-contracts.repository';
import { PlatformFinanceService } from '../finance/platform-finance.service';
import {
  IMMUTABLE_CONTRACT_STATUSES,
  isManualContractStatus,
  MANUAL_CONTRACT_TRANSITIONS,
  ManualContractStatus,
} from './manual-contract-status';

@Injectable()
export class ManualContractsService {
  constructor(
    private readonly repository: ManualContractsRepository,
    private readonly finance: PlatformFinanceService,
  ) {}

  list(companyId?: string, actor?: JwtUser) {
    return this.repository.list(companyId, walletOwnerId(actor));
  }

  async get(id: string, actor?: JwtUser) {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Contrato manual nao encontrado.');
    assertInWallet(actor, contract.company, 'Contrato manual nao encontrado.');
    return contract;
  }

  async history(id: string, actor?: JwtUser) {
    await this.get(id, actor);
    return this.repository.history(id);
  }

  async availableTransitions(id: string, actor?: JwtUser) {
    const contract = await this.get(id, actor);
    if (!isManualContractStatus(contract.status)) {
      return { currentStatus: contract.status, allowed: [], termsLocked: true };
    }
    return {
      currentStatus: contract.status,
      allowed: MANUAL_CONTRACT_TRANSITIONS[contract.status],
      termsLocked: IMMUTABLE_CONTRACT_STATUSES.has(contract.status),
    };
  }

  async create(dto: CreateManualContractDto, actorId: string, actor?: JwtUser) {
    const company = await this.repository.findCompany(dto.companyId);
    if (!company) throw new NotFoundException('Empresa nao encontrada.');
    assertInWallet(actor, company, 'Empresa nao encontrada.');
    if (dto.planId && !(await this.repository.findPlan(dto.planId))) throw new NotFoundException('Plano nao encontrado.');
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('O fim da vigencia deve ser posterior ao inicio.');
    const status = dto.status || 'DRAFT';
    const contract = await this.repository.createWithActivation({ ...dto, status, startsAt, endsAt }, actorId);
    let billingSetupPending = false;
    if (status === 'ACTIVE') {
      billingSetupPending = !(await this.setupBilling(contract, actorId));
    }
    return { ...contract, billingSetupPending };
  }

  async update(id: string, dto: UpdateManualContractDto, actorId: string, actor?: JwtUser) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Contrato manual nao encontrado.');
    assertInWallet(actor, current.company, 'Contrato manual nao encontrado.');
    const { status, ...details } = dto;
    const changedDetailKeys = Object.keys(details).filter(
      (key) => details[key as keyof typeof details] !== undefined,
    );

    if (status && status !== current.status) {
      if (changedDetailKeys.length > 0) {
        throw new BadRequestException(
          'Nao altere dados e status na mesma requisicao. Salve os dados e depois use a transicao de status.',
        );
      }
      return this.transition(id, {
        status,
        reason: 'Transicao solicitada pelo endpoint de atualizacao legado.',
      }, actorId, actor);
    }

    if (changedDetailKeys.length === 0) return current;
    if (!isManualContractStatus(current.status) || IMMUTABLE_CONTRACT_STATUSES.has(current.status)) {
      throw new ConflictException(
        'Os termos deste contrato estao protegidos. Crie um novo contrato para alterar as condicoes comerciais.',
      );
    }

    if (details.planId && !(await this.repository.findPlan(details.planId))) throw new NotFoundException('Plano nao encontrado.');
    const startsAt = details.startsAt ? new Date(details.startsAt) : current.startsAt;
    const endsAt = details.endsAt ? new Date(details.endsAt) : current.endsAt;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException('O fim da vigencia deve ser posterior ao inicio.');
    return this.repository.updateDetails(id, { ...details, startsAt, endsAt }, actorId, current);
  }

  async transition(id: string, dto: TransitionManualContractDto, actorId: string, actor?: JwtUser) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Contrato manual nao encontrado.');
    assertInWallet(actor, current.company, 'Contrato manual nao encontrado.');
    if (!isManualContractStatus(current.status)) {
      throw new ConflictException(`O status atual "${current.status}" nao pertence ao ciclo operacional suportado.`);
    }
    if (current.status === dto.status) {
      throw new BadRequestException('O contrato ja esta no status solicitado.');
    }

    const allowed = MANUAL_CONTRACT_TRANSITIONS[current.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transicao invalida de ${current.status} para ${dto.status}. Destinos permitidos: ${allowed.join(', ') || 'nenhum'}.`,
      );
    }

    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt || undefined;
    this.validateTransition(current, dto.status, endsAt);

    const contract = await this.repository.transition(
      id,
      current.status,
      dto.status,
      actorId,
      dto.reason.trim(),
      dto.endsAt ? endsAt : undefined,
    );
    if (!contract) {
      throw new ConflictException('O contrato foi alterado por outro usuario. Atualize os dados e tente novamente.');
    }

    if (dto.status !== 'ACTIVE' || current.status !== 'PENDING_ACCEPTANCE') return contract;
    const billingReady = await this.setupBilling(contract, actorId);
    return { ...contract, billingSetupPending: !billingReady };
  }

  async delete(id: string, actorId: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Contrato manual nao encontrado.');
    if (current.status !== 'DRAFT') {
      throw new ConflictException(
        'Somente contratos em rascunho podem ser excluidos. Cancele os demais para preservar o historico.',
      );
    }
    return this.repository.delete(id, actorId);
  }

  async streamPdf(id: string, actorId: string, res: any, actor?: JwtUser) {
    const contract = await this.repository.findById(id);
    if (!contract) throw new NotFoundException('Contrato manual nao encontrado.');
    assertInWallet(actor, contract.company, 'Contrato manual nao encontrado.');

    const fileName = `contrato-manual-${contract.company?.name?.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || contract.id}.pdf`;
    const planName = contract.plan?.name || 'Plano manual';
    const report = await PdfReport.create({
      title: 'Contrato comercial', number: contract.externalContractNumber ? `Nº ${contract.externalContractNumber}` : undefined, subtitle: 'Contrato manual',
      chip: { label: String(contract.status).replace(/_/g, ' '), tone: contract.status === 'ACTIVE' ? 'ok' : contract.status === 'CANCELED' ? 'bad' : 'warn' },
      brand: { platform: true, name: 'Innovation RH' },
      footerNote: 'Contrato registrado no Innovation RH System.', footerId: `Contrato ${contract.id}`,
    });
    report.parties(
      { title: 'CONTRATADA', name: 'Innovation RH', lines: [`Plano: ${planName}`] },
      { title: 'CONTRATANTE', name: contract.company?.name || 'Empresa', lines: [`CNPJ: ${fmt.document(contract.company?.document) || '-'}`] },
    );
    report.section('Resumo financeiro');
    report.fields([
      ['Valor acordado', fmt.money(Number(contract.agreedAmount))], ['Licenças', String(contract.seatQuantity)],
      ['Pagamento', String(contract.paymentMethod ?? '-')], ['Número externo', contract.externalContractNumber || '-'],
      ['Início', fmt.day(contract.startsAt)], ['Fim', contract.endsAt ? fmt.day(contract.endsAt) : 'Indeterminado'],
    ], 2);
    report.section('Observações');
    report.paragraph(contract.notes || 'Sem observações.');
    if (contract.documentUrl) {
      report.section('Documento vinculado');
      report.notice('Contrato assinado', ['O documento está disponível no endereço abaixo.'], 'info', contract.documentUrl);
    }
    sendPdf(res, await report.finish(), fileName);
  }
  private validateTransition(current: any, nextStatus: ManualContractStatus, endsAt?: Date) {
    if (nextStatus === 'PENDING_ACCEPTANCE' && !current.documentUrl) {
      throw new BadRequestException('Vincule o documento do contrato antes de envia-lo para aceite.');
    }
    if (nextStatus === 'ACTIVE' && !current.documentUrl) {
      throw new BadRequestException('O contrato precisa de um documento vinculado antes da ativacao.');
    }
    if (nextStatus === 'TERMINATION_SCHEDULED') {
      if (!endsAt) throw new BadRequestException('Informe a data de encerramento agendado.');
      if (endsAt <= new Date()) throw new BadRequestException('A data de encerramento agendado deve ser futura.');
    }
    if (nextStatus === 'EXPIRED') {
      if (!endsAt) throw new BadRequestException('Contrato sem fim de vigencia nao pode ser marcado como vencido.');
      if (endsAt > new Date()) throw new BadRequestException('O contrato ainda nao atingiu o fim da vigencia.');
    }
    if (endsAt && endsAt <= current.startsAt) {
      throw new BadRequestException('O fim da vigencia deve ser posterior ao inicio.');
    }
  }

  private async setupBilling(contract: { companyId: string, id: string, plan?: { id: string, name: string } | null, company: { name: string }, startsAt: Date }, actorId: string) {
    try {
      const nextDueDate = new Date(contract.startsAt);
      nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
      const result = await this.finance.ensureManualContractBilling(contract.companyId, nextDueDate);
      await this.repository.recordEvent(contract, actorId, 'MANUAL_CONTRACT_BILLING_READY', {
        nextDueDate: nextDueDate.toISOString(),
        result,
      });
      return true;
    } catch (error) {
      await this.repository.recordEvent(contract, actorId, 'MANUAL_CONTRACT_BILLING_FAILED', {
        message: error instanceof Error ? error.message : 'Falha desconhecida ao configurar cobranca.',
      });
      return false;
    }
  }
}
