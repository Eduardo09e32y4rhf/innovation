import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtUser, UserRole } from '../../common/types/auth.types';

import { NotificationsService } from '../notifications/notifications.service';
import { PlatformFinanceService } from '../finance/platform-finance.service';

// SEGURANÇA: e-mail do DEV proprietário da plataforma — definido via variável de ambiente
const PLATFORM_OWNER_EMAIL = (process.env.PLATFORM_OWNER_EMAIL ?? '').toLowerCase();
const LOGIN_DENIED_MESSAGE = 'Nao foi possivel entrar';
const PASSWORD_MAX_AGE_DAYS = 30;
const PASSWORD_RESET_PURPOSE = 'PASSWORD_RESET';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly platformFinance: PlatformFinanceService,
  ) {}

  publicPlans() {
    return this.repository.listPublicPlans();
  }

  async registerCompany(dto: RegisterCompanyDto) {
    const email = dto.email.trim().toLowerCase();
    const document = dto.document.replace(/\D/g, '');
    const existing = await this.repository.findUserByEmail(email);
    if (existing) throw new ConflictException('Este e-mail ja esta cadastrado. Entre na sua conta para continuar.');
    const existingCompany = await this.repository.findCompanyByDocument(document);
    if (existingCompany) {
      throw new ConflictException('Este CPF/CNPJ ja possui uma empresa cadastrada. Entre com o administrador existente.');
    }

    const selectedPlan = await this.repository.findPublicPlan(dto.planId);
    if (!selectedPlan) throw new NotFoundException('O plano selecionado nao esta mais disponivel.');
    if (dto.seatQuantity > selectedPlan.maxUsers) {
      throw new BadRequestException(`O plano selecionado permite no maximo ${selectedPlan.maxUsers} usuarios.`);
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const company = await this.repository.createCompanyWithAdmin({
      ...dto,
      email,
      document,
      passwordHash,
      platformPlanId: selectedPlan?.id,
      maxUsers: dto.seatQuantity,
      maxEmployees: selectedPlan.maxEmployees ?? 50,
      activeModules: selectedPlan?.activeModules ?? ['employees', 'time-track', 'vacations', 'management'],
      isFree: selectedPlan?.isFree ?? false,
    });
    const admin = company.users[0];

    let checkout: { active: boolean; paymentUrl: string | null | undefined } = { active: Boolean(selectedPlan?.isFree), paymentUrl: null };
    let billingSetupPending = false;
    if (!selectedPlan?.isFree) {
      try {
        checkout = await this.platformFinance.ensureCompanyOnboardingBilling(company.id);
      } catch (error) {
        billingSetupPending = true;
        this.logger.error(`Cadastro ${company.id} criado, mas checkout Asaas ficou pendente: ${String(error)}`);
      }
    }

    return {
      ...(await this.buildAuthResponse({
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        companyId: admin.companyId,
        role: this.resolveRole(admin.email, admin.role),
        customPermissions: admin.customPermissions,
        companyStatus: company.status,
        billingStatus: company.billingStatus,
      }, false)),
      paymentUrl: checkout.paymentUrl,
      billingSetupPending,
    };
  }

  async login(dto: LoginDto, requestMeta?: { ipAddress?: string; userAgent?: string }) {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user || !user.isActive) {
      await this.auditInvalidLogin(dto.email, requestMeta);
      throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    }

    if (user.failedLoginAttempts >= 3) {
      throw new UnauthorizedException('Conta bloqueada por excesso de tentativas. Redefina sua senha.');
    }

    const role = this.resolveRole(user.email, user.role);
    if (!this.canAccessCompany(user.company, role)) {
      await this.auditInvalidLogin(dto.email, requestMeta, user.companyId, user.id);
      throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      await this.repository.incrementFailedLogins(user.id);
      await this.auditInvalidLogin(dto.email, requestMeta, user.companyId, user.id);
      if (user.failedLoginAttempts + 1 >= 3) {
         throw new UnauthorizedException('Conta bloqueada por excesso de tentativas. Redefina sua senha.');
      }
      throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    }

    if (user.failedLoginAttempts > 0) {
      await this.repository.resetFailedLogins(user.id);
    }

    return this.buildAuthResponse({ 
      sub: user.id, 
      email: user.email, 
      name: user.name, 
      companyId: user.companyId, 
      role, 
      customPermissions: user.customPermissions,
      companyStatus: user.company?.status,
      billingStatus: user.company?.billingStatus,
    }, this.passwordChangeRequired(user));
  }


  async requestPasswordReset(dto: RequestPasswordResetDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const user = await this.repository.findUserWithEmployeeByEmail(dto.email);
    if (!user || !user.isActive) return { requested: true };
    const role = this.resolveRole(user.email, user.role);
    if (!this.canAccessCompany(user.company, role)) return { requested: true };

    const { randomBytes } = await import('node:crypto');
    const code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await this.repository.setResetCode(user.id, code, expires);

    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    try {
      // Notifica todos os perfis privilegiados da empresa que podem liberar o código:
      // GESTOR (direto do colaborador), RH e ADMIN (responsáveis pela empresa)
      const rolesParaNotificar = ['GESTOR', 'RH', 'ADMIN'] as const;
      await Promise.allSettled(
        rolesParaNotificar.map((role) =>
          this.notificationsService.createAdminNotice(user.companyId, user.id, {
            type: 'SYSTEM_NOTICE',
            title: 'Código de Recuperação de Senha',
            message: `O colaborador ${user.employee?.name || user.name} (Email: ${user.email}) solicitou recuperação de senha. Informe o código apenas ao colaborador presencialmente.`,
            priority: 'HIGH',
            targetType: 'ROLE',
            targetRole: role,
            source: 'Security',
            extraJson: { resetCode: code },
          }),
        ),
      );
    } catch (err) {
      console.error('Failed to notify privileged roles about reset code:', err);
    }

    return { requested: true };
  }

  async validateResetCode(dto: { email: string; code: string; cpfStart: string; registration: string }) {
    const user = await this.repository.findUserWithEmployeeByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Dados de validação incorretos');
    
    if (!user.resetPasswordCode || user.resetPasswordCode !== dto.code.trim().toUpperCase()) {
      throw new UnauthorizedException('Código inválido ou expirado');
    }
    if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
      throw new UnauthorizedException('Código expirado');
    }

    const employee = user.employee;
    if (!employee) {
      throw new UnauthorizedException('Usuário não possui cadastro de colaborador. Contate o suporte.');
    }
    
    const rawCpf = employee.cpf ? employee.cpf.replace(/\D/g, '') : '';
    if (!rawCpf.startsWith(dto.cpfStart.trim())) {
      throw new UnauthorizedException('Dados de validação incorretos');
    }

    const empReg = (employee.registration || '').trim().toLowerCase();
    const providedReg = dto.registration.trim().toLowerCase();
    if (empReg !== providedReg) {
      throw new UnauthorizedException('Dados de validação incorretos');
    }

    const token = await this.jwtService.signAsync({
      purpose: PASSWORD_RESET_PURPOSE,
      sub: user.id,
      email: user.email,
      passwordChangedAt: new Date(user.passwordChangedAt).getTime(),
    }, { expiresIn: '15m' });
    
    await this.repository.clearResetCode(user.id);
    
    return { valid: true, resetToken: token };
  }

  async resetPassword(dto: ResetPasswordDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.token);
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado');
    }
    if (payload?.purpose !== PASSWORD_RESET_PURPOSE || !payload.sub) throw new UnauthorizedException('Token invalido ou expirado');

    const user = await this.repository.findUserById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const role = this.resolveRole(user.email, user.role);
    if (!this.canAccessCompany(user.company, role)) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    if (Number(payload.passwordChangedAt) !== new Date(user.passwordChangedAt).getTime()) throw new UnauthorizedException('Token invalido ou expirado');

    const reused = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (reused) throw new ConflictException('A nova senha precisa ser diferente da senha atual');
    
    // Check previous passwords
    for (const oldHash of user.previousPasswords) {
      const matched = await bcrypt.compare(dto.newPassword, oldHash);
      if (matched) throw new ConflictException('Você não pode reutilizar senhas antigas');
    }

    this.assertStrongPassword(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    
    const nextPrevious = [user.passwordHash, ...user.previousPasswords].slice(0, 10);
    await this.repository.updatePassword(user.id, passwordHash, nextPrevious);
    
    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: user.id,
      metadata: { reason: 'PASSWORD_RESET_TOKEN' },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });
    return { changed: true };
  }

  async me(user: JwtUser) {
    const freshUser = await this.repository.findUserById(user.sub);
    if (!freshUser || !freshUser.isActive) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const role = this.resolveRole(freshUser.email, freshUser.role);
    if (!this.canAccessCompany(freshUser.company, role)) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    return {
      sub: freshUser.id,
      email: freshUser.email,
      name: freshUser.name,
      companyId: user.ghostMode ? user.companyId : freshUser.companyId,
      role,
      customPermissions: freshUser.customPermissions,
      companyStatus: freshUser.company?.status,
      billingStatus: freshUser.company?.billingStatus,
      passwordChangeRequired: this.passwordChangeRequired(freshUser),
    };
  }

  async changePassword(user: JwtUser, dto: ChangePasswordDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const freshUser = await this.repository.findUserById(user.sub);
    if (!freshUser || !freshUser.isActive) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const currentOk = await bcrypt.compare(dto.currentPassword, freshUser.passwordHash);
    if (!currentOk) throw new ConflictException('Senha atual invalida');
    
    const reused = await bcrypt.compare(dto.newPassword, freshUser.passwordHash);
    if (reused) throw new ConflictException('A nova senha precisa ser diferente da senha atual');
    
    // Check previous passwords
    for (const oldHash of freshUser.previousPasswords) {
      const matched = await bcrypt.compare(dto.newPassword, oldHash);
      if (matched) throw new ConflictException('Você não pode reutilizar senhas antigas');
    }

    this.assertStrongPassword(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    
    const nextPrevious = [freshUser.passwordHash, ...freshUser.previousPasswords].slice(0, 10);
    await this.repository.updatePassword(freshUser.id, passwordHash, nextPrevious);
    
    await this.repository.createAuditLog({
      companyId: freshUser.companyId,
      userId: freshUser.id,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: freshUser.id,
      metadata: { reason: 'PASSWORD_POLICY_30_DAYS' },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });
    return { changed: true, passwordChangeRequired: false };
  }

  private async auditInvalidLogin(email: string, requestMeta?: { ipAddress?: string; userAgent?: string }, companyId?: string, userId?: string) {
    if (!companyId) return;
    await this.repository.createAuditLog({
      companyId,
      userId,
      action: 'LOGIN_FAILED',
      entity: 'Auth',
      entityId: userId,
      metadata: { email: email.trim().toLowerCase() },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    }).catch(() => undefined);
  }

  private passwordChangeRequired(user: { passwordChangedAt?: Date | string | null; forcePasswordChange?: boolean }) {
    if (user.forcePasswordChange) return true;
    if (!user.passwordChangedAt) return true;
    const changedAt = new Date(user.passwordChangedAt);
    if (Number.isNaN(changedAt.getTime())) return true;
    const ageMs = Date.now() - changedAt.getTime();
    return ageMs >= PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  }

  private assertStrongPassword(password: string) {
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new ConflictException('A senha precisa ter no minimo 10 caracteres, letra maiuscula, minuscula, numero e simbolo');
    }
  }
  private resolveRole(email: string, role: UserRole): UserRole {
    return email.toLowerCase() === PLATFORM_OWNER_EMAIL ? 'DEV' : role;
  }

  private canAccessCompany(company: { status?: string; billingStatus?: string } | null | undefined, role: UserRole) {
    if (role === 'DEV') return true;
    if (role === 'ADMIN') return Boolean(company && company.billingStatus !== 'CANCELED');
    return Boolean(company && (company.status ?? 'ACTIVE') === 'ACTIVE' && company.billingStatus !== 'CANCELED');
  }

  private async buildAuthResponse(payload: JwtUser, passwordChangeRequired = false) {
    const company = await this.repository.findCompanyAuthContext(payload.companyId);
    if (!company) throw new UnauthorizedException('Company not found');

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: payload,
      company: {
        ...company,
        slug: company.slug || company.id,
      },
      passwordChangeRequired,
    };
  }
  async searchEmployeesForPasswordReset(
    actor: JwtUser,
    search: string,
  ) {
    this.assertCanResetEmployeePassword(actor);

    const normalizedSearch = search?.trim() ?? '';

    if (normalizedSearch.length < 2) {
      return [];
    }

    return this.repository.searchEmployeesForPasswordReset(
      actor.companyId,
      normalizedSearch,
    );
  }

  async adminResetEmployeePassword(
    actor: JwtUser,
    employeeId: string,
    newPassword: string,
    requestMeta?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    this.assertCanResetEmployeePassword(actor);
    this.assertStrongPassword(newPassword);

    const employee =
      await this.repository.findEmployeeUserForPasswordReset(
        actor.companyId,
        employeeId,
      );

    if (!employee || !employee.user) {
      throw new NotFoundException(
        'Funcionário com acesso ao sistema não encontrado.',
      );
    }

    if (!employee.user.isActive) {
      throw new BadRequestException(
        'O acesso deste funcionário está desativado.',
      );
    }

    if (!this.canResetTargetRole(actor.role, employee.user.role)) {
      throw new ForbiddenException(
        'Você não possui permissão para redefinir a senha deste perfil.',
      );
    }

    if (employee.user.id === actor.sub) {
      throw new BadRequestException(
        'Para alterar a própria senha, utilize a opção Minha senha.',
      );
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      employee.user.passwordHash,
    );

    if (samePassword) {
      throw new ConflictException(
        'A nova senha precisa ser diferente da senha atual do funcionário.',
      );
    }

    for (const previousHash of employee.user.previousPasswords ?? []) {
      const alreadyUsed = await bcrypt.compare(
        newPassword,
        previousHash,
      );

      if (alreadyUsed) {
        throw new ConflictException(
          'Esta senha já foi utilizada anteriormente pelo funcionário.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const nextPreviousPasswords = [
      employee.user.passwordHash,
      ...(employee.user.previousPasswords ?? []),
    ].slice(0, 10);

    await this.repository.adminUpdatePassword(
      employee.user.id,
      passwordHash,
      nextPreviousPasswords,
    );

    await this.repository.createAuditLog({
      companyId: actor.companyId,
      userId: actor.sub,
      action: 'EMPLOYEE_PASSWORD_RESET_BY_ADMIN',
      entity: 'User',
      entityId: employee.user.id,
      metadata: {
        employeeId: employee.id,
        employeeName: employee.name,
        employeeRegistration: employee.registration,
        actorRole: actor.role,
        forcePasswordChange: true,
      },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return {
      reset: true,
      forcePasswordChange: true,
      employee: {
        id: employee.id,
        name: employee.name,
        registration: employee.registration,
      },
    };
  }

  private assertCanResetEmployeePassword(actor: JwtUser) {
    if (!['ADMIN', 'RH', 'DEV'].includes(actor.role)) {
      throw new ForbiddenException(
        'Você não possui permissão para redefinir senhas.',
      );
    }
  }

  private canResetTargetRole(
    actorRole: UserRole,
    targetRole: UserRole,
  ) {
    const allowedTargets: Record<UserRole, UserRole[]> = {
      DEV: [
        'COMERCIAL',
        'ADMIN',
        'RH',
        'GESTOR',
        'FUNCIONARIO',
        'CONSULTA',
      ],
      ADMIN: [
        'ADMIN',
        'RH',
        'GESTOR',
        'FUNCIONARIO',
        'CONSULTA',
      ],
      RH: [
        'RH',
        'GESTOR',
        'FUNCIONARIO',
        'CONSULTA',
      ],
      COMERCIAL: [],
      GESTOR: [],
      FUNCIONARIO: [],
      CONSULTA: [],
    };

    return allowedTargets[actorRole]?.includes(targetRole) ?? false;
  }
}
