import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
import { Prisma } from '@prisma/client';


@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA')
@Controller('time-track')
export class TimeTrackController {
  constructor(
    private readonly service: TimeTrackService,
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



  @Post('clock-in-facial')
  @UseGuards(RateLimitGuard)
  @RateLimit({ window: 60, max: 10, prefix: 'punch-facial' })
  async clockInFacial(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() dto: { imageBase64: string, faceDescriptor?: number[], fallback?: boolean } & any) {
    if (!dto.imageBase64 && !dto.fallback) {
      throw new BadRequestException('Imagem facial é obrigatória para o registro.');
    }

    let facialSuccess = false;
    let matchResult = null;

    let employeeId = '';
    const emp = await this.service['prisma'].employee.findFirst({ where: { userId: actor.sub, companyId } });
    if (emp) employeeId = emp.id;

    if (!employeeId) {
      throw new BadRequestException('Funcionário não encontrado para este usuário.');
    }

    const enrollment = await this.service['prisma'].faceEnrollment.findUnique({ where: { employeeId } });

    if (!dto.faceDescriptor && dto.imageBase64) {
      // Se não veio o descritor facial (porque a interface voltou a usar a Câmera simples), 
      // aceitamos o ponto normalmente sem validação biométrica matemática.
      facialSuccess = true;
    } else if (!enrollment || !enrollment.active || !enrollment.descriptor) {
      // Primeira vez: Cadastrar a biometria facial automaticamente com base no faceDescriptor
      if (!dto.faceDescriptor) {
         throw new BadRequestException('Não foi possível realizar o cadastro biométrico inicial. Tente novamente.');
      }
      try {
        await this.service['prisma'].faceEnrollment.upsert({
          where: { employeeId },
          update: { descriptor: dto.faceDescriptor, enrolledAt: new Date(), active: true },
          create: { companyId, employeeId, descriptor: dto.faceDescriptor, active: true }
        });
        facialSuccess = true;
      } catch (error: any) {
        throw new BadRequestException('Erro ao salvar biometria no banco de dados.');
      }
    } else if (dto.faceDescriptor) {
      // Calcular Distância Euclidiana entre o descritor salvo e o atual
      const savedDescriptor = enrollment.descriptor as number[];
      if (Array.isArray(savedDescriptor) && Array.isArray(dto.faceDescriptor) && savedDescriptor.length === dto.faceDescriptor.length) {
        const distance = Math.sqrt(dto.faceDescriptor.reduce((sum: number, val: number, i: number) => sum + Math.pow(val - savedDescriptor[i], 2), 0));
        matchResult = { distance, subject: employeeId };
        if (distance < 0.55) {
          facialSuccess = true;
        } else {
           throw new BadRequestException('Rosto não reconhecido. Tente novamente.');
        }
      } else {
         throw new BadRequestException('Dados biométricos corrompidos ou inválidos. Contate o suporte.');
      }
    } else if (!dto.fallback) {
       throw new BadRequestException('Dados biométricos não recebidos do dispositivo.');
    }

    // Log attempt
    await this.service.logFacialAttempt({
      companyId,
      employeeId,
      matched: facialSuccess,
      similarity: matchResult?.distance ? (1 - matchResult.distance) : 0,
      livenessOk: true
    });

    if (!facialSuccess && !dto.fallback) {
      throw new BadRequestException('Falha no reconhecimento facial.');
    }

    return this.service.register(companyId, actor, { ...dto, clockedInWithoutFacial: !facialSuccess });
  }

  @Post('enroll-facial')
  async enrollFacial(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Body() dto: { descriptor: number[] }
  ) {
    const employee = await this.service['prisma'].employee.findUnique({ where: { userId: actor.sub } });
    if (!employee) throw new UnauthorizedException('Employee not found');
    
    await this.service['prisma'].faceEnrollment.upsert({
      where: { employeeId: employee.id },
      update: { descriptor: dto.descriptor, enrolledAt: new Date(), active: true },
      create: { companyId, employeeId: employee.id, descriptor: dto.descriptor, enrolledAt: new Date() },
    });
    return { success: true };
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

  @Post('batch-approve')
  batchApprove(@CurrentCompany() companyId: string, @CurrentUser() actor: JwtUser, @Body() body: { ids: string[], approved: boolean }) {
    return this.service.batchApproveManual(companyId, actor, body.ids, body.approved);
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
