import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { contentDisposition } from '../../common/pdf/pdf-response';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CandidateAdminService, TalentPoolService } from './talent-pool.service';

class InviteDto {
  @IsUUID() jobId!: string;
  @IsOptional() @IsString() @MaxLength(600) message?: string;
}

/** Reaproveitamento: o RH (plano completo, módulo de recrutamento) encontra candidatos de outras empresas que aceitaram o banco de talentos. */
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule('recruitment')
@Roles('DEV', 'ADMIN', 'RH')
@Controller('talent-pool')
export class TalentPoolController {
  constructor(private readonly service: TalentPoolService) {}

  @Get()
  search(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Query() query: Record<string, string>) {
    return this.service.search(companyId, actor.sub, { q: query.q, city: query.city, state: query.state, education: query.education, license: query.license, category: query.category, page: Number(query.page) });
  }

  @Get(':id/resume')
  async resume(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', new ParseUUIDPipe()) id: string, @Res() reply: any) {
    const file = await this.service.resume(companyId, actor.sub, id);
    reply.header('Content-Type', file.type);
    reply.header('Content-Disposition', contentDisposition(file.name));
    return reply.send(file.buffer);
  }

  @Post(':id/invite')
  invite(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: InviteDto) {
    return this.service.invite(companyId, actor.sub, id, dto);
  }
}

/** Só o DEV da plataforma enxerga todos os candidatos cadastrados. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV')
@Controller('candidate-accounts')
export class CandidateAdminController {
  constructor(private readonly service: CandidateAdminService) {}

  @Get()
  list(@Query('q') q?: string, @Query('page') page?: string) {
    return this.service.list({ q, page: Number(page) });
  }
}
