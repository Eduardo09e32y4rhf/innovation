import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Audited } from '../platform-audit/audited.decorator';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateManualContractDto } from './dto/create-manual-contract.dto';
import { UpdateManualContractDto } from './dto/update-manual-contract.dto';
import { TransitionManualContractDto } from './dto/transition-manual-contract.dto';
import { ManualContractsService } from './manual-contracts.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL')
@Controller('manual-contracts')
export class ManualContractsController {
  constructor(private readonly service: ManualContractsService) {}

  @Get()
  list(@CurrentUser() actor: JwtUser, @Query('companyId') companyId?: string) { return this.service.list(companyId, actor); }

  @Get(':id/history')
  history(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.history(id, actor);
  }

  @Get(':id/transitions')
  transitions(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.availableTransitions(id, actor);
  }

  @Get(':id/pdf')
  async pdf(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Res() res: any) {
    return this.service.streamPdf(id, actor.sub || (actor as any).id, res, actor);
  }

  @Get(':id')
  get(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.get(id, actor);
  }

  @Post()
  @Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL')
  @Audited({ action: 'CONTRACT_CREATED', entity: 'ManualContract' })
  create(@CurrentUser() actor: JwtUser, @Body() dto: CreateManualContractDto) {
    return this.service.create(dto, actor.sub || (actor as any).id, actor);
  }

  @Patch(':id')
  @Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL')
  @Audited({ action: 'CONTRACT_UPDATED', entity: 'ManualContract' })
  update(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdateManualContractDto) {
    return this.service.update(id, dto, actor.sub || (actor as any).id, actor);
  }

  @Patch(':id/status')
  @Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL')
  @Audited({ action: 'CONTRACT_STATUS_CHANGED', entity: 'ManualContract', reasonField: 'reason' })
  transition(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: TransitionManualContractDto) {
    return this.service.transition(id, dto, actor.sub || (actor as any).id, actor);
  }

  @Delete(':id')
  @Roles('DEV', 'CEO')
  @Audited({ action: 'CONTRACT_DELETED', entity: 'ManualContract' })
  remove(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.delete(id, actor.sub || (actor as any).id);
  }
}
