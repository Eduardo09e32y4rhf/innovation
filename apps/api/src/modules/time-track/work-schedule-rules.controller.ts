import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SCHEDULE_MODULE_ROLES, rolesWith } from '../schedule/access/schedule-access';
import { WorkRuleDto } from './dto/work-rule.dto';
import { WorkScheduleRulesService } from './work-schedule-rules.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time-rules')
export class WorkScheduleRulesController {
  constructor(private readonly svc: WorkScheduleRulesService) {}

  @Roles(...SCHEDULE_MODULE_ROLES)
  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.svc.list(companyId);
  }

  @Roles(...SCHEDULE_MODULE_ROLES)
  @Get('active')
  findActive(@CurrentCompany() companyId: string) {
    return this.svc.findActive(companyId);
  }

  @Roles(...SCHEDULE_MODULE_ROLES)
  @Get(':id')
  getById(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.svc.getById(companyId, id);
  }

  @Roles(...rolesWith('policy.write'))
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: WorkRuleDto) {
    return this.svc.create(companyId, dto);
  }

  @Roles(...rolesWith('policy.write'))
  @Put(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: WorkRuleDto) {
    return this.svc.update(companyId, id, dto);
  }

  @Roles(...rolesWith('policy.write'))
  @Put(':id/archive')
  archive(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.svc.update(companyId, id, { status: 'INACTIVE' });
  }

  @Roles(...rolesWith('policy.write'))
  @Put(':id/activate')
  activate(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.svc.update(companyId, id, { status: 'ACTIVE' });
  }
}
