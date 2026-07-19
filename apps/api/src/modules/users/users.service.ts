import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { JwtUser } from '../../common/types/auth.types';
import { normalizeDisplayName } from '../../common/utils/text-normalization';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { UserRole } from '../../common/types/auth.types';
import { UsersRepository } from './users.repository';

const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';

const ROLE_MANAGEMENT: Record<string, string[]> = {
  DEV: ['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  COMERCIAL: [],
  ADMIN: ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  RH: ['RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  GESTOR: [],
  FUNCIONARIO: [],
  CONSULTA: [],
};

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async list(companyId: string, actor: JwtUser) {
    if (actor.role === 'DEV') {
      return this.repository.listAll();
    }
    const users = await this.repository.list(companyId);
    return this.filterRestrictedUsers(users, actor);
  }

  async ping(userId: string) {
    return this.repository.ping(userId);
  }

  async get(companyId: string, actor: JwtUser, id: string) {
    const user = actor.role === 'DEV'
      ? await this.repository.findById(id)
      : await this.repository.findById(id, companyId);
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    if (!this.canAccessUser(actor, user)) throw new NotFoundException('Usuario nao encontrado');
    return user;
  }

  async create(companyId: string, actor: JwtUser, dto: CreateUserDto) {
    this.assertRoleChangeAllowed(actor, dto.role);

    const targetCompanyId = actor.role === 'DEV' ? dto.companyId : companyId;
    if (actor.role === 'DEV' && !targetCompanyId) {
      throw new ForbiddenException('DEV deve informar a empresa para criar um usuario.');
    }
    if (!targetCompanyId) {
      throw new ForbiddenException('Empresa nao informada.');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.repository.findByEmail(email);
    if (existing) throw new ConflictException('E-mail ja cadastrado');

    const [count, limits] = await Promise.all([
      this.repository.countByCompany(targetCompanyId),
      this.repository.getCompanyLimits(targetCompanyId),
    ]);
    if (!limits) {
      throw new NotFoundException('Empresa nao encontrada.');
    }
    const maxUsers = this.resolveMaxUsers(limits);
    if (count >= maxUsers) {
      throw new ForbiddenException(
        `Limite de ${maxUsers} usuarios atingido para esta empresa. Contate o suporte para ampliar o plano.`,
      );
    }

    return this.repository.create({
      companyId: targetCompanyId,
      name: normalizeDisplayName(dto.name),
      email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: dto.role ?? 'FUNCIONARIO',
    });
  }

  async update(companyId: string, actor: JwtUser, id: string, dto: UpdateUserDto) {
    this.assertRoleChangeAllowed(actor, dto.role);
    const user = await this.get(companyId, actor, id);
    if (user.role && !this.canManageRole(actor.role, user.role)) {
      throw new ForbiddenException('Voce nao tem permissao para editar este usuario.');
    }

    const { password, name, email, ...rest } = dto;
    const data = {
      ...rest,
      ...(name !== undefined ? { name: normalizeDisplayName(name) } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    };
    const result = actor.role === 'DEV'
      ? await this.repository.update(id, data)
      : await this.repository.update(id, data, companyId);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return this.get(companyId, actor, id);
  }

  async resetPassword(companyId: string, actor: JwtUser, id: string, dto: ResetUserPasswordDto) {
    const user = actor.role === 'DEV'
      ? await this.repository.findByIdWithPassword(id)
      : await this.repository.findByIdWithPassword(id, companyId);
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    if (user.role && !this.canManageRole(actor.role, user.role)) {
      throw new ForbiddenException('Voce nao tem permissao para resetar a senha deste usuario.');
    }
    if (actor.sub === id) {
      throw new ConflictException('Nao e permitido resetar a propria senha por esta acao.');
    }
    
    if (!dto.newPassword) {
      throw new BadRequestException('A nova senha nao foi fornecida');
    }
    const newPassword = dto.newPassword;

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash || '');
    if (isSamePassword) {
      throw new ConflictException('A nova senha temporaria nao pode ser igual a senha atual.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const data = {
      passwordHash,
      forcePasswordChange: true,
      failedLoginAttempts: 0,
      passwordResetToken: null,
      passwordResetExpires: null,
      passwordChangedAt: new Date(),
    };
    const result = actor.role === 'DEV'
      ? await this.repository.update(id, data)
      : await this.repository.update(id, data, companyId);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return { reset: true };
  }

  async delete(companyId: string, actor: JwtUser, id: string) {
    const user = await this.get(companyId, actor, id);
    if (user.role && !this.canManageRole(actor.role, user.role)) {
      throw new ForbiddenException('Voce nao tem permissao para deletar este usuario.');
    }
    const result = actor.role === 'DEV'
      ? await this.repository.delete(id)
      : await this.repository.delete(id, companyId);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return { deleted: true };
  }

  async usage(companyId: string) {
    const [count, limits] = await Promise.all([
      this.repository.countByCompany(companyId),
      this.repository.getCompanyLimits(companyId),
    ]);
    return {
      used: count,
      max: this.resolveMaxUsers(limits),
    };
  }

  private resolveMaxUsers(
    limits: { maxUsers?: number | null; platformPlan?: { maxUsers?: number | null } | null } | null,
  ): number {
    const companyLimit = Number(limits?.maxUsers);
    if (Number.isFinite(companyLimit) && companyLimit > 0) return companyLimit;
    const planLimit = Number(limits?.platformPlan?.maxUsers);
    if (Number.isFinite(planLimit) && planLimit > 0) return planLimit;
    return 1; // Sem plano = 1 usuário apenas
  }

  private assertRoleChangeAllowed(actor: JwtUser, nextRole?: string) {
    if (!nextRole) return;
    const actorRole = String(actor?.role || '').toUpperCase();
    const protectedRoles = ['DEV', 'COMERCIAL'];

    if (protectedRoles.includes(nextRole) && actor?.email.toLowerCase() !== PLATFORM_OWNER_EMAIL) {
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
    if (actor?.role === 'DEV') return true;
    return String(user.role || '').toUpperCase() !== 'DEV';
  }

  private filterRestrictedUsers(users: Array<{ role?: string }>, actor: JwtUser) {
    if (actor?.role === 'DEV') return users;
    return users.filter((user) => String(user.role || '').toUpperCase() !== 'DEV');
  }

  private canManageRole(actorRole?: string, targetRole?: string) {
    if (!actorRole || !targetRole) return false;
    return ROLE_MANAGEMENT[actorRole.toUpperCase()]?.includes(targetRole.toUpperCase()) ?? false;
  }
}


