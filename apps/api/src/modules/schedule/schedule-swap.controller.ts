import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScheduleSwapService } from './schedule-swap.service';
import { SwapRequestDto, ApproveSwapDto } from './dto/swap-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/types/auth.types';

@UseGuards(JwtAuthGuard)
@Controller('schedule-swaps')
export class ScheduleSwapController {
  constructor(private readonly service: ScheduleSwapService) {}

  @Get()
  list(@CurrentUser() actor: JwtUser, @Query('status') status?: string) {
    return this.service.listSwapRequests(actor.companyId, actor, status);
  }

  @Post()
  create(@CurrentUser() actor: JwtUser, @Body() dto: SwapRequestDto) {
    return this.service.createSwapRequest(actor.companyId, actor, dto);
  }

  @Patch(':id/review')
  review(
    @CurrentUser() actor: JwtUser,
    @Param('id') id: string,
    @Body() dto: ApproveSwapDto,
  ) {
    return this.service.approveOrReject(actor.companyId, actor, id, dto);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() actor: JwtUser, @Param('id') id: string) {
    return this.service.cancelSwapRequest(actor.companyId, actor, id);
  }
}
