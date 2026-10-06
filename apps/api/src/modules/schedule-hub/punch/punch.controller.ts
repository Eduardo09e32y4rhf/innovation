import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
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

  @Get('receipt/:receipt/pdf')
  async receiptPdf(@CurrentUser() actor: JwtUser, @Param('receipt') receipt: string, @Res() res: any) {
    const { buffer, filename } = await this.service.receiptPdf(actor, receipt);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="' + filename + '"', 'Content-Length': buffer.length, 'Cache-Control': 'private, no-store' });
    res.end(buffer);
  }

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 12, prefix: 'punch-hub' })
  punch(@CurrentUser() actor: JwtUser, @Body() dto: PunchDto, @Req() request: any) {
    return this.service.punch(actor, dto, { ipAddress: request.ip, userAgent: request.headers?.['user-agent'] });
  }
}
