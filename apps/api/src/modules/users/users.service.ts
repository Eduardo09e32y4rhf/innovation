import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { JwtUser } from '../../common/types/auth.types';
import { normalizeDisplayName } from '../../common/utils/text-normalization';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async list(companyId: string, actor: JwtUser) {
    const users = await this.repository.list(companyId);
    return this.filterRestrictedUsers(users, actor);
  }

  async get(companyId: string, actor: JwtUser, id: string) {
    const user = await this.repository.findById(companyId, id);
    if (!this.canAccessUser(actor, user)) throw new NotFoundException('Usuario nao encontrado');
    return user;
  }

  async create(companyId: string, actor: JwtUser, dto: CreateUserDto) {
    this.assertRoleChangeAllowed(actor, dto.role);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.repository.findByEmail(email);
    if (existing) throw new ConflictException('E-mail ja cadastrado');

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
      name: normalizeDisplayName(dto.name),
      email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: dto.role ?? 'FUNCIONARIO',
    });
  }

  async update(companyId: string, actor: JwtUser, id: string, dto: UpdateUserDto) {
    this.assertRoleChangeAllowed(actor, dto.role);
    await this.get(companyId, actor, id);

    const { password, name, email, ...rest } = dto;
    const data = {
      ...rest,
      ...(name !== undefined ? { name: normalizeDisplayName(name) } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    };
    const result = await this.repository.update(companyId, id, data);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return this.get(companyId, actor, id);
  }

  async delete(companyId: string, actor: JwtUser, id: string) {
    await this.get(companyId, actor, id);
    const result = await this.repository.delete(companyId, id);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return { deleted: true };
  }

  async usage(companyId: string) {
    const [count, limits] = await Promise.all([
      this.repository.countByCompany(companyId),
      this.repository.getCompanyLimits(companyId),
    ]);
    return { used: count, max: limits?.maxUsers ?? 6 };
  }

  private assertRoleChangeAllowed(actor: JwtUser, nextRole?: string) {
    if (!nextRole) return;
    const actorRole = String(actor.role || '').toUpperCase();
    const protectedRoles = ['DEV', 'COMERCIAL'];

    if (protectedRoles.includes(nextRole) && actor.email.toLowerCase() !== PLATFORM_OWNER_EMAIL) {
      throw new ForbiddenException('Apenas o dono da plataforma pode criar ou promover Super Admin/Comercial.');
    }
    if (actorRole === 'RH' && ['ADMIN', 'DEV', 'COMERCIAL'].includes(nextRole)) {
      throw new ForbiddenException('RH nao pode criar ou promover Administrador, Comercial ou Super Admin.');
    }
    if (actorRole === 'GESTOR' || actorRole === 'FUNCIONARIO' || actorRole === 'CONSULTA') {
      throw new ForbiddenException('Perfil sem permissao para alterar usuarios.');
    }
  }

  private canAccessUser(actor: JwtUser, user?: { role?: string } | null) {
    if (!user) return false;
    if (actor.role === 'DEV') return true;
    return String(user.role || '').toUpperCase() !== 'DEV';
  }

  private filterRestrictedUsers(users: Array<{ role?: string }>, actor: JwtUser) {
    if (actor.role === 'DEV') return users;
    return users.filter((user) => String(user.role || '').toUpperCase() !== 'DEV');
  }}

