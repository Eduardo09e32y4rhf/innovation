import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { JwtUser } from '../../common/types/auth.types';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { CreatePlatformCompanyUserDto } from './dto/create-platform-company-user.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';
import { UpdatePlatformCompanyUserDto } from './dto/update-platform-company-user.dto';
import { PlatformRepository } from './platform.repository';

const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';
const PROTECTED_PLATFORM_ROLES = ['DEV', 'COMERCIAL'];

@Injectable()
export class PlatformService {
  constructor(private readonly repository: PlatformRepository) {}

  listCompanies() {
    return this.repository.listCompanies();
  }

  async getCompany(id: string) {
    const company = await this.repository.getCompany(id);
    if (!company) throw new NotFoundException('Empresa nao encontrada');
    return company;
  }

  async createCompany(actor: JwtUser, dto: CreatePlatformCompanyDto) {
    const existing = await this.repository.findUserByEmail(dto.adminEmail);
    if (existing) throw new ConflictException('E-mail do admin ja esta em uso');

    const adminPasswordHash = await bcrypt.hash(dto.adminPassword, 12);
    return this.repository.createCompanyWithAdmin({
      name: dto.name,
      document: dto.document,
      maxUsers: dto.maxUsers ?? 6,
      maxEmployees: dto.maxEmployees ?? 50,
      adminName: dto.adminName,
      adminEmail: dto.adminEmail,
      adminPasswordHash,
      commercialOwnerId: actor.role === 'COMERCIAL' ? actor.sub : null,
    });
  }

  updateCompany(id: string, dto: UpdatePlatformCompanyDto) {
    const status = dto.status ?? (dto.isActive === false ? 'SUSPENDED' : dto.isActive === true ? 'ACTIVE' : undefined);
    const data = {
      ...dto,
      ...(status ? { status, isActive: status === 'ACTIVE' } : {}),
      ...(status === 'ACTIVE' ? { suspensionReason: null } : {}),
      ...(status === 'CANCELLED' && !dto.suspensionReason ? { suspensionReason: 'solicitacao_voluntaria' } : {}),
    };
    return this.repository.updateCompany(id, data);
  }

  async deleteCompany(id: string) {
    await this.repository.deleteCompany(id);
    return { deleted: true };
  }

  async listCompanyUsers(actor: JwtUser, companyId: string) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    return this.repository.listCompanyUsers(companyId);
  }

  async createCompanyUser(actor: JwtUser, companyId: string, dto: CreatePlatformCompanyUserDto) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    this.assertCompanyUserRoleAllowed(actor, dto.role);

    const company = await this.getCompany(companyId);
    const existing = await this.repository.findUserByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail ja cadastrado');

    const count = await this.repository.countUsers(companyId);
    if (count >= company.maxUsers) {
      throw new ForbiddenException(`Limite de ${company.maxUsers} usuarios atingido para esta empresa.`);
    }

    return this.repository.createCompanyUser({
      companyId,
      name: dto.name,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: dto.role ?? 'FUNCIONARIO',
    });
  }

  async updateCompanyUser(actor: JwtUser, companyId: string, userId: string, dto: UpdatePlatformCompanyUserDto) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    this.assertCompanyUserRoleAllowed(actor, dto.role);
    const current = await this.repository.findCompanyUser(companyId, userId);
    if (!current) throw new NotFoundException('Usuario nao encontrado');
    this.assertCanTouchTargetUser(actor, current.role);

    const { password, ...rest } = dto;
    const result = await this.repository.updateCompanyUser(companyId, userId, {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    });
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return this.repository.findCompanyUser(companyId, userId);
  }

  async deleteCompanyUser(actor: JwtUser, companyId: string, userId: string) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    const current = await this.repository.findCompanyUser(companyId, userId);
    if (!current) throw new NotFoundException('Usuario nao encontrado');
    this.assertCanTouchTargetUser(actor, current.role);
    const result = await this.repository.deleteCompanyUser(companyId, userId);
    if (!result.count) throw new NotFoundException('Usuario nao encontrado');
    return { deleted: true };
  }

  stats() {
    return this.repository.globalStats();
  }

  private async assertCanManageCompanyUsers(actor: JwtUser, companyId: string) {
    if (actor.role === 'DEV') return;
    if (actor.role !== 'COMERCIAL') throw new ForbiddenException('Perfil sem permissao para gerir usuarios de empresas.');
    const company = await this.getCompany(companyId);
    if (company.commercialOwnerId !== actor.sub) {
      throw new ForbiddenException('Comercial so pode gerir empresas sob sua responsabilidade.');
    }
  }

  private assertCompanyUserRoleAllowed(actor: JwtUser, nextRole?: string) {
    if (!nextRole) return;
    if (PROTECTED_PLATFORM_ROLES.includes(nextRole) && actor.email.toLowerCase() !== PLATFORM_OWNER_EMAIL) {
      throw new ForbiddenException('Apenas o dono da plataforma pode criar Super Admin ou Comercial.');
    }
    if (actor.role === 'COMERCIAL' && PROTECTED_PLATFORM_ROLES.includes(nextRole)) {
      throw new ForbiddenException('Comercial nao pode criar Super Admin ou Comercial.');
    }
  }

  private assertCanTouchTargetUser(actor: JwtUser, targetRole: string) {
    if (actor.email.toLowerCase() === PLATFORM_OWNER_EMAIL) return;
    if (PROTECTED_PLATFORM_ROLES.includes(targetRole)) {
      throw new ForbiddenException('Perfil protegido nao pode ser alterado por este usuario.');
    }
  }
}
