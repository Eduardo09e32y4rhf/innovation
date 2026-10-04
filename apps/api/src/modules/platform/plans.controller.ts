import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformPlansService } from './plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audited } from '../platform-audit/audited.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL')
@Controller('platform/plans')
export class PlatformPlansController {
  constructor(private readonly service: PlatformPlansService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @Roles('DEV', 'CEO', 'CONTABIL')
  @Audited({ action: 'PLAN_CREATED', entity: 'PlatformPlan' })
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @Roles('DEV', 'CEO', 'CONTABIL')
  @Audited({ action: 'PLAN_UPDATED', entity: 'PlatformPlan' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  /** Soft-delete: desativa o plano (não remove do banco) */
  @Delete(':id')
  @Roles('DEV', 'CEO')
  @Audited({ action: 'PLAN_DEACTIVATED', entity: 'PlatformPlan' })
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  /** Hard-delete: remove permanentemente (só funciona se o plano já estiver inativo) */
  @Delete(':id/permanent')
  @Roles('DEV')
  @Audited({ action: 'PLAN_DELETED_PERMANENTLY', entity: 'PlatformPlan' })
  deletePermanent(@Param('id') id: string) {
    return this.service.deletePermanent(id);
  }
}
