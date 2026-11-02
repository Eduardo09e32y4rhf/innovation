import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards, HttpCode } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { contentDisposition } from '../../common/pdf/pdf-response';
import type { JwtUser } from '../../common/types/auth.types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FinalizeTerminationDto, SimulateTerminationDto } from './dto/termination.dto';
import { TerminationService } from './termination.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'ADMIN', 'RH')
@Controller('payroll')
export class TerminationController {
  constructor(private readonly service: TerminationService) {}

  @HttpCode(200)
  @Post('termination/simulate')
  simulate(@CurrentCompany() companyId: string, @Body() dto: SimulateTerminationDto) {
    return this.service.simulate(companyId, dto);
  }

  @Post('termination/:employeeId/finalize')
  finalize(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: FinalizeTerminationDto,
  ) {
    return this.service.finalize(companyId, actor, employeeId, dto);
  }

  @Get('termination/:employeeId')
  record(@CurrentCompany() companyId: string, @Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.getRecord(companyId, employeeId);
  }

  @Get('termination/:employeeId/trct.pdf')
  async trct(
    @CurrentCompany() companyId: string,
    @CurrentUser() actor: JwtUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Res() response: any,
  ) {
    const pdf = await this.service.trctPdf(companyId, actor, employeeId);
    response.header('Content-Type', 'application/pdf');
    response.header('Content-Disposition', contentDisposition(pdf.filename));
    response.header('Content-Length', String(pdf.buffer.length));
    if (pdf.documentId) response.header('X-Document-Id', pdf.documentId);
    response.header('X-Document-Sha256', pdf.sha256);
    return response.send(pdf.buffer);
  }

  @Get('thirteenth/:employeeId')
  thirteenth(
    @CurrentCompany() companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('year') year?: string,
  ) {
    const y = year ? Number(year) : new Date().getUTCFullYear();
    if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new BadRequestException('Ano inválido.');
    return this.service.thirteenth(companyId, employeeId, y);
  }
}
