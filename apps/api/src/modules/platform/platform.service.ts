import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

import { NotificationsService } from '../notifications/notifications.service';
import { PlatformFinanceService } from '../finance/platform-finance.service';

@Injectable()
export class PlatformService {
  constructor(
    private readonly repository: PlatformRepository,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly platformFinance: PlatformFinanceService,
  ) {}

  listCompanies() {
    return this.repository.listCompanies();
  }

  getOnlineUsers() {
    return this.repository.getOnlineUsers();
  }

  async ghostMode(companyId: string, actor?: JwtUser, req?: any) {
    if (!actor || actor.role !== 'DEV') {
      throw new ForbiddenException('Acesso de suporte permitido somente ao perfil DEV.');
    }

    const company = await this.repository.getCompany(companyId);
    if (!company) throw new NotFoundException('Empresa não encontrada');
    if (company.status !== 'ACTIVE') {
      throw new ForbiddenException(`Não pode acessar empresa ${company.status === 'SUSPENDED' ? 'suspensa' : 'cancelada'}`);
    }

    const reason = req?.body?.reason || 'Suporte técnico';

    await this.repository.createAuditLog({
      companyId,
      action: 'GHOST_MODE_STARTED',
      actor: actor.email,
      metadata: {
        reason,
        targetCompany: company.name,
        actorEmail: actor.email,
        ip: req?.ip || 'unknown',
        userAgent: req?.headers?.['user-agent'] || 'unknown',
      },
    });

    // ✅ Mantém identidade do DEV — não impersona o admin da empresa
    const payload = {
      sub: actor.sub,
      email: actor.email,
      name: actor.name,
      role: 'DEV' as const,
      companyId,
      ghostMode: true,
    };
    return { token: this.jwtService.sign(payload) };
  }

  async getCompany(id: string) {
    const company = await this.repository.getCompany(id);
    if (!company) throw new NotFoundException('Empresa nao encontrada');
    return { ...company, usersCount: company._count.users, employeesCount: company._count.employees };
  }

  async companyAuditLogs(id: string) {
    await this.getCompany(id);
    return this.repository.listCompanyAuditLogs(id);
  }

  async createCompany(actor: JwtUser, dto: CreatePlatformCompanyDto) {
    const adminEmail = dto.adminEmail.trim().toLowerCase();
    const existing = await this.repository.findUserByEmail(adminEmail);
    if (existing) throw new ConflictException('E-mail do admin ja esta em uso');
    const selectedPlan = dto.planId ? await this.repository.getPlan(dto.planId) : null;
    if (dto.planId && !selectedPlan) throw new NotFoundException('Plano nao encontrado ou inativo.');

    const isFree = Boolean(selectedPlan?.isFree);
    const created = await this.repository.createCompanyWithAdmin({
      name: normalizeDisplayName(dto.name),
      document: emptyToNull(dto.document?.replace(/\D/g, '')),
      maxUsers: selectedPlan?.maxUsers ?? dto.maxUsers ?? 6,
      maxEmployees: selectedPlan?.maxEmployees ?? dto.maxEmployees ?? 50,
      adminName: normalizeDisplayName(dto.adminName),
      adminEmail,
      adminPasswordHash: await bcrypt.hash(dto.adminPassword, 12),
      commercialOwnerId: actor.role === 'COMERCIAL' ? actor.sub : null,
      plan: isFree ? 'FREE' : 'PRO',
      billingStatus: isFree ? 'ACTIVE' : 'TRIAL',
      trialEndsAt: isFree ? undefined : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      platformPlanId: selectedPlan?.id,
    });

    let paymentUrl: string | null = null;
    let billingSetupPending = false;
    try {
      const checkout = await this.platformFinance.ensureCompanyOnboardingBilling(created.company.id);
      paymentUrl = checkout.paymentUrl ?? null;
    } catch (error) {
      billingSetupPending = true;
    }
    return { ...created.company, adminId: created.adminId, paymentUrl, billingSetupPending };
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

    // Auto-suspend on PAST_DUE, auto-activate on ACTIVE billing
    const autoStatus = billingStatus === 'PAST_DUE' ? 'SUSPENDED' 
                     : billingStatus === 'ACTIVE' ? 'ACTIVE' 
                     : undefined;
    const autoSuspensionReason = billingStatus === 'PAST_DUE' ? 'inadimplencia'
                               : billingStatus === 'ACTIVE' ? null
                               : undefined;

    const isCustomPlan = plan && !['FREE', 'BASE', 'PRO', 'ENTERPRISE'].includes(plan);

    const data = {
      ...rest,
      ...(name !== undefined ? { name: normalizeDisplayName(name) } : {}),
      ...(document !== undefined ? { document: emptyToNull(document) } : {}),
      ...(status ? { status } : autoStatus !== undefined ? { status: autoStatus } : {}),
      ...((status === 'ACTIVE' || autoStatus === 'ACTIVE') ? { suspensionReason: null } : {}),
      ...(plan ? (isCustomPlan ? { plan: 'PRO', platformPlanId: plan } : { plan: plan as any, platformPlanId: null }) : {}),
      ...(billingStatus ? { billingStatus } : {}),
      ...(trialEndsAt !== undefined ? { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null } : {}),
      ...(activeModules !== undefined ? { activeModules } : {}),
      ...(status === 'CANCELLED' && !dto.suspensionReason ? { suspensionReason: 'solicitacao_voluntaria' } : {}),
      ...(autoSuspensionReason !== undefined && !status ? { suspensionReason: autoSuspensionReason } : {}),
    };
    
    // Notificar admin(s) da empresa sobre inadimplência caso mude para PAST_DUE
    if (billingStatus === 'PAST_DUE' && company.billingStatus !== 'PAST_DUE') {
      await this.notificationsService.createAdminNotice(id, actor.sub, {
        type: 'SYSTEM_ALERT',
        title: 'Aviso de Inadimplência e Bloqueio',
        message: 'Consta um débito pendente na sua assinatura. Seu acesso a módulos foi restrito. Regularize para reativar o acesso integral à plataforma.',
        priority: 'HIGH',
        targetType: 'ROLE',
        targetRole: 'ADMIN',
      }).catch(err => console.error('[PlatformService] Error sending suspension notice:', err));
    }

    return this.repository.updateCompany(id, data);
  }

  async deleteCompany(id: string) {
    await this.repository.deleteCompany(id);
    return { success: true };
  }

  async lookupCnpj(cnpj: string) {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new ConflictException('CNPJ invalido');
    }
    try {
      const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}`);
      if (!response.ok) {
        throw new Error('Falha ao consultar CNPJ');
      }
      const data = (await response.json()) as any;
      if (data.status === 'ERROR') {
        throw new ConflictException(data.message || 'CNPJ rejeitado pela Receita');
      }
      return data;
    } catch (e: any) {
      throw new ConflictException(e.message || 'Erro ao consultar CNPJ');
    }
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
    if (count >= (company.plan === 'PRO' ? 9999 : company.plan === 'BASE' ? 20 : 6)) {
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