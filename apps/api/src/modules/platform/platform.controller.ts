import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';
import { PlatformService } from './platform.service';

/**
 * Camada global da plataforma.
 * DEV (Super Admin) ve e controla tudo; COMERCIAL ve empresas e cria clientes.
 * Empresas comuns continuam isoladas pelo companyId nas rotas do produto.
 */
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

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.service.getCompany(id);
  }

  @Post('companies')
  createCompany(@Body() dto: CreatePlatformCompanyDto) {
    return this.service.createCompany(dto);
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
