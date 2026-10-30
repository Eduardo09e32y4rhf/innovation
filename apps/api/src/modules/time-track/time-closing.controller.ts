import { AdjustClosingDto, GenerateClosingBodyDto, OvertimePolicyDto, ReopenClosingDto } from './dto/closing.dto';
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UseGuards, ParseUUIDPipe, ParseEnumPipe, HttpCode } from '@nestjs/common';
import { $Enums } from '@prisma/client';
type TimeClosingStatus = $Enums.TimeClosingStatus;
const TimeClosingStatus = $Enums.TimeClosingStatus;
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { rolesWith } from '../schedule/access/schedule-access';
import { TimeClosingService } from './time-closing.service';
import { TimeTrackService } from './time-track.service';

@Controller('time-closing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeClosingController {
  constructor(private readonly service: TimeClosingService, private readonly timeTrack: TimeTrackService) {}

  @Post('generate')
  @Roles(...rolesWith('closing.write'))
  generate(@Req() req: any, @Body() body: GenerateClosingBodyDto) { return this.service.generate(req.user.companyId, req.user, body); }

  @Get('conference')
  @Roles(...rolesWith('closing.read'))
  conference(@Req() req: any, @Query('month') month?: string) { return this.service.conference(req.user.companyId, month); }

  // Politica de hora extra da empresa (declarada antes de ':id' para nao ser capturada por ele).
  @Get('overtime-policy')
  @Roles('ADMIN', 'RH', 'DEV', 'CEO', 'CONTABIL')
  getOvertimePolicy(@Req() req: any) { return this.service.getOvertimePolicy(req.user.companyId); }

  @Put('overtime-policy')
  @Roles('ADMIN', 'RH', 'DEV')
  setOvertimePolicy(@Req() req: any, @Body() body: OvertimePolicyDto) { return this.service.setOvertimePolicy(req.user.companyId, req.user, body); }

  @Get()
  @Roles('ADMIN', 'RH', 'CEO', 'CONTABIL')
  list(@Req() req: any, @Query('status', new ParseEnumPipe(TimeClosingStatus, { optional: true })) status?: TimeClosingStatus) { return this.service.list(req.user.companyId, status); }

  // Contracheque do próprio colaborador (declarado antes de ':id').
  @Get('me/payslips')
  @Roles('FUNCIONARIO', 'GESTOR', 'RH', 'ADMIN', 'CEO', 'CONTABIL')
  myPayslips(@Req() req: any) { return this.service.listMyPayslips(req.user.companyId, req.user); }

  @Get('me/payslips/:id/pdf')
  @Roles('FUNCIONARIO', 'GESTOR', 'RH', 'ADMIN', 'CEO', 'CONTABIL')
  myPayslipPdf(@Req() req: any, @Res() res: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.streamMyPayslip(req.user.companyId, req.user, id, res); }

  @Get('collective/pdf')
  @Roles(...rolesWith('closing.read'))
  async collectivePdf(
    @Req() req: any,
    @Res() res: any,
    @Query('month') month: string,
    @Query('employeeIds') employeeIds?: string | string[],
  ) {
    await this.refreshMonth(req.user, month, employeeIds);
    return this.service.streamCollectivePdf(
      req.user.companyId,
      req.user,
      { month, employeeIds },
      res,
    );
  }

  @Get(':id')
  @Roles(...rolesWith('closing.read'))
  getById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.getById(req.user.companyId, id, req.user); }

  @Patch(':id/adjust')
  @Roles(...rolesWith('closing.write'))
  adjust(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: AdjustClosingDto) { return this.service.adjust(req.user.companyId, req.user, id, body); }

  @HttpCode(200)
  @Post(':id/submit-review')
  @Roles(...rolesWith('closing.write'))
  submitReview(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.submitReview(req.user.companyId, id); }

  @HttpCode(200)
  @Post(':id/approve')
  @Roles(...rolesWith('closing.write'))
  approve(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.approve(req.user.companyId, id); }

  @HttpCode(200)
  @Post(':id/close')
  @Roles(...rolesWith('closing.write'))
  close(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.close(req.user.companyId, req.user, id); }

  @HttpCode(200)
  @Post(':id/reopen')
  @Roles(...rolesWith('closing.write'))
  reopen(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Body() body: ReopenClosingDto) { return this.service.reopen(req.user.companyId, req.user, id, body.reason); }

  @Delete(':id')
  @Roles(...rolesWith('closing.write'))
  delete(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.delete(req.user.companyId, id); }

  @Get(':id/pdf')
  @Roles(...rolesWith('closing.read'))
  getPdf(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.getPdf(req.user.companyId, id, req.user); }

  @Get(':id/pdf-stream')
  @Roles(...rolesWith('closing.read'))
  streamPdf(@Req() req: any, @Res() res: any, @Param('id', ParseUUIDPipe) id: string) { return this.service.streamPdf(req.user.companyId, id, res, req.user); }

  /**
   * Antes de emitir a folha coletiva, refaz os totais do ponto e os fechamentos ainda em rascunho,
   * para o PDF sair com o mesmo calculo do espelho. Fechamentos aprovados ou fechados nao sao tocados.
   */
  private async refreshMonth(actor: any, month: string, employeeIds?: string | string[]) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return;
    const [year, monthNumber] = month.split('-').map(Number);
    const ids = (Array.isArray(employeeIds) ? employeeIds : employeeIds ? [employeeIds] : []).flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean);
    const from = new Date(Date.UTC(year, monthNumber - 1, 1));
    const to = new Date(Date.UTC(year, monthNumber, 0));
    try {
      if (ids.length) for (const id of ids) await this.timeTrack.recalculateRange(actor.companyId, from, to, id);
      else await this.timeTrack.recalculateRange(actor.companyId, from, to);
      await this.service.generate(actor.companyId, { ...actor, role: 'ADMIN' }, {
        periodStart: from.toISOString().slice(0, 10),
        periodEnd: to.toISOString().slice(0, 10),
        month: monthNumber,
        year,
        ...(ids.length ? { employeeIds: ids } : {}),
      } as any);
    } catch { /* o PDF sai com os fechamentos que ja existem */ }
  }
}

