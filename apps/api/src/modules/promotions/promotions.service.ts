import { isFeatureEnabled } from '../../common/feature-flags';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CronLock } from '../../common/redis/cron-lock.decorator';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { checkPromotion, DEFAULT_POLICY, promotionMessage, validatePolicy, type PromotionPolicyLike } from './promotion-rules';

const todaySp = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const dayDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);

import { PromotionDto } from './dto/promotion.dto';
export { PromotionDto };

/**
 * Promoção feita pela empresa: o RH lança, o sistema confere a política, ajusta cargo e salário na data de vigência
 * e avisa o colaborador sozinho (sem comunicado manual).
 */
@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async getPolicy(companyId: string): Promise<PromotionPolicyLike> {
    const row = await this.prisma.promotionPolicy.findUnique({ where: { companyId } });
    if (!row) return { ...DEFAULT_POLICY };
    return { minMonthsInRole: row.minMonthsInRole, maxRaisePercent: row.maxRaisePercent === null ? null : Number(row.maxRaisePercent), requireReason: row.requireReason, positions: row.positions, autoNotify: row.autoNotify };
  }

  async savePolicy(companyId: string, actor: JwtUser, body: Partial<PromotionPolicyLike>) {
    const problem = validatePolicy(body);
    if (problem) throw new BadRequestException(problem);
    const data = {
      minMonthsInRole: Number(body.minMonthsInRole ?? 0),
      maxRaisePercent: body.maxRaisePercent === null || body.maxRaisePercent === undefined || (body.maxRaisePercent as unknown) === '' ? null : Number(body.maxRaisePercent),
      requireReason: body.requireReason !== false,
      positions: [...new Set((body.positions ?? []).map((p) => String(p).trim()).filter(Boolean))].slice(0, 100),
      autoNotify: body.autoNotify !== false,
      updatedByUserId: actor.sub,
    };
    await this.prisma.promotionPolicy.upsert({ where: { companyId }, create: { companyId, ...data }, update: data });
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'PROMOTION_POLICY_SAVED', entity: 'PromotionPolicy', metadata: data as any } });
    return this.getPolicy(companyId);
  }

  async list(companyId: string, status?: string) {
    // API-05: GET so le. A aplicacao das promocoes vencidas e do cron diario (dailyJob) ou do POST /promotions/apply-due.
    const rows = await this.prisma.employeePromotion.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
      take: 300,
      include: { employee: { select: { id: true, name: true, position: true, department: true } } },
    });
    return rows.map((r) => ({ ...r, previousSalary: r.previousSalary === null ? null : Number(r.previousSalary), newSalary: r.newSalary === null ? null : Number(r.newSalary) }));
  }

  async create(companyId: string, actor: JwtUser, dto: PromotionDto) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, companyId }, select: { id: true, name: true, position: true, salary: true, admissionDate: true, status: true, userId: true } });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');
    if (employee.status === 'TERMINATED') throw new BadRequestException('Funcionário desligado não pode ser promovido.');
    const policy = await this.getPolicy(companyId);
    const last = await this.prisma.employeePromotion.findFirst({ where: { companyId, employeeId: employee.id, status: 'APPLIED' }, orderBy: { effectiveDate: 'desc' }, select: { effectiveDate: true } });
    const salary = dto.newSalary === undefined || dto.newSalary === null || String(dto.newSalary).trim() === '' ? null : typeof dto.newSalary === 'number' ? dto.newSalary : Number(String(dto.newSalary).replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
    const input = { newPosition: dto.newPosition?.trim() || null, newSalary: salary, effectiveDate: String(dto.effectiveDate ?? '').slice(0, 10), reason: dto.reason?.trim() || null };
    const pending = await this.prisma.employeePromotion.count({ where: { companyId, employeeId: employee.id, status: 'SCHEDULED' } });
    if (pending > 0) throw new BadRequestException('Esta pessoa já tem uma promoção agendada. Cancele-a antes de lançar outra.');
    const problem = checkPromotion(policy, { position: employee.position, salary: employee.salary === null ? null : Number(employee.salary), admissionDate: employee.admissionDate, lastPromotionAt: last?.effectiveDate ?? null }, input, todaySp());
    if (problem) throw new BadRequestException(problem);

    const created = await this.prisma.employeePromotion.create({
      data: {
        companyId, employeeId: employee.id, previousPosition: employee.position, newPosition: input.newPosition,
        previousSalary: employee.salary === null ? null : Number(employee.salary), newSalary: input.newSalary,
        effectiveDate: dayDate(input.effectiveDate), reason: input.reason, createdByUserId: actor.sub,
      },
    });
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'PROMOTION_CREATED', entity: 'EmployeePromotion', entityId: created.id, metadata: { employeeId: employee.id, newPosition: input.newPosition, newSalary: input.newSalary, effectiveDate: input.effectiveDate } } });
    if (input.effectiveDate <= todaySp()) return this.apply(created.id, actor.sub);
    return { ...created, status: 'SCHEDULED', previousSalary: created.previousSalary === null ? null : Number(created.previousSalary), newSalary: created.newSalary === null ? null : Number(created.newSalary) };
  }

  async cancel(companyId: string, actor: JwtUser, id: string) {
    const result = await this.prisma.employeePromotion.updateMany({ where: { id, companyId, status: 'SCHEDULED' }, data: { status: 'CANCELED', canceledAt: new Date() } });
    if (!result.count) throw new BadRequestException('Só é possível cancelar promoção agendada (que ainda não valeu).');
    await this.prisma.auditLog.create({ data: { companyId, userId: actor.sub, action: 'PROMOTION_CANCELED', entity: 'EmployeePromotion', entityId: id } });
    return { id, status: 'CANCELED' };
  }

  /** Aplica uma promoção: cargo e salário no cadastro + aviso automático ao colaborador. */
  async apply(id: string, actorId?: string) {
    const promo = await this.prisma.employeePromotion.findUnique({ where: { id }, include: { employee: { select: { id: true, name: true, userId: true } } } });
    if (!promo || promo.status !== 'SCHEDULED') return promo;
    await this.prisma.$transaction([
      this.prisma.employee.update({ where: { id: promo.employeeId }, data: { ...(promo.newPosition ? { position: promo.newPosition } : {}), ...(promo.newSalary !== null ? { salary: promo.newSalary } : {}) } }),
      this.prisma.employeePromotion.update({ where: { id }, data: { status: 'APPLIED', appliedAt: new Date() } }),
      this.prisma.auditLog.create({ data: { companyId: promo.companyId, userId: actorId, action: 'PROMOTION_APPLIED', entity: 'EmployeePromotion', entityId: id, metadata: { employeeId: promo.employeeId, from: { position: promo.previousPosition, salary: promo.previousSalary === null ? null : Number(promo.previousSalary) }, to: { position: promo.newPosition, salary: promo.newSalary === null ? null : Number(promo.newSalary) } } as any } }),
    ]);
    const policy = await this.getPolicy(promo.companyId);
    let notificationId: string | null = null;
    if (policy.autoNotify && promo.employee.userId) {
      try {
        const effective = promo.effectiveDate.toISOString().slice(0, 10);
        const notice = await this.notifications.createAdminNotice(promo.companyId, actorId ?? promo.createdByUserId ?? '', {
          type: 'PROMOTION_NOTICE', title: 'Parabéns, você foi promovido(a)!',
          message: promotionMessage({ newPosition: promo.newPosition, newSalary: promo.newSalary === null ? null : Number(promo.newSalary), effectiveDate: effective, reason: promo.reason }),
          employeeIds: [promo.employeeId], newPosition: promo.newPosition ?? undefined, newSalary: promo.newSalary === null ? undefined : Number(promo.newSalary), effectiveDate: effective,
        });
        notificationId = (notice as any)?.id ?? (notice as any)?.notifications?.[0]?.id ?? null;
      } catch (cause: any) { this.logger.warn(`Promoção ${id} aplicada, mas o aviso não foi enviado: ${cause?.message}`); }
    }
    if (notificationId) await this.prisma.employeePromotion.update({ where: { id }, data: { notificationId } });
    return this.prisma.employeePromotion.findUnique({ where: { id } });
  }

  /** Aplica as promoções agendadas que já venceram (de uma empresa ou de todas). */
  async applyDue(companyId?: string) {
    const due = await this.prisma.employeePromotion.findMany({ where: { status: 'SCHEDULED', effectiveDate: { lte: dayDate(todaySp()) }, ...(companyId ? { companyId } : {}) }, select: { id: true }, take: 500 });
    for (const item of due) await this.apply(item.id).catch((cause) => this.logger.error(`Falha ao aplicar promoção ${item.id}: ${cause?.message}`));
    return due.length;
  }

  @Cron('10 6 * * *', { timeZone: 'America/Sao_Paulo' })
  @CronLock('promotions.dailyJob', 3000)
  async dailyJob() {
    if (!isFeatureEnabled('promotions')) return;
    const n = await this.applyDue(); if (n) this.logger.log(`${n} promoção(ões) aplicada(s).`);
  }
}
