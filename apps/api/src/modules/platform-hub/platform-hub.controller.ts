import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { PlatformHubService } from './platform-hub.service';

class OverviewQuery {
  @IsOptional() @IsUUID() companyId?: string;
}

class PickerQuery {
  @IsOptional() @IsString() @MaxLength(80) q?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'COMERCIAL', 'CONTABIL')
@Controller('platform-hub')
export class PlatformHubController {
  constructor(private readonly service: PlatformHubService) {}

  @Get('companies')
  companies(@CurrentUser() actor: JwtUser, @Query() query: PickerQuery) {
    return this.service.companies(actor, query.q);
  }

  @Get('overview')
  overview(@CurrentUser() actor: JwtUser, @Query() query: OverviewQuery) {
    return this.service.overview(actor, query.companyId);
  }
}
