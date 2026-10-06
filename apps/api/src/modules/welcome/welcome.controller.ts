import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';

/** Boas-vindas do primeiro acesso: aparece uma única vez por usuário. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
@Controller('welcome')
export class WelcomeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('status')
  async status(@CurrentUser() actor: JwtUser) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.sub }, select: { name: true, welcomeSeenAt: true } });
    return { show: Boolean(user) && !user!.welcomeSeenAt, name: user?.name ?? actor.name ?? '' };
  }

  @Post('seen')
  async seen(@CurrentUser() actor: JwtUser) {
    await this.prisma.user.updateMany({ where: { id: actor.sub, welcomeSeenAt: null }, data: { welcomeSeenAt: new Date() } });
    return { seen: true };
  }
}