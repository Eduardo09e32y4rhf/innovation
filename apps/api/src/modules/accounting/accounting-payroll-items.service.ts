import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { roundMoney } from '../../common/utils/money';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { AccountingHubService } from './accounting-hub.service';
import { PayrollItemDto } from './accounting-payroll.dto';
import { checkPayrollLimits, isDeductionType, ITEM_TYPE_LABEL, LOAN_TYPES, TAX_TYPES } from '../payroll/clt-discounts';
import { MANUAL_ITEM_TYPES } from '../payroll/dto/create-payroll.dto';

/** Linhas ligadas a uma coluna da folha: editar a linha edita a coluna (e o motor refaz impostos e líquido). */
const COLUMN_FIELD: Record<string, 'baseSalary' | 'overtimeAmount' | 'nightShiftAmount'> = { BASE_SALARY: 'baseSalary', OVERTIME: 'overtimeAmount', NIGHT_SHIFT: 'nightShiftAmount' };
const MANUAL_TYPES = MANUAL_ITEM_TYPES as readonly string[];
const FORCED_NOTE = ' [limite excedido, mantido pela contabilidade]';

/**
 * Edição manual da folha pela contabilidade: incluir, editar e remover linhas com motivo, autoria e data.
 * Não calcula nada: depois de cada mudança chama o motor único (AccountingHubService.recalcPayrollRow → PayrollCalculationService)
 * para refazer INSS, IRRF, FGTS e líquido.
 */
@Injectable()
export class AccountingPayrollItemsService {
  constructor(private readonly prisma: PrismaService, private readonly hub: AccountingHubService) {}

  private reasonOf(dto: PayrollItemDto) {
    const reason = String(dto.reason ?? '').trim();
    if (reason.length < 5) throw new BadRequestException('Informe o motivo da alteração (mínimo 5 caracteres).');
    return reason;
  }

  /** Refaz impostos/líquido e confere os limites. Passou do limite sem `forceLimit` → erro (a transação inteira é desfeita). */
  private async finish(tx: any, actor: JwtUser, payroll: any, dto: PayrollItemDto, audit: { action: string; itemId: string | null; metadata: Record<string, unknown> }) {
    const fresh = await tx.payroll.findUnique({ where: { id: payroll.id }, include: { employee: { select: { name: true, dependents: true } } } });
    const { updated, result } = await this.hub.recalcPayrollRow(tx, fresh);
    const items = await tx.payrollItem.findMany({ where: { payrollId: payroll.id } });
    const limits = checkPayrollLimits(items, { baseSalary: Number(updated.baseSalary), grossSalary: result.grossPay, inssAmount: result.inssDiscount, irrfAmount: result.irrfDiscount });
    // Só barra o limite da categoria que está sendo lançada (um consignado antigo acima da margem não impede lançar um bônus).
    const type = String(audit.metadata.type ?? '');
    const scoped = [...((LOAN_TYPES as readonly string[]).includes(type) ? [limits.loan] : []), ...(type === 'VALE_TRANSPORTE' ? [limits.transport] : [])];
    const exceeded = scoped.filter((limit) => limit.exceeded);
    if (exceeded.length && !dto.forceLimit) {
      throw new BadRequestException({ statusCode: 400, code: 'LIMIT_EXCEEDED', message: `${exceeded.map((e) => e.message).join(' ')} Confirme o lançamento marcando "manter mesmo assim" e justificando.`, limits: exceeded });
    }
    if (exceeded.length && audit.itemId) {
      await tx.payrollItem.update({ where: { id: audit.itemId }, data: { manualReason: `${String(dto.reason).trim()}${FORCED_NOTE}` } });
    }
    await tx.auditLog.create({
      data: {
        companyId: payroll.companyId, userId: actor.sub, action: audit.action, entity: 'PayrollItem', entityId: audit.itemId ?? payroll.id,
        metadata: { ...audit.metadata, payrollId: payroll.id, reason: String(dto.reason).trim(), forcedLimit: exceeded.length > 0, net: result.netPay, gross: result.grossPay, actorEmail: actor.email } as any,
      },
    });
    return { payrollId: payroll.id, gross: result.grossPay, inss: result.inssDiscount, irrf: result.irrfDiscount, fgts: result.fgtsAmount, net: result.netPay, limitWarnings: exceeded.map((e) => e.message) };
  }

