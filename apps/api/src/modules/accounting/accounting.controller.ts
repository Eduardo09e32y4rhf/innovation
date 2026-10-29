import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AccountingPeriodService } from '../payroll/accounting-period.service';
import { AdjustClosingDto, CalculatePeriodDto, CorrectPayrollDto, MonthQueryDto, RecalculateClosingsDto, SaveRuleDto, SimulateDto, TimeSheetQueryDto, WorkflowDto } from './accounting.dto';
import { AccountingOfficeService } from './accounting-office.service';
import { ChecklistToggleDto, CreateDocRequestDto, CreateTaskDto, GenerateFeesDto, PayFeeDto, SaveClientDto, UpdateDocRequestDto, UpdateTaskDto } from './accounting-office.dto';
import { AccountingHubService } from './accounting-hub.service';
import { AccountingRulesService } from './accounting-rules.service';
import { AccountingTimeSheetService } from './accounting-time-sheet.service';
import { AccountingAccessService } from '../../common/accounting-access';
import { PlatformLedgerService } from './platform-ledger.service';

/** Contabilidade: DEV, CEO e CONTABIL (fonte única das regras de cálculo). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL')
@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly hub: AccountingHubService,
    private readonly rules: AccountingRulesService,
    private readonly office: AccountingOfficeService,
    private readonly ledger: PlatformLedgerService,
    private readonly timeSheets: AccountingTimeSheetService,
    private readonly access: AccountingAccessService,
    private readonly periods: AccountingPeriodService,
  ) {}

  @Get('overview')
  overview(@CurrentUser() actor: JwtUser, @Query() query: MonthQueryDto) {
    return this.hub.overviewFor(actor, query.month, query.companyId);
  }

  /** Razão da receita de assinaturas: recebimentos, devoluções confirmadas, competência e alertas fiscais. */
  @Get('platform-ledger')
  async platformLedger(@CurrentUser() actor: JwtUser, @Query() query: MonthQueryDto) {
    if (query.companyId) await this.access.assertAccountantCanAccess(actor, query.companyId);
    return this.ledger.month(query.month, query.companyId, query.companyId ? null : await this.access.accessibleCompanyIds(actor));
  }

  // ---------- fluxo do mês com o RH da empresa ----------

  @Get('companies/:companyId/periods/:month')
  async getPeriod(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Param('month') month: string) {
    await this.access.assertAccountantCanAccess(actor, companyId);
    return this.periods.viewForAccountant(companyId, month);
  }

  @Post('companies/:companyId/periods/:month/calculate')
  async calculatePeriod(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Param('month') month: string, @Body() dto: CalculatePeriodDto) {
    await this.access.assertAccountantCanAccess(actor, companyId);
    return this.periods.calculate(actor, companyId, month, dto?.discardManual === true);
  }

  @Post('companies/:companyId/periods/:month/publish')
  async publishPeriod(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Param('month') month: string) {
    await this.access.assertAccountantCanAccess(actor, companyId);
    return this.periods.publish(actor, companyId, month);
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

  /** Tabela global (todas as empresas): so DEV escreve; CEO e CONTABIL apenas leem. */
  @Roles('DEV')
  @Post('rules')
  saveRule(@CurrentUser() actor: JwtUser, @Body() dto: SaveRuleDto) {
    return this.rules.saveVersion(actor, dto);
  }

  @Roles('DEV')
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

  @Post('closings/:id/workflow')
  closingWorkflow(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: WorkflowDto) {
    return this.hub.closingWorkflow(actor, id, dto.action, dto.reason);
  }

  @Post('payroll/:id/workflow')
  payrollWorkflow(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: WorkflowDto) {
    if (dto.action === 'REVIEW') dto.action = 'APPROVE';
    return this.hub.payrollWorkflow(actor, id, dto.action as 'APPROVE' | 'RETURN', dto.reason);
  }

  @Post('payroll/:id/recalculate')
  recalculatePayroll(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.hub.recalculatePayroll(actor, id);
  }

  @Put('payroll/:id')
  correctPayroll(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CorrectPayrollDto) {
    return this.hub.correctPayroll(actor, id, dto);
  }

  // ---------- escritório: painel, clientes, checklist, tarefas, documentos e honorários ----------

  @Get('office/dashboard')
  officeDashboard(@CurrentUser() actor: JwtUser, @Query() query: MonthQueryDto) {
    return this.office.dashboard(actor, query.month);
  }

  @Get('office/team')
  officeTeam() {
    return this.office.team();
  }

  @Get('office/clients/:companyId')
  getClient(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.office.getClient(actor, companyId);
  }

  @Put('office/clients/:companyId')
  saveClient(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: SaveClientDto) {
    return this.office.saveClient(actor, companyId, dto);
  }

  @Get('office/clients/:companyId/checklist')
  checklist(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Query() query: MonthQueryDto) {
    return this.office.checklist(actor, companyId, query.month);
  }

  @Put('office/clients/:companyId/checklist')
  toggleChecklist(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: ChecklistToggleDto) {
    return this.office.toggleChecklist(actor, companyId, dto.month, dto.itemKey, dto.done, dto.note);
  }

  @Get('office/tasks')
  listTasks(@CurrentUser() actor: JwtUser, @Query('status') status?: string, @Query('companyId') companyId?: string, @Query('assigneeId') assigneeId?: string) {
    return this.office.listTasks(actor, { status, companyId, assigneeId });
  }

  @Post('office/tasks')
  createTask(@CurrentUser() actor: JwtUser, @Body() dto: CreateTaskDto) {
    return this.office.createTask(actor, dto);
  }

  @Patch('office/tasks/:id')
  updateTask(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.office.updateTask(actor, id, dto);
  }

  @Delete('office/tasks/:id')
  deleteTask(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.office.deleteTask(actor, id);
  }

  @Get('office/docs')
  listDocs(@CurrentUser() actor: JwtUser, @Query('month') month?: string, @Query('companyId') companyId?: string, @Query('status') status?: string) {
    return this.office.listDocs(actor, { month, companyId, status });
  }

  @Post('office/docs')
  createDocs(@CurrentUser() actor: JwtUser, @Body() dto: CreateDocRequestDto) {
    return this.office.createDocs(actor, dto);
  }

  @Patch('office/docs/:id')
  updateDoc(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocRequestDto) {
    return this.office.updateDoc(actor, id, dto);
  }

  @Delete('office/docs/:id')
  deleteDoc(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.office.deleteDoc(actor, id);
  }

  @Get('office/fees')
  listFees(@CurrentUser() actor: JwtUser, @Query() query: MonthQueryDto) {
    return this.office.listFees(actor, query.month);
  }

  @Post('office/fees/generate')
  generateFees(@CurrentUser() actor: JwtUser, @Body() dto: GenerateFeesDto) {
    return this.office.generateFees(actor, dto);
  }

  @Patch('office/fees/:id')
  payFee(@CurrentUser() actor: JwtUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PayFeeDto) {
    return this.office.payFee(actor, id, dto.paid);
  }

  // ---------- folha de ponto (somente leitura) ----------

  /** Resumo do mês de todos os funcionários da empresa (só empresas atendidas pelo contador). */
  @Get('companies/:companyId/time-sheets')
  companyTimeSheets(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Query() query: TimeSheetQueryDto) {
    return this.timeSheets.companySheets(actor, companyId, query.month);
  }

  /** Folha de ponto detalhada de um funcionário: batidas, horas calculadas por dia, ocorrências e ajustes. */
  @Get('companies/:companyId/employees/:employeeId/time-sheet')
  employeeTimeSheet(
    @CurrentUser() actor: JwtUser,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: TimeSheetQueryDto,
  ) {
    return this.timeSheets.employeeSheet(actor, companyId, employeeId, query.month);
  }
}
