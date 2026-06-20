import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import type { JwtUser, UserRole } from '../../common/types/auth.types';

const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';
const LOGIN_DENIED_MESSAGE = 'Nao foi possivel entrar';
const PASSWORD_MAX_AGE_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtService: JwtService,
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
    }, true);
  }

  async login(dto: LoginDto) {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const role = this.resolveRole(user.email, user.role);
    if (!this.canAccessCompany(user.company, role)) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    return this.buildAuthResponse({ sub: user.id, email: user.email, name: user.name, companyId: user.companyId, role }, this.passwordChangeRequired(user));
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
      passwordChangeRequired: this.passwordChangeRequired(freshUser),
    };
  }

  async changePassword(user: JwtUser, dto: ChangePasswordDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const freshUser = await this.repository.findUserById(user.sub);
    if (!freshUser || !freshUser.isActive) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const currentOk = await bcrypt.compare(dto.currentPassword, freshUser.passwordHash);
    if (!currentOk) throw new UnauthorizedException('Senha atual invalida');
    const reused = await bcrypt.compare(dto.newPassword, freshUser.passwordHash);
    if (reused) throw new ConflictException('A nova senha precisa ser diferente da senha atual');
    this.assertStrongPassword(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.repository.updatePassword(freshUser.id, passwordHash);
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

  private canAccessCompany(company: { isActive?: boolean; status?: string } | null | undefined, role: UserRole) {
    if (role === 'DEV') return true;
    return Boolean(company?.isActive && (company.status ?? 'ACTIVE') === 'ACTIVE');
  }

  private async buildAuthResponse(payload: JwtUser, passwordChangeRequired = false) {
    return {
      access_token: await this.jwtService.signAsync(payload, { expiresIn: '60m' }),
      user: payload,
      passwordChangeRequired,
    };
  }
}
