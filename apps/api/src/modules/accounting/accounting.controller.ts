import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AdjustClosingDto, CorrectPayrollDto, MonthQueryDto, RecalculateClosingsDto, SaveRuleDto, SimulateDto } from './accounting.dto';
import { AccountingHubService } from './accounting-hub.service';
import { AccountingRulesService } from './accounting-rules.service';

/** Contabilidade: DEV, CEO e CONTABIL (fonte única das regras de cálculo). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL')
@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly hub: AccountingHubService,
    private readonly rules: AccountingRulesService,
  ) {}

  @Get('overview')
  overview(@Query() query: MonthQueryDto) {
    return this.hub.overview(query.month, query.companyId);
  }

  @Get('report/pdf')
  report(@CurrentUser() actor: JwtUser, @Query() query: MonthQueryDto, @Res() res: any) {
    return this.hub.reportPdf(actor, query.month, query.companyId, res);
  }

  @Get('rules')
  listRules(@Query('date') date?: string) {
    const parsed = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : undefined;
    return this.rules.list(parsed);
  }

  @Post('rules')
  saveRule(@CurrentUser() actor: JwtUser, @Body() dto: SaveRuleDto) {
    return this.rules.saveVersion(actor, dto);
  }

  @Delete('rules/:id')
  deactivateRule(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rules.deactivate(actor, id);
  }

  @Post('rules/simulate')
  simulate(@Body() dto: SimulateDto) {
    return this.rules.simulate(dto);
  }

  @Post('closings/recalculate')
  recalculateClosings(@CurrentUser() actor: JwtUser, @Body() dto: RecalculateClosingsDto) {
    return this.hub.recalculateClosings(actor, dto.companyId, dto.month);
  }

  @Patch('closings/:id/adjust')
  adjustClosing(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AdjustClosingDto) {
    return this.hub.adjustClosing(actor, id, dto);
  }

  @Post('payroll/:id/recalculate')
  recalculatePayroll(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.hub.recalculatePayroll(actor, id);
  }

  @Put('payroll/:id')
  correctPayroll(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CorrectPayrollDto) {
    return this.hub.correctPayroll(actor, id, dto);
  }
}
