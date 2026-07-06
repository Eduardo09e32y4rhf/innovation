// @ts-nocheck
import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query, Req, Res } from '@nestjs/common';
import { TimeClosingService } from './time-closing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TimeClosingStatus } from '@prisma/client';

@Controller('time-closing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeClosingController {
  constructor(private readonly timeClosingService: TimeClosingService) {}

  @Post('generate')
  @Roles('ADMIN', 'RH')
  async generate(@Req() req: any, @Body() body: { employeeIds: string[], periodStart: string, periodEnd: string }) {
    const user = req.user as any;
    return this.timeClosingService.generate(user.companyId, user, body);
  }

  @Get()
  @Roles('ADMIN', 'RH')
  async list(@Req() req: any, @Query('status') status?: TimeClosingStatus) {
    const user = req.user as any;
    return this.timeClosingService.list(user.companyId, status);
  }

  @Patch(':id/adjust')
  @Roles('ADMIN', 'RH')
  async adjust(@Req() req: any, @Param('id') id: string, @Body() body: { field: string, newValue: string, reason: string }) {
    const user = req.user as any;
    return this.timeClosingService.adjust(user.companyId, user, id, body);
  }

  @Post(':id/submit-review')
  @Roles('ADMIN', 'RH')
  async submitReview(@Req() req: any, @Param('id') id: string) {
    const user = req.user as any;
    return this.timeClosingService.submitReview(user.companyId, user, id);
  }

  @Post(':id/close')
  @Roles('ADMIN', 'RH')
  async close(@Req() req: any, @Param('id') id: string) {
    const user = req.user as any;
    return this.timeClosingService.close(user.companyId, user, id);
  }

  @Post(':id/reopen')
  @Roles('ADMIN', 'RH')
  async reopen(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    const user = req.user as any;
    return this.timeClosingService.reopen(user.companyId, user, id, body.reason);
  }

  @Get('export')
  @Roles('ADMIN', 'RH')
  async export(@Req() req: any) {
    const user = req.user as any;
    // Export implementation placeholder
    return { url: '/exports/time-closing-export.csv' };
  }

  @Get(':id/pdf')
  @Roles('ADMIN', 'RH', 'FUNCIONARIO')
  async getPdf(@Req() req: any, @Param('id') id: string) {
    const user = req.user as any;
    return this.timeClosingService.getPdf(user.companyId, id);
  }
}
