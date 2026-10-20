import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { AsaasFiscalService } from './asaas-fiscal.service';

export type FiscalAdjustmentKind = 'MANUAL_REVIEW' | 'CANCEL_PENDING';
export type FiscalAdjustmentAction = 'RETRY_CANCEL' | 'REISSUE' | 'MARK_RESOLVED';

export interface FiscalAdjustmentItem {
  id: string;
  kind: FiscalAdjustmentKind;
  reasonCode: string;
  reason: string;
  invoiceId: string;
  company: { id: string; name: string } | null;
  amount: number;
  description: string | null;
  asaasInvoiceId: string | null;
  invoiceStatus: string | null;
  createdAt: Date;
}

const MANUAL = 'NFSE_MANUAL_ADJUSTMENT';
const RESOLVED = 'NFSE_ADJUSTMENT_RESOLVED';
const REASON_LABEL: Record<string, string> = {
  chargeback: 'Chargeback: aguardar a disputa e decidir sobre a nota',
  estorno_parcial: 'Estorno parcial: a nota não aceita cancelamento parcial, emita a substituta pelo valor líquido',
  cancelamento_pendente: 'Cancelamento da nota falhou: tentar novamente',
  cancelamento_negado: 'A prefeitura negou o cancelamento: a nota segue válida. Trate com a prefeitura (substituição/devolução) e marque como resolvido',
  emissao_recusada: 'A emissão da nota foi recusada (dado fiscal inválido). Corrija o cadastro/valor e reemita',
  emissao_esgotada: 'A emissão da nota falhou várias vezes (provedor fora do ar). Reemita ou trate no painel do Asaas',
};

@Injectable()
export class FiscalAdjustmentsService {
  constructor(private readonly prisma: PrismaService, private readonly fiscal: AsaasFiscalService) {}