  async add(actor: JwtUser, payrollId: string, dto: PayrollItemDto) {
    const reason = this.reasonOf(dto);
    if (!dto.type || !MANUAL_TYPES.includes(dto.type)) throw new BadRequestException('Escolha o tipo da linha.');
    if (!dto.amount || dto.amount <= 0) throw new BadRequestException('Informe um valor maior que zero.');
    const payroll = await this.hub.loadEditablePayroll(actor, payrollId);
    const description = (dto.description ?? '').trim() || ITEM_TYPE_LABEL[dto.type];
    return this.prisma.$transaction(async (tx: any) => {
      const item = await tx.payrollItem.create({
        data: { payrollId, companyId: payroll.companyId, type: dto.type as any, description, amount: roundMoney(dto.amount!), isDeduction: isDeductionType(dto.type!), isManual: true, manualReason: reason, editedById: actor.sub, editedAt: new Date() },
      });
      return this.finish(tx, actor, payroll, { ...dto, reason }, { action: 'ACCOUNTING_PAYROLL_ITEM_ADDED', itemId: item.id, metadata: { type: dto.type, description, next: Number(item.amount) } });
    });
  }

  async update(actor: JwtUser, payrollId: string, itemId: string, dto: PayrollItemDto) {
    const reason = this.reasonOf(dto);
    const payroll = await this.hub.loadEditablePayroll(actor, payrollId);
    const item = await this.prisma.payrollItem.findFirst({ where: { id: itemId, payrollId } });
    if (!item) throw new NotFoundException('Linha da folha não encontrada.');
    if ((TAX_TYPES as readonly string[]).includes(item.type)) throw new BadRequestException('INSS, IRRF e FGTS são calculados pela tabela vigente e não podem ser digitados. Corrija a base (proventos e descontos) e recalcule.');
    const column = COLUMN_FIELD[item.type];
    const isColumn = !!column && (item.isColumnLine || !item.isManual);
    const nextType = dto.type && dto.type !== item.type ? dto.type : item.type;
    if (nextType !== item.type && (isColumn || !MANUAL_TYPES.includes(item.type) || !MANUAL_TYPES.includes(nextType))) throw new BadRequestException('O tipo desta linha não pode ser trocado.');
    const amount = dto.amount !== undefined ? roundMoney(dto.amount) : Number(item.amount);
    const description = dto.description?.trim() || item.description;
    return this.prisma.$transaction(async (tx: any) => {
      if (isColumn) await tx.payroll.update({ where: { id: payrollId }, data: { [column]: amount } });
      await tx.payrollItem.update({
        where: { id: itemId },
        data: { type: nextType as any, description, amount, isDeduction: isDeductionType(nextType), isManual: true, manualReason: reason, editedById: actor.sub, editedAt: new Date(), ...(isColumn ? { isColumnLine: true } : {}) },
      });
      return this.finish(tx, actor, payroll, { ...dto, reason }, { action: 'ACCOUNTING_PAYROLL_ITEM_UPDATED', itemId, metadata: { type: nextType, description, previous: Number(item.amount), next: amount, previousDescription: item.description } });
    });
  }

  async remove(actor: JwtUser, payrollId: string, itemId: string, reasonText: string) {
    const dto = { reason: String(reasonText ?? '').trim() } as PayrollItemDto;
    this.reasonOf(dto);
    const payroll = await this.hub.loadEditablePayroll(actor, payrollId);
    const item = await this.prisma.payrollItem.findFirst({ where: { id: itemId, payrollId } });
    if (!item) throw new NotFoundException('Linha da folha não encontrada.');
    if ((TAX_TYPES as readonly string[]).includes(item.type) || item.type === 'BASE_SALARY') throw new BadRequestException('Esta linha não pode ser removida: o salário base e os impostos fazem parte do cálculo. Para mudar o valor, edite a linha.');
    const column = COLUMN_FIELD[item.type];
    const isColumn = !!column && (item.isColumnLine || !item.isManual);
    return this.prisma.$transaction(async (tx: any) => {
      if (isColumn) await tx.payroll.update({ where: { id: payrollId }, data: { [column]: 0 } });
      await tx.payrollItem.delete({ where: { id: itemId } });
      return this.finish(tx, actor, payroll, dto, { action: 'ACCOUNTING_PAYROLL_ITEM_REMOVED', itemId: null, metadata: { removedItemId: itemId, removedType: item.type, description: item.description, previous: Number(item.amount) } });
    });
  }
}
