import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import type { JwtUser, UserRole } from '../../common/types/auth.types';

const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';

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
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const role = this.resolveRole(user.email, user.role);
    if (!user.company?.isActive && role !== 'DEV') throw new UnauthorizedException('Invalid credentials');
    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');
    return this.buildAuthResponse({ sub: user.id, email: user.email, name: user.name, companyId: user.companyId, role });
  }

  async me(user: JwtUser) {
    const freshUser = await this.repository.findUserById(user.sub);
    if (!freshUser || !freshUser.isActive) throw new UnauthorizedException('Invalid credentials');
    const role = this.resolveRole(freshUser.email, freshUser.role);
    if (!freshUser.company?.isActive && role !== 'DEV') throw new UnauthorizedException('Invalid credentials');
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

  private async buildAuthResponse(payload: JwtUser) {
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: payload,
    };
  }
}
