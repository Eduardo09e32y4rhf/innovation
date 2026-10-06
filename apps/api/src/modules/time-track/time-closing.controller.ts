import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { $Enums } from '@prisma/client';
type TimeClosingStatus = $Enums.TimeClosingStatus;
const TimeClosingStatus = $Enums.TimeClosingStatus;
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { rolesWith } from '../schedule/access/schedule-access';
import { TimeClosingService } from './time-closing.service';

@Controller('time-closing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeClosingController {
  constructor(private readonly service: TimeClosingService) {}

  @Post('generate')
  @Roles(...rolesWith('closing.write'))
  generate(@Req() req: any, @Body() body: any) { return this.service.generate(req.user.companyId, req.user, body); }

  // Politica de hora extra da empresa (declarada antes de ':id' para nao ser capturada por ele).
  @Get('overtime-policy')
  @Roles('ADMIN', 'RH', 'DEV', 'CEO', 'CONTABIL')
  getOvertimePolicy(@Req() req: any) { return this.service.getOvertimePolicy(req.user.companyId); }

  @Put('overtime-policy')
  @Roles('ADMIN', 'RH', 'DEV')
  setOvertimePolicy(@Req() req: any, @Body() body: { policy?: string; validityMonths?: number }) { return this.service.setOvertimePolicy(req.user.companyId, req.user, body); }

  @Get()
  @Roles('ADMIN', 'RH', 'CEO', 'CONTABIL')
  list(@Req() req: any, @Query('status') status?: TimeClosingStatus) { return this.service.list(req.user.companyId, status); }

  @Get('collective/pdf')
  @Roles(...rolesWith('closing.read'))
  collectivePdf(
    @Req() req: any,
    @Res() res: any,
    @Query('month') month: string,
    @Query('employeeIds') employeeIds?: string | string[],
  ) {
    return this.service.streamCollectivePdf(
      req.user.companyId,
      req.user,
      { month, employeeIds },
      res,
    );
  }

  @Get(':id')
  @Roles(...rolesWith('closing.read'))
  getById(@Req() req: any, @Param('id') id: string) { return this.service.getById(req.user.companyId, id, req.user); }

  @Patch(':id/adjust')
  @Roles(...rolesWith('closing.write'))
  adjust(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.adjust(req.user.companyId, req.user, id, body); }

  @Post(':id/submit-review')
  @Roles(...rolesWith('closing.write'))
  submitReview(@Req() req: any, @Param('id') id: string) { return this.service.submitReview(req.user.companyId, id); }

  @Post(':id/approve')
  @Roles(...rolesWith('closing.write'))
  approve(@Req() req: any, @Param('id') id: string) { return this.service.approve(req.user.companyId, id); }

  @Post(':id/close')
  @Roles(...rolesWith('closing.write'))
  close(@Req() req: any, @Param('id') id: string) { return this.service.close(req.user.companyId, req.user, id); }

  @Post(':id/reopen')
  @Roles(...rolesWith('closing.write'))
  reopen(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.reopen(req.user.companyId, req.user, id, body.reason); }

  @Delete(':id')
  @Roles(...rolesWith('closing.write'))
  delete(@Req() req: any, @Param('id') id: string) { return this.service.delete(req.user.companyId, id); }

  @Get(':id/pdf')
  @Roles(...rolesWith('closing.read'))
  getPdf(@Req() req: any, @Param('id') id: string) { return this.service.getPdf(req.user.companyId, id, req.user); }

  @Get(':id/pdf-stream')
  @Roles(...rolesWith('closing.read'))
  streamPdf(@Req() req: any, @Res() res: any, @Param('id') id: string) { return this.service.streamPdf(req.user.companyId, id, res, req.user); }
}
