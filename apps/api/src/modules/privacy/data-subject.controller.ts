import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { DataSubjectService } from './data-subject.service';

class ErasureRequestDto {
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

class AnonymizeDto {
  @IsOptional() @IsString() confirm?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('privacy')
export class DataSubjectController {
  constructor(private readonly service: DataSubjectService) {}

  @Get('me/export')
  @Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
  exportMe(@CurrentUser() user: JwtUser) {
    return this.service.exportMe(user);
  }

  @Post('me/erasure-request')
  @HttpCode(202)
  @Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
  requestErasure(@CurrentUser() user: JwtUser, @Body() body: ErasureRequestDto) {
    return this.service.requestErasure(user, body.reason);
  }

  @Get('employees/:id/export')
  @Roles('ADMIN', 'RH', 'CEO')
  exportEmployee(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.exportEmployee(user, id);
  }

  @Post('employees/:id/anonymize')
  @Roles('ADMIN', 'RH', 'CEO')
  anonymize(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: AnonymizeDto) {
    return this.service.anonymizeEmployee(user, id, body.confirm);
  }
}
