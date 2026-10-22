import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AccountingPeriodStatus } from '@prisma/client';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { layout } from '../mail/mail-templates';
import { NotificationsService } from '../notifications/notifications.service';
import { TimeClosingService } from '../time-track/time-closing.service';
import { PayrollService } from './payroll.service';

const num = (value: unknown) => Number(value ?? 0);
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const appBase = () => (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

export const PERIOD_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'em rascunho', CALCULATED: 'calculada', PUBLISHED: 'publicada para o RH', RETURNED: 'devolvida pelo RH',
  RELEASED: 'liberada (holerites disponíveis)', PAID: 'paga',
};

/** Status em que o holerite já pode ser visto pelo funcionário. */
export const PAYSLIP_VISIBLE_STATUSES: AccountingPeriodStatus[] = ['RELEASED', 'PAID'];

/** Ajustes que o contador pode ter feito no fechamento (mesma lista do TimeClosingService.adjust). */
const ADJUSTABLE_FIELDS = ['salaryBase', 'overtime50', 'overtime100', 'nightShift', 'absenceMinutes', 'lateMinutes', 'earlyLeaveMinutes'];
/** Lançamentos manuais da folha que o recálculo preserva (a menos que `discardManual`). */
const MANUAL_ITEM_TYPES = ['BONUS', 'COMMISSION', 'OTHER_EARNING', 'ADVANCE', 'OTHER_DEDUCTION'];

export function parseCompetence(month: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(month ?? ''));
  if (!match) throw new BadRequestException('Competência inválida. Use o formato AAAA-MM.');
  const year = Number(match[1]);
  const number = Number(match[2]);
  const start = new Date(Date.UTC(year, number - 1, 1));
  const end = new Date(Date.UTC(year, number, 0));
  return { key: `${match[1]}-${match[2]}`, year, month: number, start, end, startIso: start.toISOString().slice(0, 10), endIso: end.toISOString().slice(0, 10) };
}

/**
 * Fluxo do mês entre contador e RH: calcular -> publicar (trava o ponto) -> devolver -> recalcular -> publicar -> liberar -> pagar.
 * Reaproveita o motor de fechamento (TimeClosingService) e o de folha (PayrollService); aqui só há a orquestração e a máquina de estados.
 */
