import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  list(companyId: string) {
    return this.repository.list(companyId);
  }

  async get(companyId: string, id: string) {
    const user = await this.repository.findById(companyId, id);
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    return user;
  }

  async create(companyId: string, dto: CreateUserDto) {
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail ja cadastrado');

    // Verifica limite de usuarios da empresa
    const [count, limits] = await Promise.all([
      this.repository.countByCompany(companyId),
      this.repository.getCompanyLimits(companyId),
    ]);
    const maxUsers = limits?.maxUsers ?? 6;
    if (count >= maxUsers) {
      throw new ForbiddenException(
        `Limite de ${maxUsers} usuarios atingido para esta empresa. Contate o suporte para ampliar o plano.`,
      );
    }

    return this.repository.create({
      companyId,
      name: dto.name,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: dto.role ?? 'FUNCIONARIO',
    });
  }

  async update(companyId: string, id: string, dto: UpdateUserDto) {
    const { password, ...rest } = dto;
    const data = {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    };
    const result = await this.repository.update(companyId, id, data);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return this.get(companyId, id);
  }

  async delete(companyId: string, id: string) {
    const result = await this.repository.delete(companyId, id);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return { deleted: true };
  }

  /** Retorna quantos usuarios a empresa usa vs o limite — exibido na tela de Usuarios. */
  async usage(companyId: string) {
    const [count, limits] = await Promise.all([
      this.repository.countByCompany(companyId),
      this.repository.getCompanyLimits(companyId),
    ]);
    return { used: count, max: limits?.maxUsers ?? 6 };
  }
}
