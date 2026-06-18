import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';
import { PlatformService } from './platform.service';

/**
 * Camada de plataforma — exclusiva do perfil DEV (engenharia).
 * Permite gerenciar todas as empresas (clientes), criar novos clientes
 * com seu admin inicial, ajustar limites de plano e ver metricas globais.
 * O RolesGuard ja deixa DEV passar em qualquer rota, mas a anotacao
 * @Roles('DEV') documenta e bloqueia qualquer outro perfil explicitamente.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV')
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
  updateCompany(@Param('id') id: string, @Body() dto: UpdatePlatformCompanyDto) {
    return this.service.updateCompany(id, dto);
  }

  @Delete('companies/:id')
  deleteCompany(@Param('id') id: string) {
    return this.service.deleteCompany(id);
  }
}
