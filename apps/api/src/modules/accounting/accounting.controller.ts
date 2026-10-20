import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { AdjustClosingDto, CorrectPayrollDto, MonthQueryDto, RecalculateClosingsDto, SaveRuleDto, SimulateDto, WorkflowDto } from './accounting.dto';
import { AccountingOfficeService } from './accounting-office.service';
import { ChecklistToggleDto, CreateDocRequestDto, CreateTaskDto, GenerateFeesDto, PayFeeDto, SaveClientDto, UpdateDocRequestDto, UpdateTaskDto } from './accounting-office.dto';
import { AccountingHubService } from './accounting-hub.service';
import { AccountingRulesService } from './accounting-rules.service';
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
  ) {}

  @Get('overview')
  overview(@Query() query: MonthQueryDto) {
    return this.hub.overview(query.month, query.companyId);
  }

  /** Razão da receita de assinaturas: recebimentos, devoluções confirmadas, competência e alertas fiscais. */
  @Get('platform-ledger')
  platformLedger(@Query() query: MonthQueryDto) {
    return this.ledger.month(query.month, query.companyId);
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
  officeDashboard(@Query() query: MonthQueryDto) {
    return this.office.dashboard(query.month);
  }

  @Get('office/team')
  officeTeam() {
    return this.office.team();
  }

  @Get('office/clients/:companyId')
  getClient(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.office.getClient(companyId);
  }

  @Put('office/clients/:companyId')
  saveClient(@Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: SaveClientDto) {
    return this.office.saveClient(companyId, dto);
  }

  @Get('office/clients/:companyId/checklist')
  checklist(@Param('companyId', ParseUUIDPipe) companyId: string, @Query() query: MonthQueryDto) {
    return this.office.checklist(companyId, query.month);
  }

  @Put('office/clients/:companyId/checklist')
  toggleChecklist(@CurrentUser() actor: JwtUser, @Param('companyId', ParseUUIDPipe) companyId: string, @Body() dto: ChecklistToggleDto) {
    return this.office.toggleChecklist(actor, companyId, dto.month, dto.itemKey, dto.done, dto.note);
  }

  @Get('office/tasks')
  listTasks(@Query('status') status?: string, @Query('companyId') companyId?: string, @Query('assigneeId') assigneeId?: string) {
    return this.office.listTasks({ status, companyId, assigneeId });
  }

  @Post('office/tasks')
  createTask(@CurrentUser() actor: JwtUser, @Body() dto: CreateTaskDto) {
    return this.office.createTask(actor, dto);
  }

  @Patch('office/tasks/:id')
  updateTask(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.office.updateTask(id, dto);
  }

  @Delete('office/tasks/:id')
  deleteTask(@Param('id', ParseUUIDPipe) id: string) {
    return this.office.deleteTask(id);
  }

  @Get('office/docs')
  listDocs(@Query('month') month?: string, @Query('companyId') companyId?: string, @Query('status') status?: string) {
    return this.office.listDocs({ month, companyId, status });
  }

  @Post('office/docs')
  createDocs(@CurrentUser() actor: JwtUser, @Body() dto: CreateDocRequestDto) {
    return this.office.createDocs(actor, dto);
  }

  @Patch('office/docs/:id')
  updateDoc(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocRequestDto) {
    return this.office.updateDoc(id, dto);
  }

  @Delete('office/docs/:id')
  deleteDoc(@Param('id', ParseUUIDPipe) id: string) {
    return this.office.deleteDoc(id);
  }

  @Get('office/fees')
  listFees(@Query() query: MonthQueryDto) {
    return this.office.listFees(query.month);
  }

  @Post('office/fees/generate')
  generateFees(@Body() dto: GenerateFeesDto) {
    return this.office.generateFees(dto);
  }

  @Patch('office/fees/:id')
  payFee(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PayFeeDto) {
    return this.office.payFee(id, dto.paid);
  }
}
