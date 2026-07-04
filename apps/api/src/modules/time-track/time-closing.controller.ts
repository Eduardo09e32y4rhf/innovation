import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { TimeClosingService } from './time-closing.service';

@UseGuards(JwtAuthGuard)
@Controller('time-closing')
export class TimeClosingController {
  constructor(private readonly svc: TimeClosingService) {}

  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.svc.list(companyId);
  }

  @Get(':id')
  getById(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.svc.getById(companyId, id);
  }

  @Post('generate')
  generate(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: { referenceMonth: number; referenceYear: number }) {
    return this.svc.generate(companyId, actor, body.referenceMonth, body.referenceYear);
  }

  @Put(':id/approve')
  approve(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.approve(companyId, actor, id);
  }

  @Put(':id/close')
  close(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.close(companyId, actor, id);
  }

  @Put(':id/reopen')
  reopen(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.svc.reopen(companyId, actor, id, body.reason);
  }

  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.delete(companyId, actor, id);
  }
}

