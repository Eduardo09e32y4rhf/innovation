import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { TimeOccurrencesService } from './time-occurrences.service';

@UseGuards(JwtAuthGuard)
@Controller('time-occurrences')
export class TimeOccurrencesController {
  constructor(private readonly svc: TimeOccurrencesService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    if (actor.role === 'FUNCIONÁRIO') {
      return this.svc.list(companyId, undefined);
    }
    return this.svc.list(companyId);
  }

  @Get('employee/:employeeId')
  listByEmployee(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('employeeId') employeeId: string) {
    return this.svc.list(companyId, employeeId);
  }

  @Get(':id')
  getById(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.svc.getById(companyId, id);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() data: any) {
    return this.svc.create(companyId, actor, data);
  }

  @Put(':id/approve')
  approve(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.approve(companyId, actor, id);
  }

  @Put(':id/reject')
  reject(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.svc.reject(companyId, actor, id);
  }
}