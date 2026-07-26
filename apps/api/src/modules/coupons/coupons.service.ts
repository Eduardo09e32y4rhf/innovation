import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponsRepository } from './coupons.repository';

@Injectable()
export class CouponsService {
  constructor(private readonly repository: CouponsRepository) {}

  list() {
    return this.repository.list();
  }

  async create(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,80}$/.test(code)) throw new BadRequestException('Codigo de cupom invalido.');
    if (await this.repository.findByCode(code)) throw new ConflictException('Codigo de cupom ja existe.');
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) throw new BadRequestException('A expiracao deve ser posterior ao inicio.');
    return this.repository.create({ ...dto, code, startsAt, expiresAt, trialDays: dto.trialDays ?? 30 });
  }

  async update(id: string, dto: UpdateCouponDto) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('Cupom nao encontrado.');

    const data: Record<string, unknown> = {};

    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,80}$/.test(code)) throw new BadRequestException('Codigo de cupom invalido.');
      const duplicate = await this.repository.findByCode(code);
      if (duplicate && duplicate.id !== id) throw new ConflictException('Codigo de cupom ja existe.');
      data.code = code;
    }

    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.trialDays !== undefined) data.trialDays = dto.trialDays;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.maxRedemptions !== undefined) data.maxRedemptions = dto.maxRedemptions;

    const startsAt = data.startsAt instanceof Date ? data.startsAt : existing.startsAt;
    const expiresAt = data.expiresAt instanceof Date ? data.expiresAt : existing.expiresAt;
    if (startsAt && expiresAt && expiresAt <= startsAt) throw new BadRequestException('A expiracao deve ser posterior ao inicio.');

    return this.repository.update(id, data);
  }

  async setActive(id: string, isActive: boolean) {
    try {
      return await this.repository.update(id, { isActive });
    } catch {
      throw new NotFoundException('Cupom nao encontrado.');
    }
  }
}