import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { CouponsRepository } from './coupons.repository';
import { HIGH_DISCOUNT_FIXED, HIGH_DISCOUNT_PERCENT, isHighDiscount } from './coupon-rules';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

const CODE = /^[A-Z0-9_-]{3,80}$/;

@Injectable()
export class CouponsService {
  constructor(private readonly repository: CouponsRepository) {}

  list() {
    return this.repository.list();
  }

  private assertCanGrant(actor: JwtUser, type: string, value: number) {
    if (isHighDiscount(type, value) && !['DEV', 'CEO'].includes(actor.role)) {
      throw new ForbiddenException(`Descontos acima de ${HIGH_DISCOUNT_PERCENT}% (ou R$ ${HIGH_DISCOUNT_FIXED}/mes) precisam ser criados por DEV ou CEO.`);
    }
  }

  async create(dto: CreateCouponDto, actor: JwtUser) {
    const code = dto.code.trim().toUpperCase();
    if (!CODE.test(code)) throw new BadRequestException('Codigo de cupom invalido (use A-Z, 0-9, _ ou -, de 3 a 80 caracteres).');
    if (await this.repository.findByCode(code)) throw new ConflictException('Codigo de cupom ja existe.');

    const type = dto.type ?? 'TRIAL_DAYS';
    if (type !== 'TRIAL_DAYS') {
      if (!dto.value) throw new BadRequestException('Informe o valor do desconto.');
      if (type === 'PERCENT' && dto.value > 100) throw new BadRequestException('O desconto percentual nao pode passar de 100%.');
      this.assertCanGrant(actor, type, dto.value);
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) throw new BadRequestException('A expiracao deve ser posterior ao inicio.');

    return this.repository.create({
      code, description: dto.description?.trim() || null, type,
      value: type === 'TRIAL_DAYS' ? null : dto.value,
      durationCycles: type === 'TRIAL_DAYS' ? null : dto.durationCycles ?? null,
      trialDays: type === 'TRIAL_DAYS' ? dto.trialDays ?? 30 : 0,
      allowedPlanIds: dto.allowedPlanIds ?? [], minSeats: dto.minSeats ?? null,
      maxRedemptions: dto.maxRedemptions ?? null, startsAt, expiresAt, createdBy: actor.sub,
    });
  }

  async update(id: string, dto: UpdateCouponDto, actor: JwtUser) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Cupom nao encontrado.');
    const data: Record<string, unknown> = {};

    if (dto.code !== undefined) {
      if (existing.redemptionCount > 0) throw new ConflictException('Nao e possivel trocar o codigo de um cupom que ja foi usado.');
      const code = dto.code.trim().toUpperCase();
      if (!CODE.test(code)) throw new BadRequestException('Codigo de cupom invalido.');
      const duplicate = await this.repository.findByCode(code);
      if (duplicate && duplicate.id !== id) throw new ConflictException('Codigo de cupom ja existe.');
      data.code = code;
    }
    if (dto.value !== undefined || dto.durationCycles !== undefined) {
      if (existing.redemptionCount > 0) throw new ConflictException('O valor e a duracao do desconto nao mudam depois que o cupom foi usado. Crie outro cupom.');
      if (existing.type === 'TRIAL_DAYS') throw new BadRequestException('Cupom de teste gratis nao tem valor de desconto.');
      if (dto.value !== undefined) {
        if (existing.type === 'PERCENT' && dto.value > 100) throw new BadRequestException('O desconto percentual nao pode passar de 100%.');
        this.assertCanGrant(actor, existing.type, dto.value);
        data.value = dto.value;
      }
      if (dto.durationCycles !== undefined) data.durationCycles = dto.durationCycles;
    }
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.trialDays !== undefined) data.trialDays = dto.trialDays;
    if (dto.allowedPlanIds !== undefined) data.allowedPlanIds = dto.allowedPlanIds;
    if (dto.minSeats !== undefined) data.minSeats = dto.minSeats;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.maxRedemptions !== undefined) {
      if (dto.maxRedemptions < existing.redemptionCount) throw new BadRequestException('O limite nao pode ser menor que os usos ja registrados.');
      data.maxRedemptions = dto.maxRedemptions;
    }

    const startsAt = data.startsAt instanceof Date ? data.startsAt : existing.startsAt;
    const expiresAt = data.expiresAt instanceof Date ? data.expiresAt : existing.expiresAt;
    if (startsAt && expiresAt && expiresAt <= startsAt) throw new BadRequestException('A expiracao deve ser posterior ao inicio.');

    return this.repository.update(id, data);
  }

  async setActive(id: string, isActive: boolean) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Cupom nao encontrado.');
    return this.repository.update(id, { isActive });
  }
}
