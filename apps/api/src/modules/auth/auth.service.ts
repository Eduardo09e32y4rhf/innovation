import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import type { JwtUser } from '../../common/types/auth.types';

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
      companyId: admin.companyId,
      role: admin.role,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');
    return this.buildAuthResponse({ sub: user.id, email: user.email, companyId: user.companyId, role: user.role });
  }

  me(user: JwtUser) {
    return user;
  }

  private async buildAuthResponse(payload: JwtUser) {
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: payload,
    };
  }
}