@Injectable()
export class AccountingPeriodService {
  private readonly logger = new Logger(AccountingPeriodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly closing: TimeClosingService,
    private readonly payroll: PayrollService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- leitura ----------

  private async closingsOf(companyId: string, start: Date, end: Date) {
    return this.prisma.timeClosing.findMany({
      where: { companyId, periodStart: start, periodEnd: end },
      select: {
        id: true, status: true, employeeId: true, grossPay: true, netPay: true, inssDiscount: true, irrfDiscount: true, fgtsAmount: true,
        employee: { select: { name: true } }, _count: { select: { adjustments: true } },
      },
      orderBy: { employee: { name: 'asc' } },
      take: 2000,
    });
  }

  private async payrollsOf(companyId: string, year: number, month: number) {
    return this.prisma.payroll.findMany({
      where: { companyId, referenceYear: year, referenceMonth: month, deletedAt: null, status: { not: 'CANCELLED' } },
      select: { id: true, status: true, employeeId: true, items: { select: { type: true, description: true } } },
      take: 2000,
    });
  }

  private serialize(period: any, closings: any[], payrolls: any[]) {
    const manualPayroll = new Set(payrolls.filter((row) => (row.items ?? []).some((item: any) => MANUAL_ITEM_TYPES.includes(item.type) && !String(item.description).startsWith('DSR'))).map((row) => row.employeeId));
    return {
      id: period?.id ?? null, companyId: period?.companyId, month: period?.month,
      status: period?.status ?? null,
      statusLabel: period ? PERIOD_STATUS_LABEL[period.status] : 'não calculada',
      totals: {
        gross: num(period?.gross), discounts: num(period?.discounts), net: num(period?.net),
        inss: num(period?.inss), fgts: num(period?.fgts), irrf: num(period?.irrf), employees: period?.employees ?? 0,
      },
      calculatedAt: period?.calculatedAt ?? null, publishedAt: period?.publishedAt ?? null, publishedById: period?.publishedById ?? null,
      returnedAt: period?.returnedAt ?? null, returnedById: period?.returnedById ?? null, returnComment: period?.returnComment ?? null,
      releasedAt: period?.releasedAt ?? null, releasedById: period?.releasedById ?? null, paidAt: period?.paidAt ?? null, paidById: period?.paidById ?? null,
      employees: closings.map((row) => {
        const gross = num(row.grossPay);
        const net = num(row.netPay);
        return {
          employeeId: row.employeeId, name: row.employee?.name ?? '-', closingId: row.id, closingStatus: row.status,
          gross, discounts: money(gross - net), net,
          hasManualAdjustment: (row._count?.adjustments ?? 0) > 0 || manualPayroll.has(row.employeeId),
        };
      }),
    };
  }

  /** Visão do contador: existe mesmo sem cálculo (mostra o que há de fechamentos). */
  async viewForAccountant(companyId: string, month: string) {
    const c = parseCompetence(month);
    const period = await this.prisma.accountingPeriod.findUnique({ where: { companyId_month: { companyId, month: c.key } } });
    const [closings, payrolls] = await Promise.all([this.closingsOf(companyId, c.start, c.end), this.payrollsOf(companyId, c.year, c.month)]);
    return this.serialize(period ? period : { companyId, month: c.key }, closings, payrolls);
  }

  /** Visão do RH/ADMIN: só enxerga a competência depois que a contabilidade a publicou. */
  async viewForCompany(companyId: string, month: string) {
    const c = parseCompetence(month);
    const period = await this.prisma.accountingPeriod.findUnique({ where: { companyId_month: { companyId, month: c.key } } });
    if (!period || ['DRAFT', 'CALCULATED'].includes(period.status)) throw new NotFoundException('A contabilidade ainda não publicou esta competência.');
    const [closings, payrolls] = await Promise.all([this.closingsOf(companyId, c.start, c.end), this.payrollsOf(companyId, c.year, c.month)]);
    return this.serialize(period, closings, payrolls);
  }

  // ---------- contador ----------

  async calculate(actor: JwtUser, companyId: string, month: string, discardManual = false) {
    const c = parseCompetence(month);
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    const current = await this.prisma.accountingPeriod.findUnique({ where: { companyId_month: { companyId, month: c.key } } });
    if (current && !['DRAFT', 'CALCULATED', 'RETURNED'].includes(current.status)) {
      throw new ConflictException(`A competência ${c.key} está ${PERIOD_STATUS_LABEL[current.status]} e não pode ser recalculada. Peça ao RH para devolvê-la antes.`);
    }

    // Ajustes manuais do contador: guardados antes, pois gerar de novo recria o fechamento (e apaga o histórico ligado a ele).
    const before = await this.prisma.timeClosing.findMany({ where: { companyId, periodStart: c.start, periodEnd: c.end }, select: { id: true, status: true, employeeId: true } });
    const kept = new Map<string, Map<string, { newValue: string; reason: string }>>();
    if (!discardManual && before.length) {
      const adjustments = await this.prisma.timeClosingAdjustment.findMany({ where: { timeClosingId: { in: before.map((row) => row.id) } }, orderBy: { createdAt: 'asc' } });
      const employeeOf = new Map(before.map((row) => [row.id, row.employeeId]));
      for (const adj of adjustments) {
        if (!ADJUSTABLE_FIELDS.includes(adj.field)) continue;
        const employeeId = employeeOf.get(adj.timeClosingId)!;
        if (!kept.has(employeeId)) kept.set(employeeId, new Map());
        kept.get(employeeId)!.set(adj.field, { newValue: adj.newValue, reason: adj.reason });
      }
    }
    // Fechamento já em revisão/aprovado volta a rascunho para ser regerado (o período não está publicado).
    const notDraft = before.filter((row) => row.status !== 'DRAFT');
    if (notDraft.length) {
      await this.prisma.timeClosing.updateMany({ where: { id: { in: notDraft.map((row) => row.id) } }, data: { status: 'DRAFT', closedAt: null, closedBy: null } });
    }

    const generated = await this.closing.generate(companyId, { ...actor, companyId, role: 'ADMIN' }, { periodStart: c.startIso, periodEnd: c.endIso, month: c.month, year: c.year });
    const fresh: Array<{ id: string; employeeId: string }> = Array.isArray(generated) ? generated : [];
    let reapplied = 0;
    for (const row of fresh) {
      for (const [field, adj] of kept.get(row.employeeId) ?? []) {
        await this.closing.adjust(companyId, actor, row.id, { field, newValue: adj.newValue, reason: `${adj.reason} (mantido no recálculo)` });
        reapplied += 1;
      }
    }

    const payrollReport = await this.syncPayrolls(companyId, c, fresh.map((row) => row.employeeId), discardManual);

    const closings = await this.closingsOf(companyId, c.start, c.end);
    const sum = (key: string) => money(closings.reduce((total, row: any) => total + num(row[key]), 0));
    const gross = sum('grossPay');
    const net = sum('netPay');
    const totals = { gross, net, discounts: money(gross - net), inss: sum('inssDiscount'), irrf: sum('irrfDiscount'), fgts: sum('fgtsAmount'), employees: closings.length };
    const now = new Date();
    const period = await this.prisma.accountingPeriod.upsert({
      where: { companyId_month: { companyId, month: c.key } },
      create: { companyId, month: c.key, status: 'CALCULATED', ...totals, calculatedById: actor.sub, calculatedAt: now },
      update: { status: 'CALCULATED', ...totals, calculatedById: actor.sub, calculatedAt: now },
    });
    await this.audit(companyId, actor.sub, 'ACCOUNTING_PERIOD_CALCULATED', period.id, { month: c.key, previous: current?.status ?? null, discardManual, reappliedAdjustments: reapplied, ...totals, payrolls: payrollReport });
    return { ...(await this.viewForAccountant(companyId, c.key)), reappliedAdjustments: reapplied, payrolls: payrollReport };
  }

  /** Cria as folhas que faltam e recalcula as existentes (preservando lançamentos manuais, salvo `discardManual`). */
  private async syncPayrolls(companyId: string, c: ReturnType<typeof parseCompetence>, employeeIds: string[], discardManual: boolean) {
    const report = { created: 0, recalculated: 0, failed: [] as Array<{ employeeId: string; message: string }> };
    if (!employeeIds.length) return report;
    const existing = await this.prisma.payroll.findMany({
      where: { companyId, employeeId: { in: employeeIds }, referenceYear: c.year, referenceMonth: c.month, deletedAt: null, status: { not: 'CANCELLED' } },
      select: { id: true, status: true, employeeId: true },
    });
    const byEmployee = new Map(existing.map((row) => [row.employeeId, row]));
    const missing: string[] = [];
    for (const employeeId of employeeIds) {
      const row = byEmployee.get(employeeId);
      if (!row) { missing.push(employeeId); continue; }
      try {
        if (row.status === 'APPROVED') await this.payroll.reopen(companyId, row.id);
        await this.payroll.update(companyId, row.id, discardManual ? { items: [] } : {});
        report.recalculated += 1;
      } catch (error: any) {
        report.failed.push({ employeeId, message: error?.response?.message ?? error?.message ?? 'Não foi possível recalcular a folha.' });
      }
    }
    if (missing.length) {
      try {
        const out: any = await this.payroll.create(companyId, { employeeIds: missing, periodStart: c.startIso, periodEnd: c.endIso });
        report.created += out.created?.length ?? 0;
        for (const item of out.failed ?? []) report.failed.push({ employeeId: item.employeeId, message: item.message });
      } catch (error: any) {
        for (const employeeId of missing) report.failed.push({ employeeId, message: error?.response?.message ?? error?.message ?? 'Não foi possível calcular a folha.' });
      }
    }
    return report;
  }

  async publish(actor: JwtUser, companyId: string, month: string) {
    const c = parseCompetence(month);
    const period = await this.prisma.accountingPeriod.findUnique({ where: { companyId_month: { companyId, month: c.key } } });
    if (!period) throw new ConflictException(`A competência ${c.key} ainda não foi calculada. Calcule antes de publicar.`);
    if (!['CALCULATED', 'RETURNED'].includes(period.status)) {
      throw new ConflictException(`Só é possível publicar uma competência calculada ou devolvida pelo RH. Situação atual: ${PERIOD_STATUS_LABEL[period.status]}.`);
    }
    const closings = await this.closingsOf(companyId, c.start, c.end);
    if (!closings.length) throw new ConflictException('Não há fechamentos nesta competência. Calcule antes de publicar.');

    // Travar o período = aprovar os fechamentos (o ponto fica bloqueado para edição, ver period-lock.ts) e as folhas.
    for (const row of closings) {
      if (row.status === 'DRAFT') await this.closing.submitReview(companyId, row.id);
      if (row.status === 'DRAFT' || row.status === 'IN_REVIEW') await this.closing.approve(companyId, row.id);
    }
    for (const row of await this.payrollsOf(companyId, c.year, c.month)) {
      if (row.status === 'DRAFT') await this.payroll.approve(companyId, row.id, actor.sub);
    }

    const claimed = await this.prisma.accountingPeriod.updateMany({
      where: { id: period.id, status: { in: ['CALCULATED', 'RETURNED'] } },
      data: { status: 'PUBLISHED', publishedById: actor.sub, publishedAt: new Date() },
    });
    if (!claimed.count) throw new ConflictException('A competência foi alterada por outra pessoa. Atualize a tela e tente novamente.');
    await this.audit(companyId, actor.sub, 'ACCOUNTING_PERIOD_PUBLISHED', period.id, { month: c.key, previous: period.status, employees: closings.length });
    await this.notifyCompany(companyId, c.key, `Folha de ${c.key} publicada pela contabilidade`, `A contabilidade publicou a competência ${c.key} (${closings.length} funcionário(s)). Revise os valores e libere os holerites ou devolva com um comentário.`);
    return this.viewForAccountant(companyId, c.key);
  }

  // ---------- RH / ADMIN ----------

  private async loadForCompany(companyId: string, month: string, allowed: AccountingPeriodStatus[], action: string) {
    const c = parseCompetence(month);
    const period = await this.prisma.accountingPeriod.findUnique({ where: { companyId_month: { companyId, month: c.key } } });
    if (!period || ['DRAFT', 'CALCULATED'].includes(period.status)) throw new NotFoundException('A contabilidade ainda não publicou esta competência.');
    if (!allowed.includes(period.status)) {
      throw new ConflictException(`Não é possível ${action}: a competência ${c.key} está ${PERIOD_STATUS_LABEL[period.status]}.`);
    }
    return { c, period };
  }

  async returnToAccountant(actor: JwtUser, companyId: string, month: string, comment: string) {
    const text = String(comment ?? '').trim();
    if (!text) throw new BadRequestException('Informe o comentário da devolução para a contabilidade.');
    const { c, period } = await this.loadForCompany(companyId, month, ['PUBLISHED'], 'devolver');
    const claimed = await this.prisma.accountingPeriod.updateMany({
      where: { id: period.id, status: 'PUBLISHED' },
      data: { status: 'RETURNED', returnedById: actor.sub, returnedAt: new Date(), returnComment: text },
    });
    if (!claimed.count) throw new ConflictException('A competência foi alterada por outra pessoa. Atualize a tela e tente novamente.');
    // Destrava: fechamentos aprovados voltam a rascunho (ponto editável) e folhas aprovadas, a rascunho.
    for (const row of await this.closingsOf(companyId, c.start, c.end)) {
      if (row.status === 'APPROVED' || row.status === 'CLOSED') await this.closing.reopen(companyId, actor, row.id, `Competência devolvida pelo RH: ${text}`);
    }
    for (const row of await this.payrollsOf(companyId, c.year, c.month)) {
      if (row.status === 'APPROVED') await this.payroll.reopen(companyId, row.id);
    }
    await this.audit(companyId, actor.sub, 'ACCOUNTING_PERIOD_RETURNED', period.id, { month: c.key, comment: text });
    await this.notifyAccountant(companyId, c.key, text);
    return this.viewForCompany(companyId, c.key);
  }

  async release(actor: JwtUser, companyId: string, month: string) {
    const { c, period } = await this.loadForCompany(companyId, month, ['PUBLISHED'], 'liberar os holerites');
    const claimed = await this.prisma.accountingPeriod.updateMany({ where: { id: period.id, status: 'PUBLISHED' }, data: { status: 'RELEASED', releasedById: actor.sub, releasedAt: new Date() } });
    if (!claimed.count) throw new ConflictException('A competência foi alterada por outra pessoa. Atualize a tela e tente novamente.');
    await this.audit(companyId, actor.sub, 'ACCOUNTING_PERIOD_RELEASED', period.id, { month: c.key });
    return this.viewForCompany(companyId, c.key);
  }

  async markPaid(actor: JwtUser, companyId: string, month: string) {
    const { c, period } = await this.loadForCompany(companyId, month, ['RELEASED'], 'registrar o pagamento');
    const claimed = await this.prisma.accountingPeriod.updateMany({ where: { id: period.id, status: 'RELEASED' }, data: { status: 'PAID', paidById: actor.sub, paidAt: new Date() } });
    if (!claimed.count) throw new ConflictException('A competência foi alterada por outra pessoa. Atualize a tela e tente novamente.');
    for (const row of await this.payrollsOf(companyId, c.year, c.month)) {
      if (row.status === 'APPROVED') await this.payroll.markPaid(companyId, row.id);
    }
    for (const row of await this.closingsOf(companyId, c.start, c.end)) {
      if (row.status === 'APPROVED') await this.closing.close(companyId, actor, row.id);
    }
    await this.audit(companyId, actor.sub, 'ACCOUNTING_PERIOD_PAID', period.id, { month: c.key });
    return this.viewForCompany(companyId, c.key);
  }

  // ---------- auditoria e avisos ----------

  private async audit(companyId: string, userId: string, action: string, entityId: string, metadata: Record<string, unknown>) {
    await this.prisma.auditLog.create({ data: { companyId, userId, action, entity: 'AccountingPeriod', entityId, metadata: metadata as any } });
  }

  /** Sino + e-mail para ADMIN e RH da empresa. Nunca derruba a ação principal. */
  private async notifyCompany(companyId: string, month: string, title: string, message: string) {
    try {
      const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { slug: true } });
      const base = appBase();
      const url = company?.slug && base ? `${base}/${company.slug}/dashboard/payroll` : undefined;
      await this.notifications.createSystemNotice(companyId, { title, message, targetRoles: ['ADMIN', 'RH'], targetUrl: url, source: 'CONTABILIDADE', extraJson: { kind: 'ACCOUNTING_PERIOD_PUBLISHED', month } });
      const users = await this.prisma.user.findMany({ where: { companyId, isActive: true, role: { in: ['ADMIN', 'RH'] } }, select: { email: true } });
      const content = { subject: title, html: layout(title, `<p style="margin:0 0 10px">${message}</p>`, url ? { label: 'Abrir a folha', url } : undefined), text: `${message}${url ? `\n\n${url}` : ''}` };
      for (const user of users) if (user.email) await this.mail.send(user.email, content);
    } catch (error) {
      this.logger.warn(`Aviso ao RH não enviado: ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Sino (na empresa do contador, que é onde ele lê) + e-mail para o contador responsável pela empresa. */
  private async notifyAccountant(companyId: string, month: string, comment: string) {
    try {
      const link = await this.prisma.accountingClient.findFirst({ where: { companyId }, select: { responsibleId: true } });
      if (!link?.responsibleId) return;
      const accountant = await this.prisma.user.findUnique({ where: { id: link.responsibleId }, select: { id: true, companyId: true, email: true, isActive: true } });
      if (!accountant || !accountant.isActive) return;
      const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
      const title = `Competência ${month} devolvida por ${company?.name ?? 'cliente'}`;
      const message = `O RH devolveu a competência ${month}. Comentário: ${comment}`;
      await this.prisma.notification.create({
        data: {
          companyId: accountant.companyId, type: 'SYSTEM_NOTICE', title, message, priority: 'HIGH', source: 'CONTABILIDADE',
          status: 'SENT', sentAt: new Date(), extraJson: { kind: 'ACCOUNTING_PERIOD_RETURNED', month, clientCompanyId: companyId },
          recipients: { create: [{ userId: accountant.id, status: 'UNREAD' }] },
        },
      });
      if (accountant.email) await this.mail.send(accountant.email, { subject: title, html: layout(title, `<p style="margin:0 0 10px">${message.replace(/</g, '&lt;')}</p>`), text: message });
    } catch (error) {
      this.logger.warn(`Aviso ao contador não enviado: ${error instanceof Error ? error.message : error}`);
    }
  }
}
