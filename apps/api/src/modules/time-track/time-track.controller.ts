import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { ManualTimeTrackDto } from './dto/manual-time-track.dto';
import { RegisterTimeDto } from './dto/register-time.dto';
import { RevokeTimeTrackDto } from './dto/revoke-time-track.dto';
import { UpdateTimeTrackDto } from './dto/update-time-track.dto';
import { TimeTrackService } from './time-track.service';
import { FacialRecognitionService } from '../facial-recognition/facial-recognition.service';


@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
@Controller('time-track')
export class TimeTrackController {
  constructor(
    private readonly service: TimeTrackService,
    private readonly facialRecognitionService: FacialRecognitionService
  ) {}

  @Get()
  list(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Query('month') month?: string) {
    return this.service.list(companyId, actor, month);
  }

  @Get(':employeeId/month')
  listEmployeeMonth(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('employeeId') employeeId: string, @Query('month') month?: string) {
    return this.service.listEmployeeMonth(companyId, actor, employeeId, month);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO')
  @Post('manual')
  manual(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: ManualTimeTrackDto) {
    return this.service.manual(companyId, actor, dto);
  }



  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO')

  @Post('clock-in-facial')
  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 10, prefix: 'punch-facial' })
  @Roles('ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO')
  async clockInFacial(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: { imageBase64: string, fallback?: boolean } & any) {
    if (!dto.imageBase64 && !dto.fallback) {
      throw new BadRequestException('Imagem facial é obrigatória para o registro.');
    }

    let facialSuccess = false;
    let matchResult = null;

    if (dto.imageBase64) {
      matchResult = await this.facialRecognitionService.recognize(dto.imageBase64);
      if (matchResult && matchResult.subject === actor.sub) {
        // Here we can check liveness if provided
        if (matchResult.liveness !== false) {
          facialSuccess = true;
        }
      }
    }

    // Log attempt
    await this.service.logFacialAttempt({
      companyId,
      employeeId: actor.sub,
      matched: facialSuccess,
      similarity: matchResult ? matchResult.similarity : undefined,
      livenessOk: matchResult ? matchResult.liveness : undefined
    });

    if (!facialSuccess && !dto.fallback) {
      throw new ForbiddenException('Reconhecimento facial falhou. Use o mecanismo de fallback com senha se permitido.');
    }

    // Call register
    // We add clockedInWithoutFacial = !facialSuccess to the DTO handled by the service
    return this.service.register(companyId, actor, { ...dto, clockedInWithoutFacial: !facialSuccess });
  }

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 20, prefix: 'punch' }) // 20 punches per minute per user/IP
  register(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: RegisterTimeDto) {
    return this.service.register(companyId, actor, dto);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR')
  @Get('pending')
  listPending(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser) {
    return this.service.listPending(companyId, actor);
  }

  @Roles('DEV', 'ADMIN', 'RH', 'GESTOR')

  @Patch(':id/overtime-approval')
  approveOvertime(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.service.approveOvertime(companyId, actor, id, body.approved);
  }

  @Patch(':id/approve')
  approve(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() body: { approved: boolean }) {
    return this.service.approveManual(companyId, actor, id, body.approved);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateTimeTrackDto) {
    return this.service.update(companyId, id, dto);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Patch(':id/revoke')
  revoke(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: RevokeTimeTrackDto) {
    return this.service.revokeManual(companyId, actor, id, dto.reason);
  }

  @Roles('DEV', 'ADMIN', 'RH')
  @Delete(':id')
  delete(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.delete(companyId, id);
  }
}
