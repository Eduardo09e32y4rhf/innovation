import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateManualContractDto } from './dto/create-manual-contract.dto';
import { UpdateManualContractDto } from './dto/update-manual-contract.dto';
import { TransitionManualContractDto } from './dto/transition-manual-contract.dto';
import { ManualContractsService } from './manual-contracts.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'COMERCIAL')
@Controller('manual-contracts')
export class ManualContractsController {
  constructor(private readonly service: ManualContractsService) {}

  @Get()
  list(@Query('companyId') companyId?: string) { return this.service.list(companyId); }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.service.history(id);
  }

  @Get(':id/transitions')
  transitions(@Param('id') id: string) {
    return this.service.availableTransitions(id);
  }

  @Get(':id/pdf')
  async pdf(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Res() res: any) {
    return this.service.streamPdf(id, actor.sub || (actor as any).id, res);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  @Roles('DEV', 'COMERCIAL')
  create(@CurrentUser() actor: JwtUser, @Body() dto: CreateManualContractDto) {
    return this.service.create(dto, actor.sub || (actor as any).id);
  }

  @Patch(':id')
  @Roles('DEV', 'COMERCIAL')
  update(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdateManualContractDto) {
    return this.service.update(id, dto, actor.sub || (actor as any).id);
  }

  @Patch(':id/status')
  @Roles('DEV', 'COMERCIAL')
  transition(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: TransitionManualContractDto) {
    return this.service.transition(id, dto, actor.sub || (actor as any).id);
  }

  @Delete(':id')
  @Roles('DEV', 'COMERCIAL')
  remove(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.delete(id, actor.sub || (actor as any).id);
  }
}
