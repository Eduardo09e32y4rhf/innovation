import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly service: PartnersService) {}

  @Roles('ADMIN', 'GESTOR')
  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.service.list(companyId);
  }

  @Roles('ADMIN', 'GESTOR')
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreatePartnerDto) {
    return this.service.create(companyId, dto);
  }
}
