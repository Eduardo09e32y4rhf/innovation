import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
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

const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';
const LOGIN_DENIED_MESSAGE = 'Nao foi possivel entrar';
const PASSWORD_MAX_AGE_DAYS = 30;
const PASSWORD_RESET_PURPOSE = 'PASSWORD_RESET';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async registerCompany(dto: RegisterCompanyDto) {
    const existing = await this.repository.findUserByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const company = await this.repository.createCompanyWithAdmin({ ...dto, passwordHash });
    const admin = company.users[0];
    return this.buildAuthResponse({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      companyId: admin.companyId,
      role: this.resolveRole(admin.email, admin.role),
      customPermissions: admin.customPermissions,
    }, true);
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

    return this.buildAuthResponse({ sub: user.id, email: user.email, name: user.name, companyId: user.companyId, role, customPermissions: user.customPermissions }, this.passwordChangeRequired(user));
  }


  async requestPasswordReset(dto: RequestPasswordResetDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const user = await this.repository.findUserWithEmployeeByEmail(dto.email);
    if (!user || !user.isActive) return { requested: true };
    const role = this.resolveRole(user.email, user.role);
    if (!this.canAccessCompany(user.company, role)) return { requested: true };

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
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

    return {
      requested: true,
      // Temporarily log to console in non-production just in case a developer tests it
      ...(process.env.NODE_ENV !== 'production' ? { demoCode: code } : {}),
    };
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
      companyId: freshUser.companyId,
      role,
      customPermissions: freshUser.customPermissions,
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
    return Boolean(company && (company.status ?? 'ACTIVE') === 'ACTIVE' && company.billingStatus !== 'CANCELED');
  }

  private async buildAuthResponse(payload: JwtUser, passwordChangeRequired = false) {
    // Uses expiresIn from auth.module.ts (JWT_EXPIRES_IN env var, defaulting to '60m')
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: payload,
      passwordChangeRequired,
    };
  }
}
