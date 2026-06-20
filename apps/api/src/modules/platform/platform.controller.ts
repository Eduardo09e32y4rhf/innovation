import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { CreatePlatformCompanyUserDto } from './dto/create-platform-company-user.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';
import { UpdatePlatformCompanyUserDto } from './dto/update-platform-company-user.dto';
import { PlatformService } from './platform.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'COMERCIAL')
@Controller('platform')
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get('companies')
  listCompanies() {
    return this.service.listCompanies();
  }

  @Get('company-users/:companyId')
  listCompanyUsers(@CurrentUser() actor: JwtUser, @Param('companyId') companyId: string) {
    return this.service.listCompanyUsers(actor, companyId);
  }

  @Post('company-users/:companyId')
  createCompanyUser(
    @CurrentUser() actor: JwtUser,
    @Param('companyId') companyId: string,
    @Body() dto: CreatePlatformCompanyUserDto,
  ) {
    return this.service.createCompanyUser(actor, companyId, dto);
  }

  @Patch('company-users/:companyId/:userId')
  updateCompanyUser(
    @CurrentUser() actor: JwtUser,
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePlatformCompanyUserDto,
  ) {
    return this.service.updateCompanyUser(actor, companyId, userId, dto);
  }

  @Delete('company-users/:companyId/:userId')
  deleteCompanyUser(
    @CurrentUser() actor: JwtUser,
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.deleteCompanyUser(actor, companyId, userId);
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.service.getCompany(id);
  }

  @Post('companies')
  createCompany(@CurrentUser() actor: JwtUser, @Body() dto: CreatePlatformCompanyDto) {
    return this.service.createCompany(actor, dto);
  }

  @Patch('companies/:id')
  updateCompany(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdatePlatformCompanyDto) {
    this.assertDev(actor);
    return this.service.updateCompany(id, dto);
  }

  @Delete('companies/:id')
  deleteCompany(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    this.assertDev(actor);
    return this.service.deleteCompany(id);
  }

  private assertDev(actor: JwtUser) {
    if (actor.role !== 'DEV') {
      throw new ForbiddenException('Apenas Super Admin pode suspender, ativar ou excluir empresas.');
    }
  }
}
