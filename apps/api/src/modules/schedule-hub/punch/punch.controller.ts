import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../../../common/guards/rate-limit.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { JwtUser } from '../../../common/types/auth.types';
import { rolesWith } from '../../schedule/access/schedule-access';
import { PunchDto } from './punch.dto';
import { PunchService } from './punch.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesWith('punch'))
@Controller('escalas/punch')
export class PunchController {
  constructor(private readonly service: PunchService) {}

  @Get('today')
  today(@CurrentUser() actor: JwtUser) {
    return this.service.today(actor);
  }

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 12, prefix: 'punch-hub' })
  punch(@CurrentUser() actor: JwtUser, @Body() dto: PunchDto, @Req() request: any) {
    return this.service.punch(actor, dto, { ipAddress: request.ip, userAgent: request.headers?.['user-agent'] });
  }
}
