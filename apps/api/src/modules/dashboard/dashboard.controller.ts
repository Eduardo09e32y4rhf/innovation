import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  summary(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.summary(companyId, actor);
  }
}
