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

// SEGURANÃÆ’ââ‚¬Â¡A: e-mail do DEV proprietÃÆ’ÂÂ¡rio da plataforma ÃÂ¢ââ€šÂ¬ââ‚¬Â definido via variÃÆ’ÂÂ¡vel de ambiente
const PLATFORM_OWNER_EMAIL = (process.env.PLATFORM_OWNER_EMAIL ?? '').toLowerCase();
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

  async listCompanies(actor?: JwtUser, query?: { page?: number; limit?: number; search?: string }) {
    const { data, total, page, limit } = await this.repository.listCompanies(actor, query);
    if (actor && actor.role !== 'DEV') {
      const mapped = data.map(c => ({
        ...c,
        internalNotes: undefined,
        asaasCustomerId: c.asaasCustomerId ? '•••' : null,
        asaasSubscriptionId: c.asaasSubscriptionId ? '•••' : null,
      }));
      return { data: mapped, total, page, limit };
    }
    return { data, total, page, limit };
  }

  getOnlineUsers() {
    return this.repository.getOnlineUsers();
  }

  async ghostMode(companyId: string, actor?: JwtUser, req?: any) {
    if (!actor || actor.role !== 'DEV') {
      throw new ForbiddenException('Acesso de suporte permitido somente ao perfil DEV.');
    }

    const company = await this.repository.getCompany(companyId);
    if (!company) throw new NotFoundException('Empresa nÃÆ’ÂÂ£o encontrada');
    if (company.status !== 'ACTIVE') {
      throw new ForbiddenException(`NÃÆ’ÂÂ£o pode acessar empresa ${company.status === 'SUSPENDED' ? 'suspensa' : 'cancelada'}`);
    }

    const reason = req?.body?.reason || 'Suporte tÃÆ’ÂÂ©cnico';

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

    // ÃÂ¢Ã…â€œââ‚¬Â¦ MantÃÆ’ÂÂ©m identidade do DEV ÃÂ¢ââ€šÂ¬ââ‚¬Â nÃÆ’ÂÂ£o impersona o admin da empresa
    const payload = {
      sub: actor.sub,
      email: actor.email,
      name: actor.name,
      role: 'DEV' as const,
      companyId,
      ghostMode: true,
    };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      token: access_token,
      user: payload,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug || company.id,
        status: company.status,
        billingStatus: company.billingStatus,
        isActive: company.isActive,
      },
      ghostMode: true,
    };
  }

  async getCompany(id: string, actor?: JwtUser) {
    const company = await this.repository.getCompany(id);
    if (!company) throw new NotFoundException('Empresa nao encontrada');
    if (actor && actor.role === 'COMERCIAL' && company.commercialOwnerId !== actor.sub) {
      throw new ForbiddenException('Acesso negado: esta empresa nao esta vinculada a sua carteira comercial.');
    }
    const result: any = { ...company, usersCount: company._count.users, employeesCount: company._count.employees };
    if (actor && actor.role !== 'DEV') {
      result.internalNotes = undefined;
      result.asaasCustomerId = result.asaasCustomerId ? 'ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢' : null;
      result.asaasSubscriptionId = result.asaasSubscriptionId ? 'ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢ÃÂ¢ââ€šÂ¬ÂÂ¢' : null;
    }
    return result;
  }

  async companyAuditLogs(id: string, actor?: JwtUser, query?: { page?: number; limit?: number }) {
    await this.getCompany(id, actor);
    return this.repository.listCompanyAuditLogs(id, query);
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
      billingStatus: isFree ? 'ACTIVE' : 'PENDING_PAYMENT',
      trialEndsAt: undefined,
      platformPlanId: selectedPlan?.id,
    });

    let paymentUrl: string | null = null;
    let billingSetupPending = false;
    try {
      const checkout = await this.platformFinance.ensureCompanyOnboardingBilling(created.company.id, actor);
      paymentUrl = checkout.paymentUrl ?? null;
      await this.repository.createAuditLog({
        companyId: created.company.id,
        action: checkout.paymentUrl ? 'BILLING_ONBOARDING_PAYMENT_CREATED' : 'BILLING_ONBOARDING_READY',
        entity: 'Company',
        entityId: created.company.id,
        actor: actor.email,
        userId: actor.sub,
        metadata: {
          planId: created.company.platformPlanId ?? null,
          billingStatus: created.company.billingStatus,
          paymentUrlCreated: Boolean(checkout.paymentUrl),
          trialEndsAt: created.company.trialEndsAt ?? null,
        },
      });
    } catch (error) {
      billingSetupPending = true;
      await this.repository.createAuditLog({
        companyId: created.company.id,
        action: 'BILLING_ONBOARDING_PENDING',
        entity: 'Company',
        entityId: created.company.id,
        actor: actor.email,
        userId: actor.sub,
        metadata: {
          planId: created.company.platformPlanId ?? null,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    await this.repository.createAuditLog({
      companyId: created.company.id,
      action: 'COMPANY_CREATED',
      entity: 'Company',
      entityId: created.company.id,
      actor: actor.email,
      userId: actor.sub,
      metadata: {
        name: created.company.name,
        plan: created.company.plan,
        billingStatus: created.company.billingStatus,
        maxUsers: created.company.maxUsers,
        maxEmployees: created.company.maxEmployees,
        commercialOwnerId: created.company.commercialOwnerId ?? null,
      },
    });
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
    if (actor.role === 'COMERCIAL' && (dto.plan || dto.billingStatus || dto.status || dto.trialEndsAt)) {
      throw new ForbiddenException('Apenas DEV pode alterar planos, status de cobranca ou suspensao.');
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
    
    // Notificar admin(s) da empresa sobre inadimplÃÆ’ÂÂªncia caso mude para PAST_DUE
    if (billingStatus === 'PAST_DUE' && company.billingStatus !== 'PAST_DUE') {
      await this.notificationsService.createAdminNotice(id, actor.sub, {
        type: 'SYSTEM_ALERT',
        title: 'Aviso de InadimplÃÆ’ÂÂªncia e Bloqueio',
        message: 'Consta um dÃÆ’ÂÂ©bito pendente na sua assinatura. Seu acesso a mÃÆ’ÂÂ³dulos foi restrito. Regularize para reativar o acesso integral ÃÆ’ÂÂ  plataforma.',
        priority: 'HIGH',
        targetType: 'ROLE',
        targetRole: 'ADMIN',
      }).catch(err => console.error('[PlatformService] Error sending suspension notice:', err));
    }

    const updated = await this.repository.updateCompany(id, data);
    await this.repository.createAuditLog({
      companyId: id,
      action: 'COMPANY_UPDATED',
      entity: 'Company',
      entityId: id,
      actor: actor.email,
      userId: actor.sub,
      metadata: {
        changedFields: Object.keys(data),
        previous: {
          name: company.name,
          document: company.document,
          plan: company.plan,
          billingStatus: company.billingStatus,
          status: company.status,
          trialEndsAt: company.trialEndsAt ?? null,
          activeModules: company.activeModules ?? [],
        },
        next: {
          name: updated.name,
          document: updated.document,
          plan: updated.plan,
          billingStatus: updated.billingStatus,
          status: updated.status,
          trialEndsAt: updated.trialEndsAt ?? null,
          activeModules: updated.activeModules ?? [],
        },
      },
    });
    return updated;
  }

  async deleteCompany(id: string) {
    const company = await this.getCompany(id);
    await this.repository.deleteCompany(id);
    if (company) {
      await this.repository.createAuditLog({
        companyId: id,
        action: 'COMPANY_ARCHIVED',
        entity: 'Company',
        entityId: id,
        metadata: {
          name: company.name,
          status: company.status,
          billingStatus: company.billingStatus,
          reason: company.suspensionReason ?? 'arquivada_pelo_dev',
        },
      });
    }
    return { success: true };
  }

  async purgeCompany(id: string) {
    await this.repository.purgeCompany(id);
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
    const limit = company.subscription?.seatQuantity ?? 1;
    if (count >= limit) {
      throw new ForbiddenException({ code: 'SEAT_LIMIT_REACHED', message: 'A empresa utiliza todas as licencas contratadas.', used: count, limit });
    }

    const created = await this.repository.createWithEmployeeSync({
      companyId,
      name: normalizeDisplayName(dto.name),
      email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: dto.role ?? 'FUNCIONARIO',
      ...(dto.customPermissions !== undefined && dto.customPermissions !== null ? { customPermissions: dto.customPermissions } : {}),
    });
    if (!created) throw new NotFoundException('Usuario nao encontrado');

    await this.repository.createAuditLog({
      companyId,
      userId: actor.sub,
      action: 'COMPANY_USER_CREATED',
      entity: 'User',
      entityId: created.id,
      actor: actor.email,
      metadata: {
        name: created.name,
        email: created.email,
        role: created.role,
        employeeLinked: Boolean((created as any)?.employee?.id),
      },
    });

    return created;
  }

  async updateCompanyUser(actor: JwtUser, companyId: string, userId: string, dto: UpdatePlatformCompanyUserDto) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    this.assertCompanyUserRoleAllowed(actor, dto.role);
    const current = await this.repository.findCompanyUser(companyId, userId);
    if (!current) throw new NotFoundException('Usuario nao encontrado');
    this.assertCanTouchTargetUser(actor, current.role);

    const { password, name, email, ...rest } = dto;
    const result = await this.repository.updateWithEmployeeSync(companyId, userId, {
      ...rest,
      ...(name !== undefined ? { name: normalizeDisplayName(name) } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    });
    if (!result.count || !result.user) throw new NotFoundException('Usuario nao encontrado');

    await this.repository.createAuditLog({
      companyId,
      userId: actor.sub,
      action: 'COMPANY_USER_UPDATED',
      entity: 'User',
      entityId: userId,
      actor: actor.email,
      metadata: {
        previous: {
          name: current.name,
          email: current.email,
          role: current.role,
          isActive: current.isActive,
        },
        next: {
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          isActive: result.user.isActive,
        },
      },
    });

    return result.user;
  }

  async deleteCompanyUser(actor: JwtUser, companyId: string, userId: string) {
    await this.assertCanManageCompanyUsers(actor, companyId);
    const current = await this.repository.findCompanyUser(companyId, userId);
    if (!current) throw new NotFoundException('Usuario nao encontrado');
    this.assertCanTouchTargetUser(actor, current.role);
    const result = await this.repository.deactivateWithEmployeeSync(companyId, userId);
    if (!result.count || !result.user) throw new NotFoundException('Usuario nao encontrado');

    await this.repository.createAuditLog({
      companyId,
      userId: actor.sub,
      action: 'COMPANY_USER_DEACTIVATED',
      entity: 'User',
      entityId: userId,
      actor: actor.email,
      metadata: {
        previous: {
          name: current.name,
          email: current.email,
          role: current.role,
          isActive: current.isActive,
        },
        next: {
          isActive: false,
          forcePasswordChange: true,
        },
      },
    });

    return { deleted: true, deactivated: true };
  }

  stats(actor?: JwtUser) {
    return this.repository.globalStats(actor);
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
