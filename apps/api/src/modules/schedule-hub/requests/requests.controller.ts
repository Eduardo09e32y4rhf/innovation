import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { JwtUser } from '../../../common/types/auth.types';
import { rolesWith } from '../../schedule/access/schedule-access';
import { BulkDecideDto, CreateRequestDto, DecideRequestDto, PeerResponseDto } from './requests.dto';
import { RequestsService } from './requests.service';

const REQUESTERS = rolesWith('requests.create');
const APPROVERS = rolesWith('approvals');
const VIEWERS = [...new Set([...REQUESTERS, ...APPROVERS])];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('escalas/requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Roles(...REQUESTERS)
  @Post('preview')
  preview(@CurrentUser() actor: JwtUser, @Body() dto: CreateRequestDto) {
    return this.service.validate(actor, dto.type, dto.payload, dto.peerEmployeeId).then(({ ok, findings }) => ({ ok, findings }));
  }

  @Roles(...REQUESTERS)
  @Post()
  create(@CurrentUser() actor: JwtUser, @Body() dto: CreateRequestDto) {
    return this.service.create(actor, dto);
  }

  @Roles(...VIEWERS)
  @Get()
  list(@CurrentUser() actor: JwtUser, @Query('status') status?: string, @Query('type') type?: string, @Query('view') view?: string) {
    return this.service.list(actor, { status, type, view });
  }

  @Roles(...APPROVERS)
  @Post('bulk-decide')
  bulk(@CurrentUser() actor: JwtUser, @Body() dto: BulkDecideDto) {
    return this.service.bulkDecide(actor, dto);
  }

  @Roles(...VIEWERS)
  @Get(':id')
  get(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.get(actor, id);
  }

  @Roles(...APPROVERS)
  @Post(':id/decide')
  decide(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: DecideRequestDto) {
    return this.service.decide(actor, id, dto);
  }

  @Roles(...REQUESTERS)
  @Post(':id/peer')
  peer(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: PeerResponseDto) {
    return this.service.respondAsPeer(actor, id, dto);
  }

  @Roles(...REQUESTERS)
  @Post(':id/cancel')
  cancel(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.cancel(actor, id);
  }
}
