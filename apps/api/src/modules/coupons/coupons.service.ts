import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { CouponsRepository } from './coupons.repository';

@Injectable()
export class CouponsService {
  constructor(private readonly repository: CouponsRepository) {}

  list() { return this.repository.list(); }

  async create(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,80}$/.test(code)) throw new BadRequestException('Código de cupom inválido.');
    if (await this.repository.findByCode(code)) throw new ConflictException('Código de cupom já existe.');
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) throw new BadRequestException('A expiração deve ser posterior ao início.');
    return this.repository.create({ ...dto, code, startsAt, expiresAt, trialDays: dto.trialDays ?? 30 });
  }

  async setActive(id: string, isActive: boolean) {
    try {
      return await this.repository.update(id, { isActive });
    } catch {
      throw new NotFoundException('Cupom não encontrado.');
    }
  }
}
