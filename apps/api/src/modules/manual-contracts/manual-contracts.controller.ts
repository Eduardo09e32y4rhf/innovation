import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateManualContractDto } from './dto/create-manual-contract.dto';
import { UpdateManualContractDto } from './dto/update-manual-contract.dto';
import { ManualContractsService } from './manual-contracts.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV')
@Controller('manual-contracts')
export class ManualContractsController {
  constructor(private readonly service: ManualContractsService) {}

  @Get()
  list() { return this.service.list(); }

  @Post()
  create(@CurrentUser() actor: JwtUser, @Body() dto: CreateManualContractDto) {
    return this.service.create(dto, actor.sub);
  }

  @Patch(':id')
  update(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: UpdateManualContractDto) {
    return this.service.update(id, dto, actor.sub);
  }
}
