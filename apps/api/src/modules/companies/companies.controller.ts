import { Body, Controller, ForbiddenException, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/types/auth.types';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateHolidaysDto } from './dto/update-holidays.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get('me')
  me(@CurrentCompany() companyId: string) {
    return this.service.me(companyId);
  }

  /** RH - R&S so altera o cadastro quando a conta e autonoma de R&S (o proprio CNPJ/CPF e logo); numa empresa completa, nao. */
  @Roles('ADMIN', 'RH', 'RH_RS')
  @Patch('me')
  async updateMe(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: UpdateCompanyDto) {
    if (actor.role === 'RH_RS' && !(await this.service.isRecruiterOnly(companyId))) {
      throw new ForbiddenException('Seu perfil não altera os dados da empresa. Peça ao administrador.');
    }
    return this.service.updateMe(companyId, dto);
  }

  @Roles('ADMIN', 'RH', 'GESTOR')
  @Get('holidays')
  getHolidays(@CurrentCompany() companyId: string) {
    return this.service.getHolidays(companyId);
  }

  @Roles('ADMIN', 'RH')
  @Patch('holidays')
  updateHolidays(@CurrentCompany() companyId: string, @Body() body: UpdateHolidaysDto) {
    return this.service.updateHolidays(companyId, body.holidays);
  }
}
