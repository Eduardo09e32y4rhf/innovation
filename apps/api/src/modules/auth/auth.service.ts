import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import type { JwtUser, UserRole } from '../../common/types/auth.types';

const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';
const LOGIN_DENIED_MESSAGE = 'Nao foi possivel entrar';

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
    });
  }

  async login(dto: LoginDto) {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const role = this.resolveRole(user.email, user.role);
    if (!this.canAccessCompany(user.company, role)) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException(LOGIN_DENIED_MESSAGE);
    return this.buildAuthResponse({ sub: user.id, email: user.email, name: user.name, companyId: user.companyId, role });
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
    };
  }

  private resolveRole(email: string, role: UserRole): UserRole {
    return email.toLowerCase() === PLATFORM_OWNER_EMAIL ? 'DEV' : role;
  }

  private canAccessCompany(company: { isActive?: boolean; status?: string } | null | undefined, role: UserRole) {
    if (role === 'DEV') return true;
    return Boolean(company?.isActive && (company.status ?? 'ACTIVE') === 'ACTIVE');
  }

  private async buildAuthResponse(payload: JwtUser) {
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: payload,
    };
  }
}