  async list(filter: { companyId?: string } = {}): Promise<FiscalAdjustmentItem[]> {
    const where = filter.companyId ? { companyId: filter.companyId } : {};
    const [manual, pending] = await Promise.all([
      this.prisma.auditLog.findMany({ where: { action: MANUAL, ...where }, orderBy: { createdAt: 'desc' }, take: 300 }),
      this.prisma.platformInvoice.findMany({ where: { invoiceStatus: 'CANCEL_PENDING', deletedAt: null, ...where }, orderBy: { updatedAt: 'desc' }, take: 300 }),
    ]);

    const manualIds = [...new Set(manual.map((row) => row.entityId).filter((id): id is string => Boolean(id)))];
    const resolved = manualIds.length
      ? await this.prisma.auditLog.findMany({ where: { action: RESOLVED, entityId: { in: manualIds } }, select: { entityId: true, metadata: true, createdAt: true } })
      : [];
    const isResolved = (invoiceId: string, reason: string, createdAt: Date) =>
      resolved.some((row) => row.entityId === invoiceId && (row.metadata as { reason?: string } | null)?.reason === reason && row.createdAt >= createdAt);

    const open = manual.filter((row) => row.entityId && !isResolved(row.entityId, String((row.metadata as { reason?: string } | null)?.reason ?? ''), row.createdAt));
    const invoiceIds = [...new Set([...open.map((row) => row.entityId as string), ...pending.map((row) => row.id)])];
    const invoices = invoiceIds.length
      ? await this.prisma.platformInvoice.findMany({ where: { id: { in: invoiceIds } }, include: { company: { select: { id: true, name: true } } } })
      : [];
    const byId = new Map(invoices.map((invoice) => [invoice.id, invoice]));

    const items: FiscalAdjustmentItem[] = [];
    const seen = new Set<string>();
    for (const row of open) {
      const invoice = byId.get(row.entityId as string);
      if (!invoice) continue;
      const reason = String((row.metadata as { reason?: string } | null)?.reason ?? 'revisao_manual');
      const key = `${invoice.id}:${reason}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(this.toItem(`${row.id}`, 'MANUAL_REVIEW', reason, invoice, row.createdAt));
    }
    for (const invoice of pending) {
      const full = byId.get(invoice.id) ?? { ...invoice, company: null };
      items.push(this.toItem(`cancel:${invoice.id}`, 'CANCEL_PENDING', 'cancelamento_pendente', full as any, invoice.updatedAt));
    }
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async resolve(invoiceId: string, action: FiscalAdjustmentAction, note: string | undefined, actor: JwtUser) {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId }, select: { id: true, companyId: true, invoiceStatus: true, asaasInvoiceId: true, deletedAt: true } });
    if (!invoice || invoice.deletedAt) throw new NotFoundException('Fatura não encontrada.');

    const open = (await this.list({ companyId: invoice.companyId })).filter((item) => item.invoiceId === invoiceId);
    if (!open.length) throw new ConflictException('Esta fatura não tem ajuste fiscal pendente.');
    const manualReason = open.find((item) => item.kind === 'MANUAL_REVIEW')?.reasonCode;

    let outcome: string;
    if (action === 'RETRY_CANCEL') {
      if (!open.some((item) => item.kind === 'CANCEL_PENDING')) throw new BadRequestException('Só há tentativa de cancelamento para notas com cancelamento pendente.');
      const result = await this.fiscal.handleRefund(invoiceId, 'REFUNDED');
      if (result.result === 'FAILED') throw new ConflictException('O provedor ainda recusou o cancelamento. A nota continua pendente.');
      outcome = result.result;
    } else if (action === 'REISSUE') {
      if (manualReason === 'estorno_parcial') throw new BadRequestException('Estorno parcial: emita a nota substituta pelo valor líquido no painel do Asaas e depois marque como resolvido.');
      if (manualReason === 'cancelamento_negado' || invoice.invoiceStatus === 'CANCELLATION_DENIED') throw new BadRequestException('A prefeitura negou o cancelamento e a nota segue válida: reemitir duplicaria o documento fiscal. Resolva com a prefeitura e marque como resolvido.');
      if (!['CANCELED', 'ERROR', 'RETRY'].includes(invoice.invoiceStatus ?? '')) throw new ConflictException('Cancele a nota atual e aguarde a confirmação antes de reemitir.');
      const result = await this.fiscal.ensureForInvoice(invoiceId, { force: true });
      if (result.result === 'FAILED' || result.result === 'SKIPPED') throw new ConflictException(result.message);
      outcome = result.result;
    } else {
      if (!note || note.trim().length < 5) throw new BadRequestException('Explique em ao menos 5 caracteres como o ajuste foi resolvido.');
      outcome = 'MARKED';
    }

    for (const item of open) {
      if (item.kind === 'MANUAL_REVIEW' && (action === 'MARK_RESOLVED' || action === 'REISSUE')) {
        await this.prisma.auditLog.create({ data: { companyId: invoice.companyId, userId: actor.sub, action: RESOLVED, entity: 'PlatformInvoice', entityId: invoiceId, metadata: { reason: item.reasonCode, action, outcome, note: note?.trim() ?? null, actorEmail: actor.email } } });
      }
    }
    if (action === 'MARK_RESOLVED' && open.some((item) => item.kind === 'CANCEL_PENDING')) {
      await this.prisma.platformInvoice.update({ where: { id: invoiceId }, data: { invoiceStatus: 'CANCELED', nfeStatus: 'CANCELED' } });
      await this.prisma.auditLog.create({ data: { companyId: invoice.companyId, userId: actor.sub, action: RESOLVED, entity: 'PlatformInvoice', entityId: invoiceId, metadata: { reason: 'cancelamento_pendente', action, outcome, note: note?.trim() ?? null, actorEmail: actor.email } } });
    }
    return { invoiceId, action, outcome };
  }

  private toItem(id: string, kind: FiscalAdjustmentKind, reason: string, invoice: any, createdAt: Date): FiscalAdjustmentItem {
    return {
      id, kind, reasonCode: reason, reason: REASON_LABEL[reason] ?? reason, invoiceId: invoice.id,
      company: invoice.company ? { id: invoice.company.id, name: invoice.company.name } : null,
      amount: Number(invoice.amount), description: invoice.description ?? null,
      asaasInvoiceId: invoice.asaasInvoiceId ?? null, invoiceStatus: invoice.invoiceStatus ?? null, createdAt,
    };
  }
}
