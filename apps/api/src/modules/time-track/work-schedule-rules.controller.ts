import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { WorkScheduleRulesService } from './work-schedule-rules.service';

@UseGuards(JwtAuthGuard)
@Controller('time-rules')
export class WorkScheduleRulesController {
  constructor(private readonly svc: WorkScheduleRulesService) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.svc.list(companyId, actor);
  }

  @Get('active')
  findActive(@CurrentCompany() companyId: string) {
    return this.svc.findActive(companyId);
  }

  @Get(':id')
  getById(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.svc.getById(companyId, id);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() data: any) {
    return this.svc.create(companyId, actor, data);
  }

  @Put(':id')
  update(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() data: any) {
    return this.svc.update(companyId, actor, id, data);
  }

  @Put(':id/archive')
  archive(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') throw new ForbiddenException('Not allowed');
    return this.svc.update(companyId, actor, id, { status: 'INACTIVE' });
  }

  @Put(':id/activate')
  activate(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string) {
    if (actor.role !== 'ADMIN' && actor.role !== 'RH' && actor.role !== 'DEV') throw new ForbiddenException('Not allowed');
    return this.svc.update(companyId, actor, id, { status: 'ACTIVE' });
  }
}