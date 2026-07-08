import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { JwtUser } from '../../common/types/auth.types';
import { emptyToNull, normalizeDisplayName } from '../../common/utils/text-normalization';
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
    const adminEmail = dto.adminEmail.trim().toLowerCase();
    const existing = await this.repository.findUserByEmail(adminEmail);
    if (existing) throw new ConflictException('E-mail do admin ja esta em uso');

    
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const adminPasswordHash = await bcrypt.hash(dto.adminPassword, 12);
    return this.repository.createCompanyWithAdmin({
      name: normalizeDisplayName(dto.name),
      document: emptyToNull(dto.document),
      maxUsers: dto.maxUsers ?? 6,
      maxEmployees: dto.maxEmployees ?? 50,
      adminName: normalizeDisplayName(dto.adminName),
      adminEmail,
      adminPasswordHash,
      commercialOwnerId: actor.role === 'COMERCIAL' ? actor.sub : null,
        plan: 'FREE',
        billingStatus: 'TRIAL',
        trialEndsAt,
    });
  }

  async updateCompany(actor: JwtUser, id: string, dto: UpdatePlatformCompanyDto) {
    if (actor.role !== 'DEV' && actor.role !== 'COMERCIAL') {
      throw new ForbiddenException('Apenas DEV ou COMERCIAL pode alterar limites/licencas da empresa.');
    }
    const company = await this.getCompany(id);
    if (actor.role === 'COMERCIAL' && company.commercialOwnerId !== actor.sub) {
      throw new ForbiddenException('Comercial so pode alterar empresas sob sua responsabilidade.');
    }
    const status = dto.status;
    const { name, document, plan, billingStatus, trialEndsAt, activeModules, ...rest } = dto;
    const data = {
      ...rest,
      ...(name !== undefined ? { name: normalizeDisplayName(name) } : {}),
      ...(document !== undefined ? { cnpj: emptyToNull(document) } : {}),
      ...(status ? { status } : {}),
      ...(status === 'ACTIVE' ? { suspensionReason: null } : {}),
      ...(plan ? { plan } : {}),
      ...(billingStatus ? { billingStatus } : {}),
      ...(trialEndsAt !== undefined ? { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null } : {}),
      ...(activeModules !== undefined ? { activeModules } : {}),
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
    const email = dto.email.trim().toLowerCase();
    const existing = await this.repository.findUserByEmail(email);
    if (existing) throw new ConflictException('E-mail ja cadastrado');

    const count = await this.repository.countUsers(companyId);
    if (count >= (company.plan === 'PRO' ? 9999 : company.plan === 'STARTER' ? 20 : 6)) {
      throw new ForbiddenException(`Limite de usuarios atingido para esta empresa.`);
    }

    return this.repository.createCompanyUser({
      companyId,
      name: normalizeDisplayName(dto.name),
      email,
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

    const { password, name, email, ...rest } = dto;
    const result = await this.repository.updateCompanyUser(companyId, userId, {
      ...rest,
      ...(name !== undefined ? { name: normalizeDisplayName(name) } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
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