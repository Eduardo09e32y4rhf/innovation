import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformAuditService } from './platform-audit.service';

class AuditListQueryDto {
  @IsOptional() @IsUUID() actorId?: string;
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsString() @MaxLength(60) entity?: string;
  @IsOptional() @IsString() @MaxLength(80) entityId?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsString() @MaxLength(30) from?: string;
  @IsOptional() @IsString() @MaxLength(30) to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL')
@Controller('platform-audit')
export class PlatformAuditController {
  constructor(private readonly service: PlatformAuditService) {}

  @Get()
  list(@Query() query: AuditListQueryDto) {
    return this.service.list(query);
  }

  /** Confere a cadeia de hashes inteira. */
  @Get('verify')
  verify() {
    return this.service.verify();
  }
}
