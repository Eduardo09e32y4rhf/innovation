import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { TimeClosingStatus } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TimeClosingService } from './time-closing.service';

@Controller('time-closing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeClosingController {
  constructor(private readonly service: TimeClosingService) {}

  @Post('generate')
  @Roles('ADMIN', 'RH')
  generate(@Req() req: any, @Body() body: any) { return this.service.generate(req.user.companyId, req.user, body); }

  @Get()
  @Roles('ADMIN', 'RH')
  list(@Req() req: any, @Query('status') status?: TimeClosingStatus) { return this.service.list(req.user.companyId, status); }

  @Get(':id')
  @Roles('ADMIN', 'RH', 'FUNCIONARIO')
  getById(@Req() req: any, @Param('id') id: string) { return this.service.getById(req.user.companyId, id, req.user); }

  @Patch(':id/adjust')
  @Roles('ADMIN', 'RH')
  adjust(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.adjust(req.user.companyId, req.user, id, body); }

  @Post(':id/submit-review')
  @Roles('ADMIN', 'RH')
  submitReview(@Req() req: any, @Param('id') id: string) { return this.service.submitReview(req.user.companyId, id); }

  @Post(':id/approve')
  @Roles('ADMIN', 'RH')
  approve(@Req() req: any, @Param('id') id: string) { return this.service.approve(req.user.companyId, id); }

  @Post(':id/close')
  @Roles('ADMIN', 'RH')
  close(@Req() req: any, @Param('id') id: string) { return this.service.close(req.user.companyId, req.user, id); }

  @Post(':id/reopen')
  @Roles('ADMIN', 'RH')
  reopen(@Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.reopen(req.user.companyId, req.user, id, body.reason); }

  @Delete(':id')
  @Roles('ADMIN', 'RH')
  delete(@Req() req: any, @Param('id') id: string) { return this.service.delete(req.user.companyId, id); }

  @Get(':id/pdf')
  @Roles('ADMIN', 'RH', 'FUNCIONARIO')
  getPdf(@Req() req: any, @Param('id') id: string) { return this.service.getPdf(req.user.companyId, id, req.user); }

  @Get(':id/pdf-stream')
  @Roles('ADMIN', 'RH', 'FUNCIONARIO')
  streamPdf(@Req() req: any, @Res() res: any, @Param('id') id: string) { return this.service.streamPdf(req.user.companyId, id, res, req.user); }
}