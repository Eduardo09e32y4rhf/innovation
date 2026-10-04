import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { JwtUser } from '../../../common/types/auth.types';
import { ComplianceQueryDto, CompleteAsoDto } from './sst.dto';
import { SstService } from './sst.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('management/sst')
export class SstController {
  constructor(private readonly svc: SstService) {}

  @Get('overview')
  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'CEO', 'CONSULTA')
  overview(@CurrentCompany() companyId: string) {
    return this.svc.overview(companyId);
  }

  @Get('aso/compliance')
  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'CEO', 'CONSULTA')
  compliance(@CurrentCompany() companyId: string, @Query() query: ComplianceQueryDto) {
    return this.svc.compliance(companyId, query);
  }

  @Get('aso/employee/:employeeId')
  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'CEO', 'CONSULTA')
  history(@CurrentCompany() companyId: string, @Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.svc.history(companyId, employeeId);
  }

  @Post('aso/:id/complete')
  @Roles('DEV', 'ADMIN', 'RH')
  complete(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteAsoDto) {
    return this.svc.complete(companyId, id, actor.sub, dto);
  }
}
